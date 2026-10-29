import { DoorOpen, Layers, Plus, Square } from "lucide-react";
import { useLength, useName, useT } from "../i18n";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import { Segmented } from "./ui/Segmented";
import { SUNLIT_STUDY } from "../lib/roomTemplates";
import { VILLA_PROJECT } from "../lib/villaTemplate";
import { FloorPlanButton } from "./FloorPlanImport";

export function RoomDisplayControl() {
  const display = useEditor((s) => s.roomDisplay);
  const setDisplay = useEditor((s) => s.setRoomDisplay);
  const t = useT().rooms;
  return <Segmented label={t.shown} value={display} onChange={setDisplay} options={[
    { value: "single", label: t.single, icon: Square, hint: t.singleHint },
    { value: "all", label: t.together, icon: Layers, hint: t.togetherHint },
  ]} />;
}

export function RoomManager() {
  const rooms = useEditor((s) => s.rooms);
  const active = useEditor(selectActiveRoom);
  const selectRoom = useEditor((s) => s.selectRoom);
  const addRoom = useEditor((s) => s.addRoom);
  const t = useT().rooms;
  const name = useName();
  const len = useLength();
  return <section className="section room-manager">
    <h2 className="section__title">{t.title} <span className="count">{rooms.length}</span>
      <button className="link-btn" type="button" onClick={() => addRoom()} title={t.addHint}><Plus size={14} /> {t.add}</button>
    </h2>
    <ul className="room-list">
      {rooms.map((r, index) => <li key={r.id}><button type="button"
        className={`room-list__item${active.id === r.id ? " is-selected" : ""}`} aria-pressed={active.id === r.id}
        onClick={() => selectRoom(r.id)}>
        <span className="room-list__number">{String(index + 1).padStart(2, "0")}</span>
        <span className="room-list__text"><strong>{name(r.name)}</strong><small>{t.summary(len.area(r.room.width * r.room.depth), r.furniture.length)}</small></span>
        <DoorOpen size={15} />
      </button></li>)}
    </ul>
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
  </section>;
}
