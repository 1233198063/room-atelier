import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/** Real-world size covered by one repeat of the texture, in meters. */
export const FLOOR_TILE_M = 1.2;

/** Deterministic pseudo-random numbers so the floor looks the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Paint floorboards onto a canvas and use it as a texture.
 * Six 20 cm boards per 1.2 m tile, with staggered joints and faint grain.
 *
 * The boards are drawn in near-white: only the *variation* lives in the
 * texture. Three.js multiplies a texture by the material's color, so the
 * palette's floor color tints it — one texture serves every palette.
 */
export function createFloorTexture(): CanvasTexture {
  const size = 1024;
  const boards = 6;
  const boardPx = size / boards;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(7);

  for (let row = 0; row < boards; row++) {
    const y = row * boardPx;
    // Each row is a run of planks that exactly fills the tile width, shifted by a random
    // offset and drawn twice (x and x − size) so the texture wraps without a seam.
    const offset = rand() * size;
    let run = 0;
    while (run < size) {
      let len = size * (0.4 + rand() * 0.45);
      if (size - run - len < size * 0.2) len = size - run;
      const x = offset + run;
      const fill = `hsl(30, ${6 + rand() * 6}%, ${88 + rand() * 10}%)`;
      const grain = Array.from({ length: 7 }, () => [6 + rand() * (boardPx - 12), rand() * 6 - 3, rand() * 6 - 3]);

      for (const px of [x, x - size]) {
        ctx.fillStyle = fill;
        ctx.fillRect(px, y, len, boardPx);
        ctx.strokeStyle = "rgba(90, 70, 50, 0.08)";
        ctx.lineWidth = 1.5;
        for (const [gy, a, b] of grain) {
          ctx.beginPath();
          ctx.moveTo(px, y + gy);
          ctx.bezierCurveTo(px + len * 0.3, y + gy + a, px + len * 0.7, y + gy + b, px + len, y + gy);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(80, 60, 40, 0.22)"; // end joint
        ctx.fillRect(px, y, 2, boardPx);
      }
      run += len;
    }
    // long seam between rows
    ctx.fillStyle = "rgba(80, 60, 40, 0.25)";
    ctx.fillRect(0, y, size, 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
