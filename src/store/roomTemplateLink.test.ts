import { beforeEach, describe, expect, it } from "vitest";
import { addRoomFromLink } from "./roomTemplateLink";
import { selectActiveRoom, selectLayout, useEditor } from "./editorStore";
import { SUNLIT_STUDY } from "../lib/roomTemplates";
import { parseLayout } from "../lib/persistence";

const initial = useEditor.getState();
beforeEach(() => useEditor.setState(initial, true));

describe("create a room from the reference link", () => {
  it("appends the furnished room, preserves existing rooms and consumes the link", () => {
    const original = useEditor.getState().rooms;
    const clean = addRoomFromLink("http://localhost:5173/?room=sunlit-study&other=keep#view");
    const s = useEditor.getState();
    expect(s.rooms).toHaveLength(original.length + 1);
    original.forEach((r, i) => expect(s.rooms[i]).toBe(r));
    expect(selectActiveRoom(s).name).toBe(SUNLIT_STUDY.name);
    expect(selectActiveRoom(s).furniture).toHaveLength(SUNLIT_STUDY.furniture.length);
    expect(s.roomDisplay).toBe("single");
    expect(s.view).toBe("perspective");
    expect(clean).toBe("http://localhost:5173/?other=keep#view");
    expect(addRoomFromLink(clean!)).toBeNull();
    expect(useEditor.getState().rooms).toHaveLength(original.length + 1);
    expect(parseLayout(JSON.parse(JSON.stringify(selectLayout(s))))).toEqual(selectLayout(s));
    s.undo();
    expect(useEditor.getState().rooms).toEqual(original);
    s.redo();
    expect(selectActiveRoom(useEditor.getState()).name).toBe(SUNLIT_STUDY.name);
  });

  it("makes independently editable copies with unique IDs", () => {
    const s = useEditor.getState();
    s.addRoom(SUNLIT_STUDY);
    const first = selectActiveRoom(useEditor.getState());
    s.addRoom(SUNLIT_STUDY);
    const second = selectActiveRoom(useEditor.getState());
    expect(second.name).toBe(`${first.name} 2`);
    const items = useEditor.getState().rooms.flatMap((r) => [...r.furniture, ...r.openings]);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    s.setFurnitureColors(second.furniture[0].id, { fabric: "#123456" });
    expect(first.furniture[0].colors?.fabric).toBe(SUNLIT_STUDY.furniture[0].colors?.fabric);
    expect(selectActiveRoom(useEditor.getState()).furniture[0].colors?.fabric).toBe("#123456");
  });

  it.each(["missing", "constructor", "__proto__", "https://untrusted.invalid/room.json"])("ignores unrecognized template %s", (key) => {
    expect(addRoomFromLink(`http://localhost:5173/?room=${encodeURIComponent(key)}`)).toBeNull();
    expect(useEditor.getState().rooms).toBe(initial.rooms);
  });
});
