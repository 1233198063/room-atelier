import type { Dimensions, FurnitureColors, FurnitureType } from "../types";
import { furnitureColorFields } from "./furnitureColors";

type Rgb = [number, number, number];

const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hex = ([r, g, b]: Rgb) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/**
 * The main colors of a product photo, most common first.
 *
 * Shop photos usually stand the product on a plain backdrop, so the color
 * along the image border is taken as background and left out. The rest is
 * grouped with a few rounds of k-means; groups under 6% of the product are
 * dropped and near-identical ones merged.
 *
 * `data` is RGBA pixels, as from a canvas's getImageData.
 */
export function productColors(data: Uint8ClampedArray, width: number, height: number, k = 4): string[] {
  const at = (x: number, y: number): Rgb | null => {
    const i = (y * width + x) * 4;
    return data[i + 3] < 128 ? null : [data[i], data[i + 1], data[i + 2]];
  };

  // Background: the most common coarse color along the border.
  const border: Rgb[] = [];
  for (let x = 0; x < width; x++) for (const y of [0, height - 1]) { const p = at(x, y); if (p) border.push(p); }
  for (let y = 0; y < height; y++) for (const x of [0, width - 1]) { const p = at(x, y); if (p) border.push(p); }
  const buckets = new Map<number, Rgb[]>();
  for (const p of border) {
    const key = (p[0] >> 5) * 64 + (p[1] >> 5) * 8 + (p[2] >> 5);
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }
  const common = [...buckets.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const background = common.length > border.length * 0.3 ? mean(common) : null;

  const all: Rgb[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const p = at(x, y); if (p) all.push(p); }
  let pixels = background ? all.filter((p) => dist(p, background) > 38) : all;
  if (pixels.length < all.length * 0.04) pixels = all; // the product is the backdrop color, or there is no backdrop
  if (pixels.length === 0) return [];

  // k-means, seeded from the most spread-out pixels so results are repeatable.
  const centers: Rgb[] = [pixels[Math.floor(pixels.length / 2)]];
  while (centers.length < Math.min(k, pixels.length)) {
    let best = pixels[0], bestD = -1;
    for (let i = 0; i < pixels.length; i += 7) {
      const d = Math.min(...centers.map((c) => dist(c, pixels[i])));
      if (d > bestD) { bestD = d; best = pixels[i]; }
    }
    if (bestD < 1) break;
    centers.push(best);
  }
  let groups: Rgb[][] = [];
  for (let round = 0; round < 8; round++) {
    groups = centers.map(() => []);
    for (const p of pixels) {
      let j = 0;
      for (let c = 1; c < centers.length; c++) if (dist(p, centers[c]) < dist(p, centers[j])) j = c;
      groups[j].push(p);
    }
    groups.forEach((g, i) => { if (g.length) centers[i] = mean(g); });
  }

  const ranked = centers.map((c, i) => ({ color: c, share: groups[i].length / pixels.length }))
    .filter((c) => c.share >= 0.06).sort((a, b) => b.share - a.share);
  const kept: Rgb[] = [];
  for (const { color } of ranked) if (kept.every((c) => dist(c, color) > 28)) kept.push(color);
  return kept.map(hex);
}

function mean(points: Rgb[]): Rgb {
  const s = points.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]] as Rgb, [0, 0, 0] as Rgb);
  return [s[0] / points.length, s[1] / points.length, s[2] / points.length];
}

/**
 * Give a model its photo's colors: the main color to its first color role
 * (upholstery, body…), the second to its second role. Other roles keep the
 * room palette.
 */
export function colorsForModel(type: FurnitureType, dimensions: Dimensions, colors: string[]): FurnitureColors | undefined {
  const fields = furnitureColorFields({ id: "", type, name: "", position: [0, 0, 0], rotation: 0, dimensions });
  const out: FurnitureColors = {};
  fields.slice(0, 2).forEach((field, i) => { if (colors[i]) out[field.key] = colors[i]; });
  return Object.keys(out).length ? out : undefined;
}
