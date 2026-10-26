import { ROOM_TEMPLATES } from "../lib/roomTemplates";
import { useEditor } from "./editorStore";

/** Only bundled templates can be loaded by URL. Unknown query values are ignored. */
export function addRoomFromLink(href: string): string | null {
  const url = new URL(href);
  const key = url.searchParams.get("room");
  if (!key || !Object.hasOwn(ROOM_TEMPLATES, key)) return null;
  const s = useEditor.getState();
  s.addRoom(ROOM_TEMPLATES[key]);
  s.setRoomDisplay("single");
  s.setView("perspective");
  url.searchParams.delete("room");
  return url.href;
}
