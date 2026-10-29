import { FurnitureLibrary } from "./components/FurnitureLibrary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { StageOverlay } from "./components/StageOverlay";
import { Toolbar } from "./components/Toolbar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Viewport } from "./scene/Viewport";
import { useT } from "./i18n";
import { useEditor } from "./store/editorStore";

export default function App() {
  useKeyboardShortcuts();
  const mode = useEditor((s) => s.mode);
  const t = useT();

  return (
    <div className={`app app--${mode}`}>
      <Toolbar />
      <FurnitureLibrary />
      <main className="stage" aria-label={t.stage.label}>
        <Viewport />
        <StageOverlay />
      </main>
      <PropertiesPanel />
    </div>
  );
}
