import { DoorOpen, Layers, Plus, Square } from "lucide-react";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import { Segmented } from "./ui/Segmented";
import { SUNLIT_STUDY } from "../lib/roomTemplates";

export function RoomDisplayControl() {
  const display = useEditor((s) => s.roomDisplay);
  const setDisplay = useEditor((s) => s.setRoomDisplay);
  return <Segmented label="Rooms shown" value={display} onChange={setDisplay} options={[
    { value: "single", label: "Single room", icon: Square, hint: "Show only the selected room" },
    { value: "all", label: "Together", icon: Layers, hint: "Show and arrange all rooms together" },
  ]} />;
}

export function RoomManager() {
  const rooms = useEditor((s) => s.rooms);
  const active = useEditor(selectActiveRoom);
  const selectRoom = useEditor((s) => s.selectRoom);
  const addRoom = useEditor((s) => s.addRoom);
  return <section className="section room-manager">
    <h2 className="section__title">Rooms <span className="count">{rooms.length}</span>
      <button className="link-btn" type="button" onClick={() => addRoom()} title="Add an empty room"><Plus size={14} /> Add room</button>
    </h2>
    <ul className="room-list">
      {rooms.map((r, index) => <li key={r.id}><button type="button"
        className={`room-list__item${active.id === r.id ? " is-selected" : ""}`} aria-pressed={active.id === r.id}
        onClick={() => selectRoom(r.id)}>
        <span className="room-list__number">{String(index + 1).padStart(2, "0")}</span>
        <span className="room-list__text"><strong>{r.name}</strong><small>{(r.room.width * r.room.depth).toFixed(1)} m² · {r.furniture.length} pieces</small></span>
        <DoorOpen size={15} />
      </button></li>)}
    </ul>
    <p className="library-hint">Select a room to edit its furniture and dimensions.</p>
    <button type="button" className="room-template" onClick={() => {
      addRoom(SUNLIT_STUDY);
      useEditor.getState().setRoomDisplay("single");
    }} title="根据参考图新增书房，保留现有房间">
      <img src="/references/sunlit-study.png" alt="参考图：暖木书架、手账长桌与窗边阅读区" />
      <span><strong>阳光里的墨香与旅行手账</strong><small>按参考图新建 · 4.8 × 5.8 m（估算）</small></span>
      <Plus size={16} />
    </button>
  </section>;
}
