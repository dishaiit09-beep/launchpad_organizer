import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./theme.css";
import "./crystal.css";
import "./mirror.css";
import { NeonFeedback } from "./NeonFeedback";
import { applyTheme, readTheme } from "./lib/theme";
import { applyMotion, readMotion } from "./lib/motion";
applyTheme(readTheme());
applyMotion(readMotion());
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <NeonFeedback />
  </React.StrictMode>,
);
