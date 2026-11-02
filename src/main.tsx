import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startI18n } from "./i18n";
import { saveNow, startAutosave } from "./store/autosave";
import { addRoomFromLink } from "./store/roomTemplateLink";

startI18n();
startAutosave();

// Consume the explicit create-room link once, outside StrictMode's effect replay.
const cleanRoomUrl = addRoomFromLink(window.location.href);
if (cleanRoomUrl) {
  window.history.replaceState(window.history.state, "", cleanRoomUrl);
  saveNow();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
