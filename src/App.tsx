import { FurnitureLibrary } from "./components/FurnitureLibrary";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { StageOverlay } from "./components/StageOverlay";
import { Toolbar } from "./components/Toolbar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Viewport } from "./scene/Viewport";
import { useEditor } from "./store/editorStore";

export default function App() {
  useKeyboardShortcuts();
  const mode = useEditor((s) => s.mode);

  return (
    <div className={`app app--${mode}`}>
      <Toolbar />
      <FurnitureLibrary />
      <main className="stage" aria-label="3D room view">
        <Viewport />
        <StageOverlay />
      </main>
      <PropertiesPanel />
    </div>
  );
}
