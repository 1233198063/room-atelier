import { Grid, Line } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { NeutralToneMapping } from "three";
import { degToRad } from "../lib/geometry";
import { useEditor } from "../store/editorStore";
import type { ProjectRoom } from "../types";
import { CameraRig } from "./CameraRig";
import { FurnitureItem } from "./FurnitureItem";
import { Lights } from "./Lights";
import { RoomDimensions, SelectionMeasurements } from "./Measurements";
import { RoomProvider } from "./RoomContext";
import { RoomShell } from "./RoomShell";
import { ScreenLabel } from "./ScreenLabel";
import { useFlaggedIds } from "./useFlaggedIds";

function RoomScene({ data }: { data: ProjectRoom }) {
  const editing = useEditor((s) => s.mode === "edit");
  const combined = useEditor((s) => s.roomDisplay === "all");
  const active = useEditor((s) => s.activeRoomId === data.id);
  const selectedId = useEditor((s) => s.selectedId);
  const flagged = useFlaggedIds();
  const { room } = data;
  const placement = combined ? data : { position: [0, 0] as [number, number], rotation: 0 };
  return <RoomProvider data={data} placement={placement}>
    <group position={[placement.position[0], 0, placement.position[1]]} rotation={[0, degToRad(placement.rotation), 0]}>
      <RoomShell />
      {data.furniture.map((f) => <FurnitureItem key={f.id} furniture={f} selected={active && f.id === selectedId} flagged={active && flagged.has(f.id)} />)}
      {editing && active && <>
        <Grid position={[room.width / 2, 0.002, room.depth / 2]} args={[room.width, room.depth]}
          cellSize={0.1} cellThickness={0.45} cellColor="#d9c7ab" sectionSize={1} sectionThickness={0.9}
          sectionColor="#ab9373" fadeDistance={10000} fadeStrength={0} />
        <SelectionMeasurements />
        {!combined && <RoomDimensions />}
        {combined && <Line points={[[0, 0.015, 0], [room.width, 0.015, 0], [room.width, 0.015, room.depth], [0, 0.015, room.depth], [0, 0.015, 0]]}
          color="#2f62c9" lineWidth={2} raycast={() => null} />}
      </>}
      {combined && <ScreenLabel position={[room.width / 2, 0.04, room.depth / 2]} text={data.name}
        className={`room-label${active ? " is-active" : ""}`} />}
    </group>
  </RoomProvider>;
}

export function Viewport() {
  const rooms = useEditor((s) => s.rooms);
  const activeId = useEditor((s) => s.activeRoomId);
  const combined = useEditor((s) => s.roomDisplay === "all");
  const select = useEditor((s) => s.select);
  return <Canvas shadows="percentage" dpr={[1, 2]}
    gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping }}
    onPointerMissed={(e) => { if (e.button === 0) select(null); }}>
    <Lights />
    <CameraRig />
    {rooms.filter((r) => combined || r.id === activeId).map((r) => <RoomScene key={r.id} data={r} />)}
  </Canvas>;
}
