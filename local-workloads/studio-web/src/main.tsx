import { createRoot } from "react-dom/client";
import App from "./App";
import { SessionGate } from "./Collaboration";
import "./style.css";
import "./collaboration.css";
createRoot(document.getElementById("root")!).render(
  <SessionGate>
    <App />
  </SessionGate>,
);
