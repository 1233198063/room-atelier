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
