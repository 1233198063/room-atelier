import type { ReactNode } from "react";
import type { FurnitureType, OpeningType } from "../../types";

export type ItemType = FurnitureType | OpeningType;

/** Simple line drawings for the library — side/front elevations, like an architect's sketch. */
const PATHS: Record<ItemType, ReactNode> = {
  bookcase: <><rect x="7" y="5" width="34" height="36" /><path d="M7 16h34M7 27h34M7 34h34M14 7v9M19 9v7M24 7l3 9M31 18v9M15 36h5M29 36h5" /></>,
  worktable: <><path d="M5 18h38v5H5zM9 23v18M39 23v18M9 34h30M15 13h9v5M29 10h7v8" /></>,
  armchair: <><rect x="11" y="7" width="26" height="24" rx="6" /><rect x="7" y="23" width="7" height="12" rx="3" /><rect x="34" y="23" width="7" height="12" rx="3" /><path d="M14 29h20v7H14zM12 36v5M36 36v5" /></>,
  ottoman: <><rect x="8" y="17" width="32" height="13" rx="5" /><path d="M12 30v8M36 30v8M8 24h32" /></>,
  rug: <><path d="M7 9h34v30H7zM11 13h26v22H11zM24 16l8 8-8 8-8-8zM9 5v4M15 5v4M21 5v4M27 5v4M33 5v4M39 5v4M9 39v4M15 39v4M21 39v4M27 39v4M33 39v4M39 39v4" /></>,
  curtains: <><path d="M5 7h38M9 8v32h9l-3-16 4-16M39 8v32h-9l3-16-4-16M13 8l-1 17v15M35 8l1 17v15" /></>,
  bed: (
    <>
      <rect x="6" y="11" width="4" height="25" rx="1" />
      <rect x="6" y="28" width="36" height="6" rx="1" />
      <path d="M10 28v-5h29a3 3 0 0 1 3 3v2" />
      <rect x="12.5" y="18" width="9" height="5" rx="2.5" />
      <path d="M8 34v4M40 34v4" />
    </>
  ),
  desk: (
    <>
      <rect x="5" y="15" width="38" height="4" rx="1" />
      <path d="M9 19v20M39 19v20" />
      <rect x="25" y="19" width="14" height="7" />
      <path d="M30 22.5h4" />
    </>
  ),
  chair: (
    <>
      <path d="M31 8v31" />
      <rect x="28" y="8" width="6" height="13" rx="1.5" />
      <rect x="12" y="24" width="22" height="3.5" rx="1" />
      <path d="M15 27.5V39" />
    </>
  ),
  cabinet: (
    <>
      <rect x="10" y="6" width="28" height="31" rx="1.5" />
      <path d="M24 6v31M21.5 19v5M26.5 19v5M12 37v3M36 37v3" />
    </>
  ),
  dresser: (
    <>
      <rect x="6" y="11" width="36" height="3" rx="1" />
      <rect x="8" y="14" width="32" height="21" />
      <path d="M24 14v21M8 21h32M8 28h32" />
      <path d="M14 17.5h4M30 17.5h4M14 24.5h4M30 24.5h4M14 31.5h4M30 31.5h4" />
      <path d="M11 35l-1 5M37 35l1 5" />
    </>
  ),
  plant: (
    <>
      <path d="M16 31h16l-2.5 10h-11z" />
      <path d="M24 31V16" />
      <path d="M24 24c-6.5 0-10-3.5-10-9 6.5 0 10 3.5 10 9z" />
      <path d="M24 19c0-6 3.5-10 9.5-10 0 6-3.5 10-9.5 10z" />
      <path d="M24 28c4.5 0 8-2.5 8-6.5-4.5 0-8 2.5-8 6.5z" />
    </>
  ),
  sofa: <><rect x="5" y="20" width="7" height="13" rx="3" /><rect x="36" y="20" width="7" height="13" rx="3" /><path d="M10 20v-6a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v6M12 27h24M12 33h24v-6M12 33v-6M24 27v6M9 33v4M39 33v4" /></>,
  table: <><path d="M5 17h38v4H5zM9 21v19M39 21v19M13 21v6h22v-6" /></>,
  lamp: <><path d="M17 7h14l4 11H13zM24 18v20M17 40h14M24 40v-2" /></>,
  easel: <><rect x="13" y="8" width="22" height="16" rx="1" /><path d="M16 20l4-5 4 3 4-6 5 8M24 4v4M19 24l-6 18M29 24l6 18M24 24v18M13 31h22" /></>,
  screen: <><path d="M5 8h38v3H5zM8 11v24h32V11M12 30l7-8 5 5 6-7 7 10M20 40h8" /></>,
  artwork: <><rect x="9" y="9" width="30" height="30" rx="1" /><rect x="14" y="14" width="20" height="20" /><path d="M14 29l6-6 4 4 4-5 6 7" /></>,
  gallery: <><path d="M4 22h40v4H4zM8 26v16M40 26v16M6 10h36M10 10v12M16 10v12M22 10v12M28 10v12M34 10v12M40 10v12" /></>,
  spiralStair: <><path d="M24 4v38M24 38c-9 0-14-2-14-5s5-5 14-5 14-2 14-5-5-5-14-5-14-2-14-5 5-5 14-5" /><path d="M10 33h14M24 23h14M10 13h14" /></>,
  stairs: <><path d="M6 41h36M6 41v-6h8v-6h8v-6h8v-6h8v-6h4v30M14 35h28M22 29h20M30 23h12M38 17h4" /></>,
  tree: <><path d="M24 42V25M24 31l-5-4M24 28l5-5" /><path d="M14 25a8 8 0 0 1 1-12 9 9 0 0 1 17-1 7 7 0 0 1 2 13z" /></>,
  shrub: <><path d="M5 38h38M8 38c-2-6 1-11 6-11 0-5 5-8 10-6 3-4 10-3 11 2 5 0 8 5 6 10 1 2 0 4-1 5" /><circle cx="15" cy="24" r="1.2" /><circle cx="24" cy="19" r="1.2" /><circle cx="33" cy="22" r="1.2" /><circle cx="20" cy="30" r="1.2" /><circle cx="30" cy="30" r="1.2" /></>,
  paving: <><path d="M5 14l38-4v24L5 38zM5 26l38-4M18 12.6v24M31 11.3v24M11 26v11M24 25v11M37 22.5v11" /></>,
  cornerSofa: <><path d="M6 10h36v28H30V24H6z" /><path d="M6 15h31v23M11 15v9M18.5 15v9M26 15v9M30 31h7" /></>,
  roundTable: <><ellipse cx="24" cy="15" rx="18" ry="4" /><path d="M24 19v16M14 40h20M18 40l3-5h6l3 5" /></>,
  tv: <><rect x="5" y="9" width="38" height="24" rx="1.5" /><path d="M9 13h30v16H9zM16 40h16M24 33v7" /></>,
  officeChair: <><rect x="15" y="5" width="18" height="15" rx="3" /><path d="M13 24h22M13 24v3h22v-3M24 20v4M24 27v8M13 39l11-4 11 4M10 24v-4M38 24v-4" /><circle cx="13" cy="41" r="1.5" /><circle cx="35" cy="41" r="1.5" /></>,
  fridge: <><rect x="12" y="4" width="24" height="40" rx="2" /><path d="M12 30h24M16 10v9M16 34h6" /></>,
  washer: <><rect x="9" y="5" width="30" height="38" rx="2" /><path d="M9 12h30M13 8.5h2M26 8.5h9" /><circle cx="24" cy="27.5" r="9.5" /><circle cx="24" cy="27.5" r="6" /></>,
  kitchenCounter: <><path d="M4 20h40v3H4zM6 23v18h36V23M18 23v18M30 23v18M10 28h4M22 28h4M34 28h4M11 20v-7c0-3 2-5 5-5s5 2 5 5" /><path d="M29 18h10" /></>,
  toilet: <><rect x="28" y="7" width="11" height="17" rx="1.5" /><path d="M9 24h30v2c0 6-4 10-10 11l1 5H17l1-6c-5-2-9-6-9-12z" /></>,
  vanity: <><path d="M7 21h34v3H7zM9 24v17h30V24M24 24v17M21 30v5M27 30v5M14 21c0-3 4-4 10-4s10 1 10 4M24 17v-6h5" /></>,
  bathtub: <><path d="M4 21h40M7 21v7c0 6 4 9 10 9h14c6 0 10-3 10-9v-7M13 37l-2 4M35 37l2 4M9 21V11a4 4 0 0 1 8 0v2" /></>,
  shower: <><path d="M8 42V8h32v34M8 42h32M28 8v6M22 14h12M23 18l-1 4M28 18v4M33 18l1 4M24 26l-1 3M32 26l1 3M15 20v18" /></>,
  door: (
    <>
      <path d="M6 41h36M13 41V7h22v34" />
      <rect x="16" y="10" width="16" height="31" />
      <path d="M28.5 25v3" />
    </>
  ),
  window: (
    <>
      <rect x="9" y="8" width="30" height="27" rx="1" />
      <path d="M24 8v27M9 21.5h30M6 38.5h36" />
    </>
  ),
};

export function FurnitureIcon({ type, size = 40 }: { type: ItemType; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[type]}
    </svg>
  );
}
