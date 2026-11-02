import { Building2, ChevronDown, ChevronRight, DoorOpen, Group, Layers, Pencil, Plus, Square, Trash2, Ungroup, X } from "lucide-react";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useLength, useName, useT } from "../i18n";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Building, ProjectRoom } from "../types";
import { Segmented } from "./ui/Segmented";
import { SUNLIT_STUDY } from "../lib/roomTemplates";
import { VILLA_PROJECT } from "../lib/villaTemplate";
import { ADU_PROJECT } from "../lib/aduTemplate";
import { FloorPlanButton } from "./FloorPlanImport";

/** Actions on the ticked rooms. */
function BatchBar({ ids }: { ids: string[] }) {
  const rooms = useEditor((s) => s.rooms);
  const buildings = useEditor((s) => s.buildings);
  const s = useEditor.getState();
  const t = useT();
  const name = useName();
  const members = rooms.filter((r) => ids.includes(r.id));
  const theirs = buildings.filter((b) => members.some((r) => r.buildingId === b.id));
  // The first building among them takes in the rest (rooms are listed in project order).
  const first = members.map((r) => buildings.find((b) => b.id === r.buildingId)).find((b) => b !== undefined) ?? null;
  const same = theirs.length === 1 && members.every((r) => r.buildingId === first?.id);
  const group = same ? { label: t.rooms.sameBuilding, hint: t.rooms.sameBuildingHint }
    : !first ? { label: t.rooms.group, hint: t.rooms.groupHint }
    : theirs.length === 1 ? { label: t.rooms.addTo, hint: t.rooms.addToHint(name(first.name)) }
    : { label: t.rooms.merge, hint: t.rooms.mergeHint(name(first.name)) };
  const all = members.length >= rooms.length;
  return <div className="batch-bar" role="toolbar" aria-label={t.rooms.checked(members.length)}>
    <div className="batch-bar__head">
      <span>{t.rooms.checked(members.length)}</span>
      <button type="button" className="icon-btn" title={t.rooms.clearChecked} aria-label={t.rooms.clearChecked}
        onClick={() => s.setCheckedRooms([])}><X size={14} /></button>
    </div>
    <div className="batch-bar__actions">
      <button type="button" className="btn" disabled={same} title={group.hint} onClick={() => s.groupRooms(ids)}>
        <Group size={14} /> {group.label}</button>
      <button type="button" className="btn" disabled={!theirs.length} title={t.rooms.ungroupHint} onClick={() => s.ungroupRooms(ids)}>
        <Ungroup size={14} /> {t.rooms.ungroup}</button>
      <button type="button" className="btn btn--danger" disabled={all} title={all ? t.assembly.keepOne : t.rooms.deleteCheckedHint(members.length)}
        onClick={() => s.removeRooms(ids)}><Trash2 size={14} /> {t.rooms.deleteChecked}</button>
    </div>
  </div>;
}

export function RoomDisplayControl() {
  const display = useEditor((s) => s.roomDisplay);
  const setDisplay = useEditor((s) => s.setRoomDisplay);
  const t = useT().rooms;
  return <Segmented label={t.shown} value={display} onChange={setDisplay} options={[
    { value: "single", label: t.single, icon: Square, hint: t.singleHint },
    { value: "building", label: t.building, icon: Building2, hint: t.buildingHint },
    { value: "all", label: t.together, icon: Layers, hint: t.togetherHint },
  ]} />;
}

type ListEntry = { room: ProjectRoom } | { building: Building; rooms: ProjectRoom[] };

/** Rooms in project order, each building listed once where its first room is. */
function listEntries(rooms: ProjectRoom[], buildings: Building[]): ListEntry[] {
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const listed = new Set<string>();
  return rooms.flatMap((r): ListEntry[] => {
    const building = r.buildingId ? byId.get(r.buildingId) : undefined;
    if (!building) return [{ room: r }];
    if (listed.has(building.id)) return [];
    listed.add(building.id);
    return [{ building, rooms: rooms.filter((other) => other.buildingId === building.id) }];
  });
}

export function RoomManager() {
  const rooms = useEditor((s) => s.rooms);
  const buildings = useEditor((s) => s.buildings);
  const checkedIds = useEditor((s) => s.checkedRoomIds);
  const display = useEditor((s) => s.roomDisplay);
  const active = useEditor(selectActiveRoom);
  const selectRoom = useEditor((s) => s.selectRoom);
  const addRoom = useEditor((s) => s.addRoom);
  const setChecked = useEditor((s) => s.setCheckedRooms);
  const t = useT().rooms;
  const name = useName();
  const len = useLength();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const anchor = useRef<string | null>(null);
  const entries = listEntries(rooms, buildings);
  const order = entries.flatMap((e) => "room" in e ? [e.room] : e.rooms);
  const checked = new Set(checkedIds);

  const toggle = (id: string) => {
    anchor.current = id;
    setChecked(checked.has(id) ? checkedIds.filter((c) => c !== id) : [...checkedIds, id]);
  };
  // Shift ticks every room between the last one ticked and this one, as listed.
  const tickRange = (id: string) => {
    const from = order.findIndex((r) => r.id === (anchor.current ?? id)), to = order.findIndex((r) => r.id === id);
    const [a, b] = from < 0 ? [to, to] : [Math.min(from, to), Math.max(from, to)];
    setChecked([...checkedIds, ...order.slice(a, b + 1).map((r) => r.id)]);
  };
  const onRowClick = (e: MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) toggle(id);
    else if (e.shiftKey) tickRange(id);
    else selectRoom(id);
  };
  const area = (list: ProjectRoom[]) => len.area(list.reduce((sum, r) => sum + r.room.width * r.room.depth, 0));

  const roomRow = (r: ProjectRoom): ReactNode => {
    const index = order.indexOf(r);
    const label = name(r.name);
    return <li key={r.id} className="room-row">
      <input type="checkbox" className="room-row__check" checked={checked.has(r.id)} aria-label={t.checkAria(label)}
        onChange={(e) => (e.nativeEvent as globalThis.MouseEvent).shiftKey ? tickRange(r.id) : toggle(r.id)} />
      <button type="button" className={`room-list__item${active.id === r.id ? " is-selected" : ""}${checked.has(r.id) ? " is-checked" : ""}`}
        aria-pressed={active.id === r.id} onClick={(e) => onRowClick(e, r.id)}>
        <span className="room-list__number">{String(index + 1).padStart(2, "0")}</span>
        <span className="room-list__text"><strong>{label}</strong><small>{t.summary(len.area(r.room.width * r.room.depth), r.furniture.length)}</small></span>
        <DoorOpen size={15} />
      </button>
    </li>;
  };

  const buildingGroup = (building: Building, members: ProjectRoom[]): ReactNode => {
    const label = name(building.name);
    const ticked = members.filter((r) => checked.has(r.id)).length;
    const open = !collapsed.has(building.id);
    const holdsActive = members.some((r) => r.id === active.id);
    const shown = holdsActive && display === "building";
    const flip = () => setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(building.id)) next.add(building.id);
      return next;
    });
    const commit = (value: string) => {
      setRenaming(null);
      useEditor.getState().renameBuilding(building.id, value);
    };
    return <li key={building.id} className={`building-group${!open && holdsActive ? " holds-active" : ""}${shown ? " is-shown" : ""}`}>
      <div className="building-group__header">
        <input type="checkbox" className="room-row__check" checked={ticked === members.length} aria-label={t.buildingCheckAria(label)}
          ref={(el) => { if (el) el.indeterminate = ticked > 0 && ticked < members.length; }}
          onChange={() => {
            const ids = members.map((r) => r.id);
            setChecked(ticked === members.length ? checkedIds.filter((id) => !ids.includes(id)) : [...checkedIds, ...ids]);
          }} />
        {renaming === building.id
          ? <input className="building-group__name" aria-label={t.buildingName} defaultValue={label} autoFocus
            onFocus={(e) => e.currentTarget.select()} onBlur={(e) => commit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(null);
            }} />
          : <>
            <button type="button" className="icon-btn building-group__fold" aria-expanded={open} onClick={flip}
              title={open ? t.collapse(label) : t.expand(label)} aria-label={open ? t.collapse(label) : t.expand(label)}>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <button type="button" className="building-group__toggle" aria-pressed={shown} title={t.showBuilding(label)}
              onClick={() => useEditor.getState().showBuilding(building.id)}>
              <Building2 size={14} />
              <span className="room-list__text"><strong>{label}</strong><small>{t.buildingSummary(members.length, area(members))}</small></span>
            </button>
          </>}
        {renaming !== building.id && <button type="button" className="icon-btn" title={t.renameHint} aria-label={t.renameHint}
          onClick={() => setRenaming(building.id)}><Pencil size={13} /></button>}
      </div>
      {open && <ul className="room-list room-list--nested">{members.map(roomRow)}</ul>}
    </li>;
  };

  return <section className="section room-manager">
    <h2 className="section__title">{t.title} <span className="count">{rooms.length}</span>
      <button className="link-btn" type="button" onClick={() => addRoom()} title={t.addHint}><Plus size={14} /> {t.add}</button>
    </h2>
    <ul className="room-list">
      {entries.map((e) => "room" in e ? roomRow(e.room) : buildingGroup(e.building, e.rooms))}
    </ul>
    {checkedIds.length > 0 && <BatchBar ids={checkedIds} />}
    <p className="library-hint">{t.hint}</p>
    <FloorPlanButton />
    <button type="button" className="room-template" onClick={() => {
      addRoom(SUNLIT_STUDY);
      useEditor.getState().setRoomDisplay("single");
    }} title={t.studyHint}>
      <img src="/references/sunlit-study.png" alt={t.studyAlt} />
      <span><strong>{name(SUNLIT_STUDY.name)}</strong><small>{t.studyMeta}</small></span>
      <Plus size={16} />
    </button>
    <button type="button" className="room-template" onClick={() => {
      const s = useEditor.getState();
      s.addProject(VILLA_PROJECT);
      s.setWallView("exterior");
    }} title={t.villaHint}>
      <img src="/references/villa.png" alt={t.villaAlt} />
      <span><strong>{name(VILLA_PROJECT.name)}</strong><small>{t.villaMeta}</small></span>
      <Plus size={16} />
    </button>
    <button type="button" className="room-template" onClick={() => {
      const s = useEditor.getState();
      s.addProject(ADU_PROJECT);
      s.setWallView("cutaway");
    }} title={t.aduHint}>
      <img src="/references/adu.svg" alt={t.aduAlt} />
      <span><strong>{name(ADU_PROJECT.name)}</strong><small>{t.aduMeta}</small></span>
      <Plus size={16} />
    </button>
  </section>;
}
