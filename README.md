# Room Atelier

**Edit with precision. Design with warmth.**

A browser-based 3D room planner. In **Edit** mode it behaves like a small CAD tool: real-world dimensions, typed coordinates, grid and wall snapping, live clearance measurements. In **Preview** mode the panels fall away, the light turns warm, and you can just look at the room you made.

![Edit mode](docs/edit.png)

| Plan view | Preview |
| --- | --- |
| ![Plan view](docs/plan.png) | ![Preview mode](docs/preview.png) |

## Features

- **中文 / English.** The button left of Undo switches the whole interface; a page is never half one language and half the other. The choice is remembered per browser (first visit follows the browser language) and follows across open tabs. Names the app made up (library labels such as "Chair 2", and every piece in the bundled templates) are shown in the current language; a name you type stays as you typed it. Layout-check and color tips are worded in the current language too.
- **Import a floor plan.** **Import a floor plan** (under the room list) builds rooms from a plan image: choose it, drop it or paste it.
  - **AI reading** (needs the server, see below): Claude reads the rooms with their names and kinds (including open-plan zones with no walls between them), the sizes printed on the plan (`11'X11'`, `3600×4200`), dimension lines, and doors and windows. Its boxes are then moved onto the exact wall faces found in the image, and the printed sizes set the scale, so there is nothing to measure. Open-plan zones meet on a shared edge and are built without a wall there; doors and windows go into the walls they sit in (a door between two rooms into both).
  - **Local reading** (always, and the fallback when AI isn't available): walls are thick dark bands, so labels, dimension lines, door arcs and furniture symbols don't count, and windows drawn as thin lines don't open a room up. Only areas bounded on all four sides are taken as rooms.
  - **Check and adjust**: click inside a room to find it, drag to draw one, drag a selected room's edges, rename it, or remove it with Delete. To set or correct the scale, drag along a dimension and type it as printed (feet and inches in two boxes when the unit is ft-in). Areas under 60 cm across are skipped rather than stretched, areas under 1 m² are flagged as likely shafts or closets, and a scale that makes the plan implausibly small or large is called out.
  - **Create** adds rectangular rooms at their measured inside sizes and their places on the plan, beside the current rooms or replacing them (undoable). With AI reading, the image is sent to Anthropic's API; otherwise it stays in the browser. It is never saved.
- **Open sides.** An indoor room can leave out the wall on any side (**No wall on** in room settings), for open-plan living, dining and kitchen. Floor-plan import sets these for you.
- **Length units.** The ruler menu in the toolbar shows every length in mm, cm, m or ft-in: fields, dimension lines, sizes in the library and layout-check messages. ft-in writes lengths as plans do (12' 1", never 145 in); floor areas are in square feet, the snap grid offers ½, 1 and 6 in, and arrow keys and field steps move 1 in (Shift: 10 in). A plain number you type is read in the unit on show (feet with ft-in, where `12 1` is 12' 1"); `1.2m`, `450mm`, `36"`, `5'6"`, `12'1''`, `5ft 6in`, curly or full-width quotes and sums work in any unit. Product listings in inches and feet (`84" W x 38" D x 34" H`, `5 ft x 8 ft`) are read too. Saves are unaffected (data stays in meters), and the choice is remembered per browser.
- **A library by room.** Cards come at common retail sizes (mainland China) and are grouped into Living room, Dining, Bedroom, Study, Kitchen, Bathroom, Plants, Structure and Garden, with filter chips at the top. New models: L-shaped corner sofa, round pedestal table, wall-hung TV, office chair, fridge (side-by-side from 80 cm wide), front-loading washer, kitchen counter (sink from 1.2 m, hob from 1.6 m), gas range with an oven, shaker-door wall cabinets with a strip light underneath, a built-in dishwasher under its own strip of countertop, a microwave (hang it over the range), toilet, vanity, bathtub and corner shower. A chair 95 cm or taller becomes a counter stool with a high seat and a footrest. Sanitaryware and appliances have their own **Ceramic** color. The layout check wants about 60 cm in front of fridge and vanity doors and of a washer's, oven's or dishwasher's door, 80 cm in front of a kitchen counter (counters meeting in an L don't count against each other) and 50 cm in front of a toilet. Wall cabinets and a microwave hung above the counters don't count as overlapping them.
- **Add from a product.** Paste a shop listing's title and size into **Add from a product** (top of the library). Keywords pick the model ("转角沙发", "office chair", "1.8米床"…) and the size is read from labeled values (`长220 宽95 高85cm`, `W220 D95 H85`), a W×D×H triple (`120*60*75cm`, `2000×1800×1000mm`), a pair, or a TV's inches; sizes without a unit are read as mm, cm or m from their magnitude. Anything missing comes from the matching library card. Add a product photo and its main colors, with the plain backdrop left out, go to the model's first two color roles. You can change the model, name and size before adding. It all runs in the browser; nothing is uploaded.
- **Photo-inspired sunlit study.** The supplied reference is available as **阳光里的墨香与旅行手账** in the Rooms sidebar, or through `/?room=sunlit-study`. Opening that link appends a furnished room and consumes the URL command so refreshing does not add duplicates. Existing rooms are preserved, and the addition is undoable. Its 4.8 × 5.8 × 2.9 m dimensions are estimates from the image. The editable interpretation includes full-height bookcases, a central craft table, a calligraphy workbench, a reading chair and ottoman, a patterned rug, blue curtains and plants; fine artwork, outdoor scenery and the pet are not reproduced.
- **A one-bedroom apartment from a floor plan.** **一居室公寓 · 按平面图** in the Rooms sidebar adds five rooms from a plan drawn in inches, checked against the building's own plan of the unit: a living room with a 72 × 30 in table for work and meals, two chairs, a dog crate and a storage rack, opening without a wall onto the kitchen and entry hall; a bedroom with a queen bed against the right wall, a nightstand and a 48 × 24 in desk under the window; a walk-in closet off the bedroom; and a bathroom off the hall. Room sizes and furniture come from the inch plan and keep the clearances written on it (41 in beside the bed, 34 in from the desk to the bed, 76 in behind the chairs, 98 in across the kitchen). The building's plan sets the rest: every door is 30 in; the closet opens beside the bedroom door and swings into the closet; the bathroom door hangs just below the tub and swings into the bathroom; the front door is hinged on the side toward the laundry, a compact stacked washer and dryer facing the hall nook. The kitchen runs dishwasher, sink, range, counter and fridge from the living room to the entry under a band of wall cabinets, with grey granite tops; the bathroom has a 60 × 30 in tub across the back with its tap at the left, and the vanity and toilet against the front wall. Floors are grey planks, the windows 80½ in wide. The plan's thin walls become 10 cm walls, so the outside grows slightly and the closet and bathroom are a little shallower, and a lone sink sits in the middle of its counter, about 25 cm nearer the range than on the plan. The ceiling (8 ft), window heights and the closet's rods and shelves are on neither plan. There is no crate model, so the crate is a low cabinet of its size, and the storage cabinet is as deep as a cabinet goes (80 cm, not the inch plan's 42 in).
- **Villa with an underground library.** **地中海别墅 · 地下图书馆与花园** in the Rooms sidebar adds six spaces at once, beside any existing rooms: a 44 × 42 m garden, a two-storey house with a hip roof, a single-storey kitchen wing, a 14 × 9 m library about 6 m tall two floors below ground, and a sunken courtyard on the same level. The library has a gallery reached by a curved stair, double-height bookcases, a sofa group on a large rug, a projection screen, a craft table and an easel. Its glass wall faces the courtyard, which has a long stone stair up to the lawn. The garden has the drive and forecourt, the terrace and outdoor dining, a kitchen garden, rose and lavender beds, and boundary olives and cypresses. The layout follows the supplied concept renders, site plan and section, with estimated dimensions. The library sits under the terrace with its glass facing the courtyard, as in the exterior render. Arched openings, interior partitions on the upper floor and climbing plants are not reproduced.
- **Levels, gardens and roofs.** Each room has a floor level (**Lvl** in Arrange rooms; negative is underground), a type (**Indoor room**, **Garden · no walls** or **Open courtyard**) and an optional **terracotta hip roof**. Floors stack in the Together view. A garden's lawn opens above any courtyard below it. While you edit an enclosed room, the rooms stacked above it step aside. **Exterior** (Together view, bottom right) shows the other rooms closed with their roofs; **Cutaway** opens every room. Stacked floors and rooms standing in a garden are not flagged as overlaps. Gardens and courtyards skip the window and daylight tips.
- **Multiple rooms.** Add and name rooms with independent dimensions, furniture, openings and color schemes. Switch between **Single room** and **Together** in either 3D or Plan view. In Together mode, drag rooms in the assembly plan, enter X/Z coordinates and rotation, or join a room to any side of another room. Exterior edges snap together; hold Alt for free placement. Overlapping rooms are flagged. Room creation, placement and deletion support undo/redo and autosave, and existing single-room saves migrate automatically.
- **Custom joins.** **Custom join** in Arrange rooms puts any wall of the selected room against any wall of another room: the room turns by itself so the two walls face each other. Line up their left/back ends, centers or right/front ends (as the other room sees its wall) and slide by an offset. Choose how they connect: **Walls** back to back; a **Door** cut through both walls in the middle of the part they share, hinged on the same jamb (choose its width); or **Open**, with no wall between them, for one open-plan space (the two walls must be the same length and line up). A dashed outline in the small plan shows where the room will land, with the two walls highlighted. The panel says how much of the walls is shared, and warns before you join if the room would overlap another room or a door doesn't fit. Rooms ticked with it move along, and the whole join is one undo step.
- **Buildings and batch selection.** Tick rooms in the Rooms sidebar (or Ctrl/⌘-click and Shift-click them) to act on several at once: **Group as building**, **Ungroup**, or **Delete**. **View together** (or **Selected** next to **Single room** at the top of the view) shows only the ticked rooms, in place, together with the room being edited; ticking or unticking rooms updates the view. Ticks aren't saved, so this view comes back as **Single room** after a reload. Grouping rooms that are partly in a building adds the rest to it, and grouping rooms from several buildings merges them into the first. Rooms in a building are listed together under its name, with the room count and total floor area. Click a building's name to show only that building: the view switches to **Building**, which draws the selected room's building with its rooms in place (a room in no building shows alone), and the small plan greys out the rest. A building's checkbox ticks all of its rooms, its arrow folds it, and the pencil renames it. Projects added from the sidebar (the villa, the apartment) and rooms created from a floor plan each become one building, shown on its own. In **Arrange rooms**, two or more ticked rooms move as one: dragging any of them, arrow-key nudges, the X/Z fields, **Rotate 90°** (about the middle of the group) and **Join next to** all move the whole group, and its outer edges snap to other rooms. **Select all of …** ticks the rest of the current room's building. The small plan outlines each building with a dashed line. Grouping, renaming, deleting and moving are undoable; which rooms are ticked is not saved.
- **Individual furniture colors.** Select a piece and use **Colors** in its properties to choose body, legs/base, textiles or hardware colors, depending on the model. Plants have pot and leaf colors too. Pick a color or enter a six-digit hex code. Custom colors belong to that piece, survive room-style changes, and are copied when duplicating; **Use defaults** returns it to the current room palette and model defaults. Color edits support undo/redo and autosave, and older saves keep their existing appearance.
- **Real-size rooms.** Enter width, depth and height in cm and the floor and walls are generated to match. Shrinking the room pulls furniture back inside.
- **Parametric furniture.** Bed, desk, chair, cabinet and dresser are built from code, so they stay correct at any size. A cabinet under 1 m gets drawers, a taller one gets doors, so the same type works as a nightstand or a wardrobe. The dresser's grid of drawers adapts to its size: two columns from 1 m wide, one row per ~20 cm of height.
- **Plants.** Floor and tabletop plants share one parametric model: tall ones grow a trunk, short ones stay bushy. Drag onto the visible top of a cabinet, bookcase, desk or dresser; suitable tops highlight green, the pot stays supported at edges, and dragging clearly past an edge returns it to the floor. Dragging follows the actual support height in both single and assembled rooms. Select a plant and use **Place on a surface** in Properties for direct placement (or return to an open floor spot). Only tops that fit the pot and leave enough ceiling clearance are offered. Hold Alt to bypass the grid for fine adjustments.
- **Color schemes.** Five curated palettes (Warm Oak, Nordic, Japandi, Mid-century, Plaster & Clay), switched in one click. Seven color roles (walls, floor, wood, dark wood, textiles, accent, hardware) can each be fine-tuned. Rule-based suggestions mark the palettes that suit the room, based on its floor area and how much window glass it has, and say why. Color tips flag furniture that blends into the walls, or dark walls in a small or dim room.
- **Layout check.** A rule-based "linter" for rooms, with no AI. It flags overlapping pieces, blocked door swings, tall furniture in front of windows, desks without room for a chair, and drawers or doors with no space to open. It also gives softer tips: a tight side of the bed, or a desk or plant far from daylight. Every message includes the measured numbers, and clicking it jumps to the piece to move. Pieces with warnings are outlined in amber.
- **Doors and windows.** Add them from the library, drag them along a wall or onto a different wall, and set width, height and sill height precisely. Walls are split around each opening, with no boolean geometry. Doors show their swing arc on the floor, so you can see what space to keep clear. A door between two rooms is cut into both rooms' walls and swings into both unless you set **Opens into: Next room** on the side it swings away from (a bedroom, for its closet door); that side then draws no arc and the layout check keeps no floor clear for it. In plan view, walls are cut at 1.2 m like an architectural floor plan, so windows show as the classic double line.
- **Camera.** Orbit, pan and zoom in 3D. Switch to an orthographic **Plan** view for a true floor plan. Walls between the camera and the room cut away automatically.
- **Select and move.** Click to select, then drag across the floor. Snapping goes to a 1, 5 or 10 cm grid, and edges within 6 cm of a wall stick flush to it. Hold Alt to move freely.
- **Precise properties.** Position, elevation, rotation and size are all editable in cm. Fields accept units and simple sums (`1.2m`, `450mm`, `120+35`). You can also drag a field's label to scrub the value, or use ↑/↓ to step it.
- **Measure and align.** The selected piece shows dimension lines to all four walls. A selected door or window shows a chain dimension along its wall (corner → opening → corner). There's a clearance readout and a live SVG plan, plus one-click alignment to any wall or to the room's center line.
- **Undo / redo.** One drag or one scrub counts as one undo step, and a burst of arrow-key nudges merges into one step.
- **Save and load.** Changes autosave to `localStorage` (debounced), and Ctrl+S saves right away. Tabs open on the same project stay in sync, so a stale tab can't overwrite newer edits. Saves belong to the address, so the dev server always uses port 5180. Saved data is checked on load, so a hand-edited or corrupted save falls back safely.

Out of scope for v1: AI layout, accounts, backend, photoreal rendering, collision detection (furniture can overlap a window or a door swing), CAD import.

## Getting started

```bash
npm install
npm run dev          # the app, http://localhost:5180
npm run dev:server   # the API for AI floor-plan reading, http://localhost:5181 (Vite proxies /api to it)
npm test             # unit tests
npm run build        # type-check (app and server) + production build
npm start            # production: one server for the built app and the API
```

AI floor-plan reading needs an Anthropic API key on the server: copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Plans are read by Claude Opus 5 (`FLOOR_PLAN_MODEL` to change it); a request declined by the model's safety classifiers is retried on Anthropic's recommended fallback model. Each plan is one request with the image (roughly a few US cents). Without a key the import still works with the local reader and says why. `FLOOR_PLAN_MOCK=reading.json` answers every request with a saved reading, for working on the app without API calls.

### Working with multiple rooms

1. Choose **Add room** in the left sidebar. Select a room there or from the canvas dropdown to edit its contents. Click its name in the properties panel to rename it.
2. Choose **Single room** to view only that room, **Building** to view the building it belongs to, or **Together** to see the assembled project. All three work in Edit and Preview modes.
3. In Building or Together view (Edit mode), drag a room by its name label on the canvas, in 3D or in the plan. It snaps to the grid and to nearby rooms' edges; hold Alt to move freely. A click on the label just selects the room. The rooms stacked above the one you're editing step aside, and the selected room's label stays on top. Deselect furniture to see **Arrange rooms**: drag any room in the small plan, use the X/Z and rotation fields, or choose a neighbor and click Left/Back/Front/Right. Focus a room in the small plan and use arrow keys for 1 cm nudges, or Shift+arrows for 10 cm.
4. Use **Frame all** (F) after precise placement to fit the entire layout. Each room keeps its furniture and openings in local coordinates when moved or rotated.

To add the villa, click its card below the room list. The garden is selected first, so the whole site is visible; pick the library in the sidebar and switch to **Single room** to work inside it. Library pieces upstairs stand on the gallery deck, 1 m below the gallery's total height. The new furniture (sofa, table, lamp, easel, projection screen, framed art), structure (gallery, curved stair, stairs) and garden pieces (tree, shrub, paving) are in the furniture library. A table lower than 55 cm becomes a stone coffee table. A shrub lower than 90 cm flowers in its accent color. A tree narrower than 30% of its height grows as a cypress. Paving, galleries, wall-hung pieces and tree canopies don't block circulation.

To add the reference study, click its image card below the room list. The new bookcase, craft table, armchair, ottoman, rug and curtain models also appear in the furniture library and support individual colors. Craft-table height includes its desktop tools; plants sit on the tabletop 16 cm below that total height. Rugs and curtains are excluded from circulation checks and floor-coverage totals.

For anything other than flush, corner-aligned sides, use **Custom join** (step 3's buttons always align the corners and never cut openings).

To move a whole building, tick its checkbox in the sidebar (or use **Select all of …** in Arrange rooms), then drag any of its rooms, on the canvas or in the small plan.

Joining positions complete rooms with their exterior walls touching. It preserves their individual walls and openings; it does not automatically cut connecting doors. The room selected in the sidebar determines which room receives new furniture and which room the layout checks describe.

Projects save in the version 2 format under `room-atelier:layout:v2`. Buildings are an optional `buildings` list (id and name) with a `buildingId` on each member room, so older saves load unchanged. On first load, a version 1 save is wrapped in a single room at the origin; the old storage entry is preserved as a backup.

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
- Y is up. Each room's back-left floor corner is its local origin, so furniture X reads as "distance from the left wall" and Z as "distance from the back wall". A room also has an independent world X/Z position and Y rotation for assembly; Single room view ignores that transform without changing it.
- `position` is the center of the furniture's footprint. `rotation` is in degrees around Y (counter-clockwise seen from above).
- An opening's `offset` is its center along its wall, in the same coordinates: an X value on the back and front walls, a Z value on the side walls.

### Project structure

```
server/
  index.ts                 HTTP server: POST /api/floor-plan, and the built app in production
  floorPlanAi.ts           the Claude request (structured output, refusal fallback)
  floorPlanSchema.ts       what Claude reports about a plan, and the prompt
src/
  types.ts                 data model (Furniture, Room, Layout)
  i18n/
    messages.ts            every interface string, in English and Chinese
    names.ts               translations of generated and template names
    index.ts               language store, useT / useName hooks
    units.ts               length-unit store, useLength hook
  lib/
    catalog.ts             furniture types, default sizes, limits, the library by room
    productImport.ts       reading a model and size from pasted product text
    floorPlan.ts           finding walls and rooms in a floor plan image; rooms, doors and windows for the editor
    floorPlanAi.ts         Claude's reading → rooms snapped to walls, scale from printed sizes
    units.ts               length units: formatting and conversion
    imageColors.ts         main colors of a product photo
    geometry.ts            footprint math, clamping, snapping, alignment
    polygon.ts             2D overlap (separating axis test) and ray casting on the floor plane
    layoutChecks.ts        the layout and color check rules
    palettes.ts            palette presets, color contrast math, palette suggestions
    openings.ts            door/window catalog, wall coordinates, splitting walls around openings
    persistence.ts         localStorage load/save with validation
    rooms.ts               room placement, overlap, levels, garden openings
    roof.ts                hip roof geometry
    villaTemplate.ts       the villa, library, courtyard and garden
    apartmentTemplate.ts   the one-bedroom apartment from a floor plan
  store/
    editorStore.ts         Zustand store: state, actions, undo/redo
    autosave.ts            debounced persistence
  scene/                   everything inside <Canvas>
    Viewport.tsx           canvas setup
    CameraRig.tsx          perspective / plan cameras + OrbitControls
    RoomShell.tsx          floor + walls, cutaway animation; garden ground and courtyard paving
    Roof.tsx               terracotta hip roof, ridge caps, chimney
    paintings.ts           generated landscape paintings and roof tiles
    ClippedBox.tsx         a wall piece that clips itself to the wall's current height
    wallParts.ts           frame, glass, leaf and handle boxes for each opening
    OpeningItem.tsx        one door/window: parts, hit box, swing arc, plan symbol
    FurnitureItem.tsx      one piece: transform, hover, selection
    useFurnitureDrag.ts    raycast-to-floor dragging
    useOpeningDrag.ts      raycast-to-wall dragging
    Measurements.tsx       CAD-style dimension lines
    ScreenLabel.tsx        HTML label pinned to a 3D point
    models/                parametric furniture, kitchen and bathroom fittings, structure (gallery, stairs) and garden models
  components/              toolbar, library, properties panel, style picker, SVG plan
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
10. **`scene/materials.ts` → `applyPalette`**: every mesh shares a handful of material objects, so recoloring the room is a few `color.set()` calls, with no re-render and no new geometry. The floor texture holds only the plank variation, and the material color tints it.
11. **`lib/layoutChecks.ts`**: once the data is clean, design rules turn into short functions. Overlap uses the separating axis test, and clearance is measured by casting 2D rays.
