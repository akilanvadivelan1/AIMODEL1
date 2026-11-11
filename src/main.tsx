import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { Landing } from "./landing/Landing";
import { Widget } from "./widget/Widget";
import { Overlay } from "./agent/Overlay";
import { isTauri } from "./lib/backend";
import "./index.css";

/**
 * Lightweight hash-based routing (no router dependency):
 *   #/app  opens the OmniDesk chatbot
 *   (else) shows the marketing landing page
 *
 * Inside the Mac app there are two windows that share this same page:
 *   "main"   is the full app
 *   "widget" is the small top right quick-search window
 *   "overlay" is the see-through layer used for screen control
 * Rust gives each window a label, and we pick the screen from it.
 */

// In the desktop (Tauri) build, skip the marketing site and open the app.
const IS_DESKTOP = import.meta.env.VITE_OMNIDESK_DESKTOP === "1";

function windowLabel(): string {
  if (!isTauri) return "";
  try {
    return getCurrentWindow().label;
  } catch {
    return "";
  }
}

// "#/widget-preview" lets the widget be previewed in a normal browser tab.
const IS_WIDGET =
  windowLabel() === "widget" || window.location.hash === "#/widget-preview";

// The screen control layer: a see-through window over the whole screen.
const IS_OVERLAY = windowLabel() === "overlay";

if (IS_WIDGET) document.documentElement.classList.add("widget-view");
if (IS_OVERLAY) document.documentElement.classList.add("overlay-view");

function Root() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isApp = IS_DESKTOP || route.startsWith("#/app");

  // Lock page scroll only for the fixed-layout chat app. Let the landing scroll.
  useEffect(() => {
    document.documentElement.classList.toggle("app-view", isApp);
    if (!isApp) window.scrollTo(0, 0);
  }, [isApp]);

  return isApp ? <App /> : <Landing />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{IS_OVERLAY ? <Overlay /> : IS_WIDGET ? <Widget /> : <Root />}</React.StrictMode>
);
