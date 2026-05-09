import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerPwa } from "./systems/pwa";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

window.__GOF2_PWA_READY__ = registerPwa().catch((error) => {
  console.warn("GOF2 PWA registration failed.", error);
  return undefined;
});
