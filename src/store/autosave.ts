import { saveLayout } from "../lib/persistence";
import { selectLayout, useEditor } from "./editorStore";

const DEBOUNCE_MS = 500;
let timer: ReturnType<typeof setTimeout> | undefined;

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
    const docChanged =
      state.room !== prev.room ||
      state.furniture !== prev.furniture ||
      state.openings !== prev.openings ||
      state.projectName !== prev.projectName;
    if (!docChanged) return;
    if (state.saveStatus !== "unsaved") useEditor.setState({ saveStatus: "unsaved" });
    clearTimeout(timer);
    timer = setTimeout(saveNow, DEBOUNCE_MS);
  });

  const flush = () => {
    if (timer !== undefined) saveNow();
  };
  window.addEventListener("beforeunload", flush);

  return () => {
    unsubscribe();
    window.removeEventListener("beforeunload", flush);
    flush();
  };
}
