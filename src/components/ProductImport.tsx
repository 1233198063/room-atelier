import { ImagePlus, PackagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLength, useT } from "../i18n";
import { CATALOG, LIBRARY } from "../lib/catalog";
import { fromCm, toCm } from "../lib/geometry";
import { colorsForModel, productColors } from "../lib/imageColors";
import { UNIT_LABELS } from "../lib/units";
import { outOfRange, parseProduct, productSize } from "../lib/productImport";
import { useEditor } from "../store/editorStore";
import type { Dimensions, FurnitureType } from "../types";
import { NumberField } from "./ui/NumberField";

/** Every model, in library order. */
const MODEL_TYPES = [...new Set(LIBRARY.flatMap((c) => c.presets.map((p) => p.type)))];

/** Read a photo small: the main colors don't need more than ~100 px. */
async function readPhoto(url: string): Promise<string[]> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, 100 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return productColors(ctx.getImageData(0, 0, w, h).data, w, h);
}

/**
 * "Add from a product": paste a shop listing's title and size, optionally add
 * its photo, check what was read, and add it. Edits here are a draft; nothing
 * enters the document (or undo history) until "Add to room".
 */
export function ProductImport() {
  const t = useT();
  const len = useLength();
  const m = t.importer;
  const addFurniture = useEditor((s) => s.addFurniture);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ url: string; colors: string[] } | null>(null);
  const [photoError, setPhotoError] = useState(false);
  // Choices made after reading the text; typing new text starts over.
  const [picked, setPicked] = useState<{ type?: FurnitureType; size?: Dimensions; name?: string }>({});
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const parsed = useMemo(() => parseProduct(text), [text]);
  const type = picked.type ?? parsed.type;
  const size = type ? picked.size ?? productSize(type, picked.type ? null : parsed.presetId, parsed.dimensions) : null;
  const presetName = parsed.presetId && type === parsed.type ? t.presets[parsed.presetId] : undefined;
  const name = picked.name ?? (parsed.name || presetName || (type ? t.furniture[type].label : ""));
  const active = text.trim() !== "" || photo !== null;

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      setPhoto({ url, colors: await readPhoto(url) });
      setPhotoError(false);
    } catch {
      URL.revokeObjectURL(url);
      setPhotoError(true);
    }
  };

  const reset = () => {
    setText("");
    setPhoto(null);
    setPhotoError(false);
    setPicked({});
    if (fileInput.current) fileInput.current.value = "";
  };

  const add = () => {
    if (!type || !size) return;
    addFurniture(type, {
      name: name.trim() || t.furniture[type].label,
      dimensions: size,
      colors: photo ? colorsForModel(type, size, photo.colors) : undefined,
    });
    reset();
  };

  const ranges = { width: t.inspector.widthRange, depth: t.inspector.depthRange, height: t.inspector.heightRange };
  const field = (key: keyof Dimensions, label: string) => type && size && (
    <NumberField label={label} title={ranges[key](len.range(CATALOG[type].min[key], CATALOG[type].max[key]))} unit="length" min={1}
      value={toCm(size[key])} onChange={(v) => setPicked((p) => ({ ...p, size: { ...size, [key]: fromCm(v) } }))} />
  );

  return (
    <section className="section importer">
      <h2 className="section__title">{m.title}</h2>
      <p className="library-hint">{m.hint}</p>
      <textarea className="importer__text" rows={2} value={text} placeholder={m.placeholder} aria-label={m.textAria}
        onChange={(e) => { setText(e.target.value); setPicked({}); }} />
      <div className="importer__photo-row">
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        <button type="button" className="btn btn--ghost importer__photo-btn" onClick={() => fileInput.current?.click()}>
          <ImagePlus size={14} strokeWidth={1.8} /> {photo ? m.changePhoto : m.addPhoto}
        </button>
        {photo && <>
          <img className="importer__thumb" src={photo.url} alt={m.photoAlt} />
          <span className="importer__swatches" title={m.photoColors} aria-label={m.photoColors}>
            {photo.colors.slice(0, 4).map((c) => <span key={c} style={{ background: c }} />)}
          </span>
          <button type="button" className="icon-btn importer__remove" onClick={() => { setPhoto(null); if (fileInput.current) fileInput.current.value = ""; }}
            title={m.removePhoto} aria-label={m.removePhoto}><X size={14} /></button>
        </>}
      </div>
      {photoError && <p className="importer__note importer__note--warn" role="alert">{m.photoError}</p>}

      {active && <div className="importer__result">
        <label className="importer__field">
          <span>{m.model}</span>
          <select value={type ?? ""} onChange={(e) => setPicked((p) => ({ ...p, type: e.target.value as FurnitureType, size: undefined }))}>
            <option value="" disabled>{m.chooseModel}</option>
            {MODEL_TYPES.map((ft) => <option key={ft} value={ft}>{t.furniture[ft].label}</option>)}
          </select>
        </label>
        {type && size && <>
          <label className="importer__field">
            <span>{m.name}</span>
            <input value={name} onChange={(e) => setPicked((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <div className="importer__size">
            <span className="importer__caption">{t.inspector.size} · {UNIT_LABELS[len.unit]}</span>
            <div className="fields fields--3">
              {field("width", t.inspector.w)}
            {field("depth", t.inspector.d)}
              {field("height", t.inspector.h)}
            </div>
          </div>
        </>}
        <p className="importer__note">
          {!type ? m.noType : parsed.source && !picked.size ? m.readFrom(parsed.source) : !picked.size ? m.noSize : null}
          {type && size && outOfRange(type, size) && <span className="importer__note--warn"> {m.clamped}</span>}
        </p>
        <div className="button-row">
          <button type="button" className="btn btn--primary" disabled={!type} onClick={add}>
            <PackagePlus size={14} strokeWidth={1.8} /> {m.add}
          </button>
          <button type="button" className="btn" onClick={reset}>{m.clear}</button>
        </div>
      </div>}
    </section>
  );
}
