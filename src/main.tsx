import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { Landing } from "./landing/Landing";
import { Widget } from "./widget/Widget";
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

if (IS_WIDGET) document.documentElement.classList.add("widget-view");

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
  <React.StrictMode>{IS_WIDGET ? <Widget /> : <Root />}</React.StrictMode>
);
