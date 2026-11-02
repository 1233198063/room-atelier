import * as z from "zod/v4";

/**
 * What Claude reads from a floor plan image. Coordinates are 0–1000 fractions
 * of the image width (x) and height (y), so they don't depend on how large the
 * image is or how the API scales it. The browser turns them into pixels and
 * snaps them to the walls it finds itself.
 *
 * The browser imports only the types from this file.
 */

/** 0–1000; the range is stated in the prompt and clamped by the reader (structured outputs take a JSON Schema subset). */
const coord = z.number().int();

export const ROOM_KINDS = ["bedroom", "living", "dining", "kitchen", "bathroom", "closet", "laundry", "entry",
  "hallway", "balcony", "study", "storage", "garage", "outdoor", "other"] as const;

export const FloorPlanReadingSchema = z.object({
  units: z.enum(["imperial", "metric", "unknown"])
    .describe("How the plan writes lengths: feet and inches, metric, or no lengths at all"),
  rooms: z.array(z.object({
    name: z.string().nullable().describe("The room's label exactly as printed (e.g. RETREAT, 主卧), or null if unlabeled"),
    kind: z.enum(ROOM_KINDS),
    box: z.object({ left: coord, top: coord, right: coord, bottom: coord })
      .describe("The room's floor inside its walls, 0–1000 of image width (left/right) and height (top/bottom)"),
    sizeLabel: z.string().nullable()
      .describe("The size printed inside or under this room's label exactly as written (e.g. 11'X11', 12'6\" x 10', 3600×4200), else null"),
  })),
  dimensionLines: z.array(z.object({
    text: z.string().describe("The measurement exactly as written, e.g. 3600, 12'6\", 8400"),
    from: z.object({ x: coord, y: coord }),
    to: z.object({ x: coord, y: coord }),
  })).describe("Dimension lines drawn on the plan (with ticks or arrows at both ends), measuring a span"),
  openings: z.array(z.object({
    kind: z.enum(["door", "window"]),
    from: z.object({ x: coord, y: coord }),
    to: z.object({ x: coord, y: coord }),
  })).describe("Doors and windows in walls, each as the two ends of its opening along the wall"),
});

export type FloorPlanReading = z.infer<typeof FloorPlanReadingSchema>;
export type RoomKindName = (typeof ROOM_KINDS)[number];

export const FLOOR_PLAN_PROMPT = `This image is an architectural floor plan of a home. Read it and report its rooms, its printed sizes, and its doors and windows.

Coordinates: give every coordinate as an integer from 0 to 1000, as a fraction of the image: x from the left edge (0) to the right edge (1000), y from the top edge (0) to the bottom edge (1000).

Rooms:
- One entry per space: bedrooms, bathrooms, closets, laundry, entry, hallways, balconies, and so on. A closet, bath or laundry nook inside or beside another room is its own entry.
- An open-plan area with no walls between its parts (for example living, dining and kitchen labeled separately) gets one entry per labeled zone, with boxes that meet along the shared boundary.
- The box is the room's floor inside its walls: put each edge on the inner face of the wall, not on the wall's center or outer face. Boxes of different rooms must not overlap.
- For a room that is not a rectangle, give the box of its main rectangular part.
- name is the label printed in the room, copied exactly, in its original language. sizeLabel is the room size printed with it (such as 11'X11' or 3600×4200), copied exactly; null if the room has none.

Dimension lines: report the measurement lines drawn along or outside the walls (a line with ticks, dots or arrows at its ends and a number on it). from and to are the two ends of the measured span. Leave this empty if there are none.

Openings: report each door and window as the two ends of its opening along the wall.

units says how the plan writes lengths: imperial (feet and inches), metric, or unknown if no lengths are printed.

Report only what the plan shows; don't invent rooms, labels or sizes.`;
