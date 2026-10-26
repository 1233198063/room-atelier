import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLayout, STORAGE_KEY } from "../lib/persistence";
import { startAutosave } from "./autosave";
import { selectLayout, useEditor } from "./editorStore";

const initial = useEditor.getState();
let stop: (() => void) | undefined;
let entries: Map<string, string>;

beforeEach(() => {
  vi.useFakeTimers();
  useEditor.setState(initial, true);
  entries = new Map();
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value) },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  });
  stop = startAutosave();
});

afterEach(() => {
  stop?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useEditor.setState(initial, true);
});

describe("multi-room autosave", () => {
  it("saves and reloads an individual furniture color edit and reset", () => {
    const id = useEditor.getState().addFurniture("chair");
    vi.advanceTimersByTime(500);
    useEditor.getState().setFurnitureColors(id, { wood: "#123abc", fabric: "#884422" });
    expect(useEditor.getState().saveStatus).toBe("unsaved");
    vi.advanceTimersByTime(500);
    expect(loadLayout()?.rooms[0].furniture.find((f) => f.id === id)?.colors).toEqual({ wood: "#123abc", fabric: "#884422" });
    useEditor.getState().resetFurnitureColors(id);
    vi.advanceTimersByTime(500);
    expect(loadLayout()?.rooms[0].furniture.find((f) => f.id === id)?.colors).toBeUndefined();
  });

  it("debounces room placement, names, content, selection and display mode together", () => {
    const id = useEditor.getState().addRoom();
    useEditor.getState().addFurniture("desk");
    useEditor.getState().updateRoom(id, { position: [-3, 2], rotation: 90, name: "Study" });
    useEditor.getState().setRoomDisplay("all");
    expect(useEditor.getState().saveStatus).toBe("unsaved");
    expect(entries.has(STORAGE_KEY)).toBe(false);
    vi.advanceTimersByTime(500);
    expect(loadLayout()).toEqual(selectLayout(useEditor.getState()));
    expect(useEditor.getState().saveStatus).toBe("saved");
  });

  it("flushes pending room deletion when the subscriber stops", () => {
    const id = useEditor.getState().addRoom();
    vi.advanceTimersByTime(500);
    useEditor.getState().removeRoom(id);
    stop?.();
    stop = undefined;
    expect(loadLayout()?.rooms).toHaveLength(1);
    expect(loadLayout()).toEqual(selectLayout(useEditor.getState()));
  });
});
