import { parseLayout, saveLayout, STORAGE_KEY } from "../lib/persistence";
import type { Layout } from "../types";
import { selectLayout, useEditor } from "./editorStore";

const DEBOUNCE_MS = 500;
let timer: ReturnType<typeof setTimeout> | undefined;
/** True while applying another tab's save, so it isn't written straight back. */
let adopting = false;

/** Write the current layout to localStorage right away. */
export function saveNow() {
  clearTimeout(timer);
  timer = undefined;
  const state = useEditor.getState();
  if (saveLayout(selectLayout(state))) state.markSaved(Date.now());
  else state.markSaveError();
}

/**
 * Watch the document and persist it shortly after it stops changing.
 * Dragging fires dozens of updates per second, so writes are debounced.
 */
export function startAutosave(): () => void {
  const unsubscribe = useEditor.subscribe((state, prev) => {
    if (adopting) return;
    const docChanged =
      state.rooms !== prev.rooms ||
      state.activeRoomId !== prev.activeRoomId ||
      state.roomDisplay !== prev.roomDisplay ||
      state.wallView !== prev.wallView ||
      state.projectName !== prev.projectName;
    if (!docChanged) return;
    if (state.saveStatus !== "unsaved") useEditor.setState({ saveStatus: "unsaved" });
    clearTimeout(timer);
    timer = setTimeout(saveNow, DEBOUNCE_MS);
  });

  // Every tab saves its whole copy, so a tab left open in the background would
  // overwrite newer edits from another tab. Adopt their saves as they land.
  const onStorage = (e: StorageEvent) => {
    // A pending local edit is newer; it saves shortly and the other tab adopts it in turn.
    if (e.key !== STORAGE_KEY || !e.newValue || timer !== undefined) return;
    let layout: Layout | null = null;
    try {
      layout = parseLayout(JSON.parse(e.newValue));
    } catch { /* Ignore unreadable writes; keep this tab's copy. */ }
    if (!layout) return;
    adopting = true;
    try {
      useEditor.getState().adoptLayout(layout);
    } finally {
      adopting = false;
    }
    useEditor.getState().markSaved(Date.now());
  };

  const flush = () => {
    if (timer !== undefined) saveNow();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("beforeunload", flush);

  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("beforeunload", flush);
    flush();
  };
}
