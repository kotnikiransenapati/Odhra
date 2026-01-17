import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Defer service worker registration to avoid render blocking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/registerSW.js').catch(() => {
      // SW registration failed, but app continues to work
    });
  });
}
