import { Grid, Line } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { NeutralToneMapping } from "three";
import { useName } from "../i18n";
import { degToRad } from "../lib/geometry";
import { gardenHoles, roomElevation, roomKind, type Point2 } from "../lib/rooms";
import { selectVisibleRooms, useEditor } from "../store/editorStore";
import type { ProjectRoom } from "../types";
import { CameraRig } from "./CameraRig";
import { FurnitureItem } from "./FurnitureItem";
import { Lights } from "./Lights";
import { RoomDimensions, SelectionMeasurements } from "./Measurements";
import { RoomProvider } from "./RoomContext";
import { RoomShell } from "./RoomShell";
import { Roof } from "./Roof";
import { ScreenLabel } from "./ScreenLabel";
import { useFlaggedIds } from "./useFlaggedIds";

function RoomScene({ data, holes }: { data: ProjectRoom; holes: Point2[][] }) {
  const editing = useEditor((s) => s.mode === "edit");
  const combined = useEditor((s) => s.roomDisplay === "all");
  const active = useEditor((s) => s.activeRoomId === data.id);
  const exterior = useEditor((s) => s.wallView === "exterior" && s.view === "perspective");
  const selectedId = useEditor((s) => s.selectedId);
  const flagged = useFlaggedIds();
  const name = useName();
  const { room } = data;
  const placement = useMemo(() => combined ? { position: data.position, rotation: data.rotation, elevation: roomElevation(data) }
    : { position: [0, 0] as [number, number], rotation: 0, elevation: 0 }, [combined, data]);
  // Seen from outside: whole walls and the roof. The room being edited always stays open.
  const closed = combined && exterior && !(editing && active) && roomKind(data) !== "garden";
  // Big plots get a coarser grid so the lines don't shimmer.
  const big = Math.max(room.width, room.depth) > 20;
  return <RoomProvider data={data} placement={placement}>
    <group position={[placement.position[0], placement.elevation, placement.position[1]]} rotation={[0, degToRad(placement.rotation), 0]}>
      <RoomShell closed={closed} holes={holes} />
      {closed && data.roof === "hip" && <Roof room={room} />}
      {data.furniture.map((f) => <FurnitureItem key={f.id} furniture={f} selected={active && f.id === selectedId} flagged={active && flagged.has(f.id)} />)}
      {editing && active && <>
        <Grid position={[room.width / 2, 0.002, room.depth / 2]} args={[room.width, room.depth]}
          cellSize={big ? 1 : 0.1} cellThickness={0.45} cellColor="#d9c7ab" sectionSize={big ? 5 : 1} sectionThickness={0.9}
          sectionColor="#ab9373" fadeDistance={10000} fadeStrength={0} />
        <SelectionMeasurements />
        {!combined && <RoomDimensions />}
        {combined && <Line points={[[0, 0.015, 0], [room.width, 0.015, 0], [room.width, 0.015, room.depth], [0, 0.015, room.depth], [0, 0.015, 0]]}
          color="#2f62c9" lineWidth={2} raycast={() => null} />}
      </>}
      {combined && <ScreenLabel position={[room.width / 2, 0.04, room.depth / 2]} text={name(data.name)}
        className={`room-label${active ? " is-active" : ""}`} />}
    </group>
  </RoomProvider>;
}

const NO_HOLES: Point2[][] = [];

export function Viewport() {
  const rooms = useEditor((s) => s.rooms);
  const activeRoomId = useEditor((s) => s.activeRoomId);
  const roomDisplay = useEditor((s) => s.roomDisplay);
  const mode = useEditor((s) => s.mode);
  const select = useEditor((s) => s.select);
  const shown = useMemo(() => new Set(selectVisibleRooms({ rooms, activeRoomId, roomDisplay, mode }).map((r) => r.id)),
    [rooms, activeRoomId, roomDisplay, mode]);
  // Holes depend on where the courtyards are, not on how the garden is displayed.
  const holes = useMemo(() => new Map(rooms.map((r) => {
    const h = gardenHoles(r, rooms);
    return [r.id, h.length ? h : NO_HOLES];
  })), [rooms]);
  return <Canvas shadows="percentage" dpr={[1, 2]}
    gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping }}
    onPointerMissed={(e) => { if (e.button === 0) select(null); }}>
    <Lights />
    <CameraRig />
    {rooms.filter((r) => shown.has(r.id)).map((r) => <RoomScene key={r.id} data={r} holes={holes.get(r.id) ?? NO_HOLES} />)}
  </Canvas>;
}
