import { useEffect } from "react";
import { getLengthUnit } from "../i18n";
import { nudgeSteps } from "../lib/units";
import { runsAlongX } from "../lib/openings";
import { saveNow } from "../store/autosave";
import { selectActiveRoom, useEditor } from "../store/editorStore";

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1], // toward the back wall
  ArrowDown: [0, 1],
};

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useEditor.getState();
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && key === "s") {
        e.preventDefault();
        saveNow();
        return;
      }
      // A dialog has the keyboard to itself.
      if (document.querySelector('[aria-modal="true"]')) return;
      // Leave typing alone — inputs handle their own keys (including their own undo).
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (mod) {
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) s.redo();
          else s.undo();
        } else if (key === "y") {
          e.preventDefault();
          s.redo();
        } else if (key === "d" && s.selectedId && s.mode === "edit") {
          e.preventDefault();
          s.duplicateSelection();
        }
        return;
      }
      if (e.altKey) return;

      switch (key) {
        case "escape":
          if (s.mode === "preview") s.setMode("edit");
          else s.select(null);
          return;
        case "1":
          s.setView("perspective");
          return;
        case "2":
          s.setView("top");
          return;
        case "p":
          s.setMode(s.mode === "edit" ? "preview" : "edit");
          return;
        case "f":
          s.resetCamera();
          return;
      }

      // Everything below edits the selection.
      if (!s.selectedId || s.mode !== "edit") return;
      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        s.removeSelection();
        return;
      }

      const opening = selectActiveRoom(s).openings.find((o) => o.id === s.selectedId);
      if (opening) {
        if (key === "r" && opening.type === "door") {
          s.updateOpening(opening.id, { hinge: opening.hinge === "start" ? "end" : "start" });
        } else if (e.key in NUDGE) {
          // Openings slide along their wall: ←/→ on the back and front walls, ↑/↓ on the side walls.
          e.preventDefault();
          const [dx, dz] = NUDGE[e.key];
          const delta = runsAlongX(opening.wall) ? dx : dz;
          if (delta === 0) return;
          const step = nudgeSteps(getLengthUnit())[e.shiftKey ? 1 : 0];
          s.updateOpening(opening.id, { offset: opening.offset + delta * step }, { coalesceKey: `nudge:${opening.id}` });
        }
        return;
      }

      const selected = selectActiveRoom(s).furniture.find((f) => f.id === s.selectedId);
      if (!selected) return;
      if (key === "r") {
        s.updateFurniture(selected.id, { rotation: selected.rotation + (e.shiftKey ? 90 : -90) });
      } else if (e.key in NUDGE) {
        e.preventDefault();
        const [dx, dz] = NUDGE[e.key];
        const step = nudgeSteps(getLengthUnit())[e.shiftKey ? 1 : 0];
        const [x, y, z] = selected.position;
        s.updateFurniture(
          selected.id,
          { position: [x + dx * step, y, z + dz * step] },
          { coalesceKey: `nudge:${selected.id}` }, // a burst of nudges = one undo step
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
