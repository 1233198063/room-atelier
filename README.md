# Room Atelier

**Edit with precision. Design with warmth.**

A browser-based 3D room planner. In **Edit** mode it behaves like a small CAD tool: real-world dimensions, typed coordinates, grid and wall snapping, live clearance measurements. In **Preview** mode the panels fall away, the light turns warm, and you can just look at the room you made.

![Edit mode](docs/edit.png)

| Plan view | Preview |
| --- | --- |
| ![Plan view](docs/plan.png) | ![Preview mode](docs/preview.png) |

## Features

- **Real-size rooms.** Enter width, depth and height in cm and the floor and walls are generated to match. Shrinking the room pulls furniture back inside.
- **Parametric furniture.** Bed, desk, chair, cabinet and dresser are built from code, so they stay correct at any size. A cabinet under 1 m gets drawers, a taller one gets doors, so the same type works as a nightstand or a wardrobe. The dresser's grid of drawers adapts to its size: two columns from 1 m wide, one row per ~20 cm of height.
- **Doors and windows.** Add them from the library, drag them along a wall or onto a different wall, and set width, height and sill height precisely. Walls are split around each opening, with no boolean geometry. Doors show their swing arc on the floor, so you can see what space to keep clear. In plan view, walls are cut at 1.2 m like an architectural floor plan, so windows show as the classic double line.
- **Camera.** Orbit, pan and zoom in 3D. Switch to an orthographic **Plan** view for a true floor plan. Walls between the camera and the room cut away automatically.
- **Select and move.** Click to select, then drag across the floor. Snapping goes to a 1, 5 or 10 cm grid, and edges within 6 cm of a wall stick flush to it. Hold Alt to move freely.
- **Precise properties.** Position, elevation, rotation and size are all editable in cm. Fields accept units and simple sums (`1.2m`, `450mm`, `120+35`). You can also drag a field's label to scrub the value, or use ↑/↓ to step it.
- **Measure and align.** The selected piece shows dimension lines to all four walls. A selected door or window shows a chain dimension along its wall (corner → opening → corner). There's a clearance readout and a live SVG plan, plus one-click alignment to any wall or to the room's center line.
- **Undo / redo.** One drag or one scrub counts as one undo step, and a burst of arrow-key nudges merges into one step.
- **Save and load.** Changes autosave to `localStorage` (debounced), and Ctrl+S saves right away. Saved data is checked on load, so a hand-edited or corrupted save falls back safely.

Out of scope for v1: AI layout, accounts, backend, photoreal rendering, collision detection (furniture can overlap a window or a door swing), CAD import.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (geometry, persistence, store, input parsing)
npm run build    # type-check + production build
```

## Architecture

```
React + TypeScript UI ─── Toolbar · Library · Properties panel
          │  read state / call actions
          ▼
Zustand editor store ──── room · furniture · selection · history   ← single source of truth
          │  read state                         │ debounced
          ▼                                     ▼
React Three Fiber scene ─ Canvas · meshes       localStorage
          │
Geometry utilities ────── footprints · clamping · snapping · measuring (pure functions, unit-tested)
          │
Three.js / WebGL
```

**The rule that holds it together: furniture data lives in the store, never in Three.js meshes.**
Dragging a chair in the canvas and typing its X coordinate in the panel are the same call, `updateFurniture(id, { position })`. The store enforces the invariants (inside the room, sizes within limits, mm precision), and the 3D scene, the outliner and the SVG plan all re-render from that one copy of the data.

### Units and coordinates

- 1 Three.js unit = 1 meter. The UI shows centimeters.
- Y is up. The room's back-left floor corner is the origin, so X reads as "distance from the left wall" and Z as "distance from the back wall".
- `position` is the center of the furniture's footprint. `rotation` is in degrees around Y (counter-clockwise seen from above).
- An opening's `offset` is its center along its wall, in the same coordinates: an X value on the back and front walls, a Z value on the side walls.

### Project structure

```
src/
  types.ts                 data model (Furniture, Room, Layout)
  lib/
    catalog.ts             furniture types, default sizes, limits
    geometry.ts            footprint math, clamping, snapping, alignment
    openings.ts            door/window catalog, wall coordinates, splitting walls around openings
    persistence.ts         localStorage load/save with validation
  store/
    editorStore.ts         Zustand store: state, actions, undo/redo
    autosave.ts            debounced persistence
  scene/                   everything inside <Canvas>
    Viewport.tsx           canvas setup
    CameraRig.tsx          perspective / plan cameras + OrbitControls
    RoomShell.tsx          floor + walls, cutaway animation
    ClippedBox.tsx         a wall piece that clips itself to the wall's current height
    wallParts.ts           frame, glass, leaf and handle boxes for each opening
    OpeningItem.tsx        one door/window: parts, hit box, swing arc, plan symbol
    FurnitureItem.tsx      one piece: transform, hover, selection
    useFurnitureDrag.ts    raycast-to-floor dragging
    useOpeningDrag.ts      raycast-to-wall dragging
    Measurements.tsx       CAD-style dimension lines
    ScreenLabel.tsx        HTML label pinned to a 3D point
    models/                parametric Bed, Desk, Chair, Cabinet
  components/              toolbar, library, properties panel, SVG plan
```

## Reading the code (new to 3D?)

If you're new to 3D programming, this order goes from the basics to the interactions:

1. **`scene/models/Box.tsx` → `models/Desk.tsx`**: a mesh is a geometry (shape) plus a material (surface). Every piece of furniture is a handful of positioned boxes.
2. **`scene/FurnitureItem.tsx`**: a `<group>` moves and rotates its children together. This is where data (meters, degrees) becomes a transform (position, radians).
3. **`scene/Lights.tsx`**: hemisphere light for soft fill plus a directional "sun" for shadows.
4. **`scene/CameraRig.tsx`**: perspective vs. orthographic cameras, and what OrbitControls does.
5. **`scene/RoomShell.tsx`**: `useFrame` runs every frame. Mutate meshes directly here; don't go through React state.
6. **`scene/useFurnitureDrag.ts`**: raycasting turns a 2D mouse position into a 3D point on the floor. Most editor interaction is built on this.
7. **`scene/ScreenLabel.tsx`**: the reverse, projecting a 3D point onto the 2D screen.
8. **`lib/openings.ts` → `scene/ClippedBox.tsx`**: holes in walls without CSG. The wall is split into boxes around each opening, and each box clips itself to the wall's animated height.
9. **`scene/useOpeningDrag.ts`**: the same raycasting idea, but against vertical wall planes instead of the floor.
