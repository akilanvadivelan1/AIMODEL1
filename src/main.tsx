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
  return isApp ? <App /> : <Landing />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
