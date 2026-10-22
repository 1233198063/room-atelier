import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { startAutosave } from "./store/autosave";

startAutosave();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
