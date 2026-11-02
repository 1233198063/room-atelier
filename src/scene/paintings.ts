import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32 } from "./floorTexture";

const cache = new Map<number, CanvasTexture>();

/** How many different paintings exist; pieces pick one from their size. */
export const PAINTING_VARIANTS = 4;

/**
 * A small Tuscan landscape in warm late-afternoon light: sky, rolling hills,
 * golden fields and a few cypresses. Deterministic per variant and shared
 * by every canvas, framed print and projection that shows it.
 */
export function paintingTexture(variant: number): CanvasTexture {
  const key = ((variant % PAINTING_VARIANTS) + PAINTING_VARIANTS) % PAINTING_VARIANTS;
  const cached = cache.get(key);
  if (cached) return cached;

  const w = 512, h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(101 + key * 17);

  const horizon = h * (0.38 + rand() * 0.12);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, ["#9fb7c6", "#c9b9a3", "#a8bfc8", "#d7b892"][key]);
  sky.addColorStop(1, "#f3dfb8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 4);
  // Sun glow low in the sky
  const sun = ctx.createRadialGradient(w * (0.2 + rand() * 0.6), horizon * 0.85, 4, w * 0.5, horizon, w * 0.5);
  sun.addColorStop(0, "rgba(255, 240, 205, 0.9)");
  sun.addColorStop(1, "rgba(255, 240, 205, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, horizon + 4);

  // Layered hills, from distant blue-grey to near ochre.
  const bands = ["#a7b0a6", "#8f9b78", "#b9a35f", "#c99a52", "#8a8a4e"];
  bands.forEach((color, i) => {
    const base = horizon + (h - horizon) * (i / bands.length) * 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const phase = rand() * Math.PI * 2, amp = 8 + rand() * 18;
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, base - Math.sin(x / (60 + i * 25) + phase) * amp - (i === 0 ? 10 : 0));
    ctx.lineTo(w, h);
    ctx.fill();
  });

  // Field rows: soft diagonal strokes on the nearest band.
  ctx.strokeStyle = "rgba(255, 230, 170, 0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const y = h * 0.78 + rand() * h * 0.2;
    ctx.beginPath();
    ctx.moveTo(rand() * w, y);
    ctx.lineTo(rand() * w, y + 6);
    ctx.stroke();
  }

  // Cypresses: dark flame shapes along a ridge.
  const count = 3 + Math.floor(rand() * 5);
  for (let i = 0; i < count; i++) {
    const x = w * (0.1 + rand() * 0.8), base = horizon + (h - horizon) * (0.25 + rand() * 0.3);
    const th = 30 + rand() * 50, tw = 5 + rand() * 4;
    ctx.fillStyle = "#3f4a2c";
    ctx.beginPath();
    ctx.moveTo(x, base - th);
    ctx.quadraticCurveTo(x + tw, base - th * 0.4, x + tw * 0.6, base);
    ctx.lineTo(x - tw * 0.6, base);
    ctx.quadraticCurveTo(x - tw, base - th * 0.4, x, base - th);
    ctx.fill();
  }

  // Painterly dabs to break up the flat fills.
  for (let i = 0; i < 900; i++) {
    const x = rand() * w, y = rand() * h;
    ctx.fillStyle = `rgba(${200 + rand() * 55}, ${170 + rand() * 60}, ${110 + rand() * 80}, 0.06)`;
    ctx.fillRect(x, y, 3 + rand() * 6, 2 + rand() * 3);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

let tiles: CanvasTexture | null = null;

/** Real-world size of one repeat of the roof-tile texture, in meters. */
export const ROOF_TILE_M = 1;

/**
 * Terracotta barrel tiles: courses running along the eaves (texture u), with
 * the slope running up the texture (v). Tones vary tile by tile, as on an old roof.
 */
export function roofTileTexture(): CanvasTexture {
  if (tiles) return tiles;
  const size = 512, courses = 4, columns = 5;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(5);
  const ch = size / courses, cw = size / columns;
  ctx.fillStyle = "#7a3f25";
  ctx.fillRect(0, 0, size, size);
  for (let r = 0; r < courses; r++) {
    for (let c = 0; c < columns; c++) {
      const x = c * cw + (r % 2) * cw * 0.5, y = r * ch;
      const light = 56 + rand() * 14;
      for (const px of [x, x - size]) {
        const g = ctx.createLinearGradient(px, 0, px + cw, 0);
        g.addColorStop(0, `hsl(18, 34%, ${light - 16}%)`);
        g.addColorStop(0.45, `hsl(22, 40%, ${light + 6}%)`);
        g.addColorStop(1, `hsl(16, 34%, ${light - 18}%)`);
        ctx.fillStyle = g;
        ctx.fillRect(px + 2, y + 2, cw - 4, ch - 3);
        ctx.fillStyle = "rgba(40, 20, 10, 0.35)"; // shadow under the course above
        ctx.fillRect(px + 2, y + ch - 7, cw - 4, 5);
      }
    }
  }
  tiles = new CanvasTexture(canvas);
  tiles.wrapS = tiles.wrapT = RepeatWrapping;
  tiles.colorSpace = SRGBColorSpace;
  tiles.anisotropy = 8;
  return tiles;
}
