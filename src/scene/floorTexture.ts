import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/** Real-world size covered by one repeat of the texture, in meters. */
export const FLOOR_TILE_M = 1.2;

/** Deterministic pseudo-random numbers so the floor looks the same on every load. */
export function mulberry32(seed: number) {
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

function wrapTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Real-world size of one repeat of the grass and paving textures, in meters. */
export const GROUND_TILE_M = 2.4;

/** Mown lawn: soft mottling and short blade strokes, near-white so the palette's floor color tints it. */
export function createGrassTexture(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(11);
  ctx.fillStyle = "#e9eee0";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = rand() * size, y = rand() * size, r = 12 + rand() * 40;
    ctx.fillStyle = `hsla(${80 + rand() * 30}, 25%, ${rand() < 0.5 ? 70 : 96}%, 0.18)`;
    for (const [dx, dy] of [[0, 0], [-size, 0], [0, -size], [-size, -size]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 5000; i++) {
    const x = rand() * size, y = rand() * size;
    ctx.strokeStyle = `hsla(${75 + rand() * 35}, 30%, ${55 + rand() * 40}%, 0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand() * 2 - 1, y - 2 - rand() * 4);
    ctx.stroke();
  }
  return wrapTexture(canvas);
}

/**
 * Travertine paving in a random ashlar pattern: rows of slabs with staggered
 * joints, each a slightly different tone. Tinted by the material color.
 */
export function createPavingTexture(): CanvasTexture {
  const size = 1024;
  const rows = 6;
  const rowPx = size / rows;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(23);
  ctx.fillStyle = "#a99a86";
  ctx.fillRect(0, 0, size, size);
  for (let row = 0; row < rows; row++) {
    const y = row * rowPx;
    const offset = rand() * size;
    let run = 0;
    while (run < size) {
      let len = rowPx * (1 + rand() * 1.6);
      if (size - run - len < rowPx * 0.8) len = size - run;
      const fill = `hsl(${32 + rand() * 8}, ${10 + rand() * 10}%, ${86 + rand() * 10}%)`;
      for (const px of [offset + run, offset + run - size]) {
        ctx.fillStyle = fill;
        ctx.fillRect(px + 3, y + 3, len - 6, rowPx - 6);
        ctx.fillStyle = "rgba(120, 100, 80, 0.07)"; // travertine pores
        for (let k = 0; k < 14; k++) ctx.fillRect(px + 6 + rand() * (len - 12), y + 6 + rand() * (rowPx - 12), 2 + rand() * 6, 1.5);
      }
      run += len;
    }
  }
  return wrapTexture(canvas);
}
