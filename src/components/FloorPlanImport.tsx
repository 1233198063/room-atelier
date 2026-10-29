import { FileImage, Ruler, ScanSearch, Sparkles, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useLength, useT } from "../i18n";
import { ROOM_LIMITS } from "../lib/catalog";
import { detectRooms, planToProject, repeats, roomAt, roomFit, scaleProblem, SMALL_ROOM_AREA, wallMap, type PixelRect, type PlanOpening, type WallMap } from "../lib/floorPlan";
import { planScale, readingOpenings, readingToRooms, type FloorPlanReading, type PlanScale, type ReadRoom } from "../lib/floorPlanAi";
import { fromCm } from "../lib/geometry";
import { formatLength } from "../lib/units";
import { FeetInchesField } from "./ui/FeetInchesField";
import { useEditor } from "../store/editorStore";
import type { Wall } from "../types";
import { NumberField } from "./ui/NumberField";
import { Segmented } from "./ui/Segmented";

/** Plans are read at most this many pixels on a side: plenty for walls, quick to scan. */
const MAX_SIDE = 1400;

interface Plan {
  url: string;
  width: number;
  height: number;
  map: WallMap;
  /** The plan as read here, for the AI: the same pixels the wall map measures. */
  dataUrl: string;
}

/** What the AI made of the plan, ready to apply. */
interface AiResult {
  rooms: ReadRoom[];
  scale: PlanScale | null;
  openings: PlanOpening[];
}

type AiStatus =
  | { state: "reading" }
  | { state: "done"; count: number }
  | { state: "off" } // the server has no API key
  | { state: "down" } // no server
  | { state: "failed"; why: string };

interface TracedRoom {
  id: number;
  name: string;
  rect: PixelRect;
  /** Open-plan sides found by the AI reading: built without walls. */
  openWalls?: Wall[];
}

type Pt = [number, number];
type Side = "x0" | "x1" | "y0" | "y1";
type Drag =
  | { kind: "line"; start: Pt }
  | { kind: "edge"; id: number; side: Side }
  | { kind: "press"; start: Pt; moved: boolean };

async function loadPlan(file: Blob): Promise<Plan> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale)), height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#fff"; // transparent PNGs read as white paper
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return { url, width, height, map: wallMap(ctx.getImageData(0, 0, width, height).data, width, height),
      dataUrl: canvas.toDataURL("image/jpeg", 0.92) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const distance = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const inside = (r: PixelRect, [x, y]: Pt) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
const rectFrom = (a: Pt, b: Pt): PixelRect => ({
  x0: Math.round(Math.min(a[0], b[0])), y0: Math.round(Math.min(a[1], b[1])),
  x1: Math.round(Math.max(a[0], b[0])), y1: Math.round(Math.max(a[1], b[1])),
});

/** Lines within a few degrees of level or plumb snap to it; Shift always locks to the nearer axis. */
function steady(a: Pt, b: Pt, lock: boolean): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI) % 180;
  const nearLevel = Math.min(angle, 180 - angle) < 4, nearPlumb = Math.abs(angle - 90) < 4;
  if (lock ? Math.abs(dx) >= Math.abs(dy) : nearLevel) return [b[0], a[1]];
  if (lock || nearPlumb) return [a[0], b[1]];
  return b;
}

/** Which edge of `r` is within `tol` of `p`, if any. */
function edgeAt(r: PixelRect, [x, y]: Pt, tol: number): Side | null {
  const withinY = y > r.y0 - tol && y < r.y1 + tol, withinX = x > r.x0 - tol && x < r.x1 + tol;
  if (withinY && Math.abs(x - r.x0) < tol) return "x0";
  if (withinY && Math.abs(x - r.x1) < tol) return "x1";
  if (withinX && Math.abs(y - r.y0) < tol) return "y0";
  if (withinX && Math.abs(y - r.y1) < tol) return "y1";
  return null;
}

function moveEdge(r: PixelRect, side: Side, [x, y]: Pt): PixelRect {
  const v = Math.round(side === "x0" || side === "x1" ? x : y);
  const gap = 4;
  if (side === "x0") return { ...r, x0: Math.min(v, r.x1 - gap) };
  if (side === "x1") return { ...r, x1: Math.max(v, r.x0 + gap) };
  if (side === "y0") return { ...r, y0: Math.min(v, r.y1 - gap) };
  return { ...r, y1: Math.max(v, r.y0 + gap) };
}

/**
 * Import a floor plan: load the image, check the rooms found on it, confirm
 * or set its scale, and create them as rooms at their places.
 *
 * Rooms come first from the local wall detector, then — when the server is
 * set up — from Claude, which also reads room names, printed sizes (which set
 * the scale) and doors and windows. Everything is a draft until "Create".
 */
export function FloorPlanDialog({ onClose }: { onClose: () => void }) {
  const text = useT();
  const t = text.floorPlan;
  const len = useLength();
  const currentRooms = useEditor((s) => s.rooms.length);
  const addProject = useEditor((s) => s.addProject);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<"scale" | "rooms">("scale");
  const [line, setLine] = useState<{ a: Pt; b: Pt } | null>(null);
  const [lengthCm, setLengthCm] = useState(0);
  const [rooms, setRooms] = useState<TracedRoom[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<PixelRect | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState(280);
  // The sample room alone is nothing to keep; a real project is.
  const [replace, setReplace] = useState(currentRooms <= 1);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [autoScale, setAutoScale] = useState<PlanScale | null>(null);
  const [openings, setOpenings] = useState<PlanOpening[]>([]);
  const [pendingAi, setPendingAi] = useState<AiResult | null>(null);
  const aiRequest = useRef<AbortController | null>(null);
  // Once the rooms have been edited by hand, an AI result arriving later waits to be asked for.
  const touched = useRef(false);
  const nextId = useRef(1);
  const drag = useRef<Drag | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (plan) URL.revokeObjectURL(plan.url); }, [plan]);
  useEffect(() => dialog.current?.focus(), []);
  useEffect(() => () => aiRequest.current?.abort(), []);

  const named = (rect: PixelRect, name?: string, openWalls?: Wall[]): TracedRoom => {
    const id = nextId.current++;
    return { id, name: name ?? `${text.defaults.room} ${id}`, rect, ...(openWalls?.length ? { openWalls } : {}) };
  };
  /** Room edits made by hand. */
  const editRooms = (change: (rooms: TracedRoom[]) => TracedRoom[]) => {
    touched.current = true;
    setRooms(change);
  };

  const detect = (p: Plan) => {
    nextId.current = 1;
    touched.current = false;
    const found = detectRooms(p.map).map((rect) => named(rect));
    setRooms(found);
    setSelected(null);
    setMessage(t.detected(found.length));
  };

  const applyAi = (result: AiResult) => {
    nextId.current = 1;
    touched.current = false;
    setRooms(result.rooms.map((r) => named(r.rect, r.name ?? t.kinds[r.kind], r.openWalls)));
    setAutoScale(result.scale);
    setOpenings(result.openings);
    setPendingAi(null);
    setSelected(null);
    setMessage(null);
  };

  const readWithAi = async (p: Plan) => {
    aiRequest.current?.abort();
    const request = new AbortController();
    aiRequest.current = request;
    setAi({ state: "reading" });
    setPendingAi(null);
    try {
      const res = await fetch("/api/floor-plan", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: p.dataUrl }), signal: request.signal,
      });
      const body = await res.json().catch(() => null) as (FloorPlanReading & { error?: string }) | null;
      if (request.signal.aborted) return;
      if (!res.ok || !body || body.error) {
        // Vite's proxy answers without our JSON when the server isn't running.
        if (res.status === 503) setAi({ state: "off" });
        else if (!body?.error) setAi({ state: "down" });
        else setAi({ state: "failed", why: body.error });
        return;
      }
      const found = readingToRooms(body, p.map);
      if (!found.length) { setAi({ state: "done", count: 0 }); return; }
      const result = { rooms: found, scale: planScale(found, body, p.map), openings: readingOpenings(body, p.map) };
      if (touched.current) setPendingAi(result);
      else applyAi(result);
      setAi({ state: "done", count: found.length });
    } catch {
      if (!request.signal.aborted) setAi({ state: "down" });
    }
  };

  const open = async (file: Blob | null | undefined) => {
    if (!file) return;
    try {
      const p = await loadPlan(file);
      setPlan(p);
      setError(false);
      setLine(null);
      setLengthCm(0);
      setAutoScale(null);
      setOpenings([]);
      setMode("scale");
      detect(p);
      void readWithAi(p);
    } catch {
      setError(true);
    }
  };

  // Paste a screenshot straight in.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) { e.preventDefault(); void open(file); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const linePx = line ? distance(line.a, line.b) : 0;
  // A reference line drawn here overrides the scale read from the plan's printed sizes.
  const manualScale = linePx >= 5 && lengthCm > 0 ? fromCm(lengthCm) / linePx : null;
  const metersPerPixel = manualScale ?? autoScale?.metersPerPixel ?? null;
  const sizeOf = (r: PixelRect) => metersPerPixel ? len.size((r.x1 - r.x0) * metersPerPixel, (r.y1 - r.y0) * metersPerPixel) : t.noScale;

  const toPlan = (e: PointerEvent): Pt | null => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return [p.x, p.y];
  };
  /** Plan pixels per screen pixel, for hit tolerances that feel the same at any zoom. */
  const perScreenPx = () => 1 / (svg.current?.getScreenCTM()?.a || 1);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!plan || e.button !== 0) return;
    const p = toPlan(e);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (mode === "scale") {
      drag.current = { kind: "line", start: p };
      setLine({ a: p, b: p });
      return;
    }
    const current = rooms.find((r) => r.id === selected);
    const side = current && edgeAt(current.rect, p, 8 * perScreenPx());
    drag.current = current && side ? { kind: "edge", id: current.id, side } : { kind: "press", start: p, moved: false };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current, p = toPlan(e);
    if (!d || !p) return;
    if (d.kind === "line") setLine({ a: d.start, b: steady(d.start, p, e.shiftKey) });
    else if (d.kind === "edge") editRooms((rs) => rs.map((r) => (r.id === d.id ? { ...r, rect: moveEdge(r.rect, d.side, p) } : r)));
    else if (d.moved || distance(d.start, p) > 4 * perScreenPx()) {
      d.moved = true;
      setDraft(rectFrom(d.start, p));
    }
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current, p = toPlan(e);
    drag.current = null;
    if (!d || !plan) return;
    if (d.kind === "line") {
      if (linePx < 5) setLine(null);
      return;
    }
    if (d.kind !== "press") return;
    if (d.moved) {
      if (draft && draft.x1 - draft.x0 >= 6 && draft.y1 - draft.y0 >= 6) {
        const room = named(draft);
        editRooms((rs) => [...rs, room]);
        setSelected(room.id);
        setMessage(null);
      }
      setDraft(null);
      return;
    }
    if (!p) return;
    // A click on a room selects it (the smallest, where rooms overlap); elsewhere it looks for one.
    const hit = rooms.filter((r) => inside(r.rect, p)).sort((a, b) =>
      (a.rect.x1 - a.rect.x0) * (a.rect.y1 - a.rect.y0) - (b.rect.x1 - b.rect.x0) * (b.rect.y1 - b.rect.y0))[0];
    if (hit) { setSelected(hit.id); return; }
    const rect = roomAt(plan.map, p[0], p[1]);
    if (!rect) { setMessage(t.missed); return; }
    const existing = rooms.find((r) => repeats(rect, [r.rect]));
    if (existing) { setSelected(existing.id); return; }
    const room = named(rect);
    editRooms((rs) => [...rs, room]);
    setSelected(room.id);
    setMessage(null);
  };

  const remove = (id: number) => {
    editRooms((rs) => rs.filter((r) => r.id !== id));
    if (selected === id) setSelected(null);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const typing = (e.target as HTMLElement).closest("input, textarea, select");
    if (e.key === "Escape") {
      if (drag.current || draft) { drag.current = null; setDraft(null); }
      else onClose();
    } else if ((e.key === "Delete" || e.key === "Backspace") && !typing && selected !== null) {
      e.preventDefault();
      remove(selected);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void open([...e.dataTransfer.files].find((f) => f.type.startsWith("image/")));
  };

  // Once the scale is known: areas too small to build are skipped rather than stretched, small ones are flagged.
  const fitOf = (r: TracedRoom) => (metersPerPixel ? roomFit(r.rect, metersPerPixel) : "ok");
  const buildable = rooms.filter((r) => fitOf(r) !== "tooSmall");
  const flagged = rooms.filter((r) => fitOf(r) !== "ok");
  const problem = metersPerPixel ? scaleProblem(rooms.map((r) => r.rect), metersPerPixel) : null;
  const fitNote = (r: TracedRoom) => {
    const fit = fitOf(r);
    return fit === "tooSmall" ? t.tooSmall(len.format(ROOM_LIMITS.min.width)) : fit === "small" ? t.small(len.area(SMALL_ROOM_AREA)) : null;
  };

  const create = () => {
    if (!metersPerPixel || !buildable.length) return;
    const project = planToProject(buildable.map(({ name, rect, openWalls }) => ({ name: name.trim() || text.defaults.room, rect, openWalls })),
      metersPerPixel, fromCm(heightCm), t.title, openings);
    addProject(project, { replace });
    onClose();
  };

  const font = plan ? Math.max(11, Math.min(plan.width, plan.height) / 42) : 12;
  const blocked = !metersPerPixel ? t.needScale : !rooms.length ? t.needRooms : !buildable.length ? t.skipped(rooms.length) : null;

  return createPortal(
    <div className="fp-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialog} className="fp-dialog" role="dialog" aria-modal="true" aria-label={t.title} tabIndex={-1} onKeyDown={onKeyDown}>
        <header className="fp-header">
          <h2>{t.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} title={t.close} aria-label={t.close}><X size={18} /></button>
        </header>
        <div className="fp-body">
          <div className={`fp-stage${plan ? ` fp-stage--${mode}` : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
            {plan ? (
              <svg ref={svg} viewBox={`0 0 ${plan.width} ${plan.height}`} className="fp-plan"
                onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
                onPointerCancel={() => { drag.current = null; setDraft(null); }}>
                <image href={plan.url} width={plan.width} height={plan.height} />
                {rooms.map((r, i) => {
                  const active = r.id === selected;
                  return <g key={r.id} className={`fp-room fp-room--${fitOf(r)}${active ? " is-selected" : ""}`}>
                    <rect x={r.rect.x0} y={r.rect.y0} width={r.rect.x1 - r.rect.x0} height={r.rect.y1 - r.rect.y0} vectorEffect="non-scaling-stroke" />
                    <text x={(r.rect.x0 + r.rect.x1) / 2} y={(r.rect.y0 + r.rect.y1) / 2} fontSize={font} textAnchor="middle">
                      <tspan x={(r.rect.x0 + r.rect.x1) / 2} dy={-font * 0.2}>{i + 1} · {r.name}</tspan>
                      {metersPerPixel && <tspan x={(r.rect.x0 + r.rect.x1) / 2} dy={font * 1.2} className="fp-room__size">{sizeOf(r.rect)}</tspan>}
                    </text>
                  </g>;
                })}
                {draft && <rect className="fp-draft" x={draft.x0} y={draft.y0} width={draft.x1 - draft.x0} height={draft.y1 - draft.y0}
                  vectorEffect="non-scaling-stroke" />}
                {line && linePx >= 1 && <g className="fp-line">
                  <line x1={line.a[0]} y1={line.a[1]} x2={line.b[0]} y2={line.b[1]} vectorEffect="non-scaling-stroke" />
                  {[line.a, line.b].map((pt, i) => <circle key={i} cx={pt[0]} cy={pt[1]} r={font * 0.3} />)}
                  <text x={(line.a[0] + line.b[0]) / 2} y={(line.a[1] + line.b[1]) / 2 - font * 0.6} fontSize={font} textAnchor="middle">
                    {lengthCm > 0 ? len.format(fromCm(lengthCm)) : `${Math.round(linePx)} px`}
                  </text>
                </g>}
              </svg>
            ) : (
              <div className="fp-drop">
                <FileImage size={40} strokeWidth={1.4} />
                <p>{t.dropHint}</p>
                <p className="library-hint">{t.aiPrivacy}</p>
                <button type="button" className="btn btn--primary" onClick={() => fileInput.current?.click()}>{t.choose}</button>
              </div>
            )}
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { void open(e.target.files?.[0]); e.target.value = ""; }} />
          </div>

          <aside className="fp-side">
            {error && <p className="importer__note importer__note--warn" role="alert">{t.readError}</p>}
            {plan && <>
              <div className="fp-side__row">
                <Segmented label={t.title} value={mode} onChange={setMode} options={[
                  { value: "scale", label: t.modes.scale, icon: Ruler },
                  { value: "rooms", label: t.modes.rooms, icon: Square },
                ]} />
                <button type="button" className="btn btn--ghost fp-change" onClick={() => fileInput.current?.click()}>{t.changeImage}</button>
              </div>

              <section className="fp-step">
                <h3>{t.scaleTitle}</h3>
                <p className="library-hint">{t.scaleHint}</p>
                {len.unit === "ft" ? (
                  <FeetInchesField label={t.scaleLength} value={lengthCm} onChange={setLengthCm}
                    feet={t.feet} inches={t.inches} feetHint={t.feetHint} inchesHint={t.inchesHint} />
                ) : (
                  <div className="fields fields--2">
                    <NumberField label={t.scaleLength} title={t.scaleLength} unit="length" min={1} value={lengthCm}
                      onChange={(v) => setLengthCm(v)} />
                  </div>
                )}
                {lengthCm > 0 && len.unit === "ft" && <p className="importer__note">{t.lengthCheck(formatLength(fromCm(lengthCm), "m"))}</p>}
                {!manualScale && autoScale && <p className="importer__note fp-auto">
                  <Sparkles size={12} /> {(autoScale.source === "labels" ? t.autoScale : t.autoScaleLines)(autoScale.used.join(text.listSeparator))}
                </p>}
                <p className="importer__note">{line && linePx >= 5 ? t.linePx(Math.round(linePx)) : t.noLine}</p>
                {problem && <p className="importer__note importer__note--warn" role="alert">
                  {problem.kind === "tiny" ? t.scaleTiny(len.format(problem.largest)) : t.scaleHuge(len.format(problem.across))}
                </p>}
              </section>

              <section className="fp-step">
                <h3>{t.roomsTitle}
                  <button type="button" className="link-btn" onClick={() => detect(plan)}><ScanSearch size={13} /> {t.detect}</button>
                  {ai && ai.state !== "reading" && <button type="button" className="link-btn fp-ai-retry" onClick={() => void readWithAi(plan)}>
                    <Sparkles size={13} /> {t.aiRetry}</button>}
                </h3>
                <p className="library-hint">{t.roomsHint}</p>
                {ai && <div className={`fp-ai fp-ai--${ai.state}`} role="status">
                  <Sparkles size={13} />
                  <span>{ai.state === "reading" ? t.aiReading : ai.state === "done" ? t.aiDone(ai.count)
                    : ai.state === "off" ? t.aiOff : ai.state === "down" ? t.aiDown : t.aiFailed(ai.why)}</span>
                </div>}
                {pendingAi && <button type="button" className="btn fp-ai-apply" onClick={() => applyAi(pendingAi)}>
                  <Sparkles size={13} /> {t.aiApply(pendingAi.rooms.length)}
                </button>}
                {message && <p className="importer__note">{message}</p>}
                <ol className="fp-rooms">
                  {rooms.map((r, i) => <li key={r.id} className={`fp-rooms__item--${fitOf(r)}${r.id === selected ? " is-selected" : ""}`}
                    onPointerDown={() => setSelected(r.id)}>
                    <span className="fp-rooms__n">{i + 1}</span>
                    <input value={r.name} aria-label={t.roomName}
                      onChange={(e) => editRooms((rs) => rs.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))} />
                    <small>{sizeOf(r.rect)}</small>
                    <button type="button" className="icon-btn" onClick={() => remove(r.id)} title={t.remove} aria-label={t.remove}><X size={13} /></button>
                    {fitNote(r) && <em className="fp-rooms__note">{fitNote(r)}</em>}
                  </li>)}
                </ol>
                {flagged.length > 0 && <button type="button" className="link-btn fp-remove-small"
                  onClick={() => { editRooms((rs) => rs.filter((r) => fitOf(r) === "ok")); setSelected(null); }}>
                  <X size={12} /> {t.removeSmall}
                </button>}
              </section>

              <section className="fp-step">
                <h3>{t.createTitle}</h3>
                <div className="fields fields--2">
                  <NumberField label={text.inspector.h} title={t.height} unit="length" min={200} max={1200} value={heightCm}
                    onChange={(v) => setHeightCm(v)} />
                </div>
                <label className="fp-check">
                  <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> {t.replace}
                </label>
                <p className="library-hint">{t.note}</p>
                {blocked && <p className="importer__note importer__note--warn">{blocked}</p>}
                {!blocked && buildable.length < rooms.length && <p className="importer__note importer__note--warn">{t.skipped(rooms.length - buildable.length)}</p>}
                <button type="button" className="btn btn--primary fp-create" disabled={!!blocked} onClick={create}>
                  {t.create(buildable.length)}
                </button>
              </section>
            </>}
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The card in the room list that opens the dialog. */
export function FloorPlanButton() {
  const t = useT().floorPlan;
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="room-template room-template--action" onClick={() => setOpen(true)} title={t.openHint}>
      <span className="room-template__icon"><FileImage size={22} strokeWidth={1.6} /></span>
      <span><strong>{t.title}</strong><small>{t.openHint}</small></span>
    </button>
    {open && <FloorPlanDialog onClose={() => setOpen(false)} />}
  </>;
}
