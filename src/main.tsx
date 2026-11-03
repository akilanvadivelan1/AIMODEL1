import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Landing } from "./landing/Landing";
import "./index.css";

/**
 * Lightweight hash-based routing (no router dependency):
 *   #/app  → the OmniDesk chatbot
 *   (else) → the marketing landing page
 */
function Root() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const isApp = route.startsWith("#/app");

  // Lock page scroll only for the fixed-layout chat app; let the landing scroll.
  useEffect(() => {
    document.documentElement.classList.toggle("app-view", isApp);
    if (!isApp) window.scrollTo(0, 0);
  }, [isApp]);

  return isApp ? <App /> : <Landing />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
