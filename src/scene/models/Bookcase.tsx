import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Open face is local +Z, with books above a bank of small storage drawers. */
export function Bookcase({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const t = 0.025, base = h > 1.3 ? Math.min(0.65, h * 0.28) : 0.06;
  const columns = Math.max(1, Math.round(w / 0.7)), bay = (w - t) / columns;
  const rows = Math.max(1, Math.round((h - base) / 0.38)), rise = (h - base - t) / rows;
  const covers = [M.throw, M.oakDark, M.linen, M.oak];
  return <group>
    <Box size={[w, h, 0.02]} position={[0, h / 2, -d / 2 + 0.01]} material={M.oakDark} />
    {Array.from({ length: columns + 1 }, (_, c) => <Box key={`side-${c}`} size={[t, h, d]}
      position={[-w / 2 + t / 2 + c * bay, h / 2, 0]} material={M.oak} />)}
    {Array.from({ length: rows + 1 }, (_, row) => <Box key={`shelf-${row}`} size={[w, t, d]}
      position={[0, base + row * rise, 0]} material={M.oak} />)}
    <Box size={[w, t, d + 0.015]} position={[0, h - t / 2, 0]} material={M.oak} />
    {Array.from({ length: columns }, (_, c) => {
      const cx = -w / 2 + t + bay * (c + 0.5);
      return <group key={c}>
        {base > 0.1 && Array.from({ length: 3 }, (_, i) => <group key={`drawer-${i}`}>
          <Box size={[bay - t * 1.8, base / 3 - 0.008, d - 0.02]} position={[cx, (i + 0.5) * base / 3, 0.005]} material={M.oak} />
          <Box size={[Math.min(0.12, bay * 0.25), 0.018, 0.016]} position={[cx, (i + 0.5) * base / 3, d / 2 + 0.003]} material={M.brass} />
        </group>)}
        {Array.from({ length: rows }, (_, row) => Array.from({ length: 6 }, (_, book) => {
          const bw = (bay - t * 2) / 8;
          const bh = rise * (0.55 + ((book + row * 2 + c) % 4) * 0.08);
          const x = cx - bay / 2 + t + bw * (book + 0.6);
          const y = base + row * rise + t / 2 + bh / 2;
          return <group key={`${row}-${book}`}>
            <Box size={[bw * 0.83, bh, d * 0.65]} position={[x, y, d * 0.08]} material={covers[(book + row + c) % covers.length]} />
            <Box size={[bw * 0.5, 0.009, 0.002]} position={[x, y + bh * 0.25, d * 0.405 + 0.002]} material={M.brass} />
          </group>;
        }))}
      </group>;
    })}
  </group>;
}
