import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupLinkPreloading, preloadCriticalRoutes } from "@/lib/routePreloader";

createRoot(document.getElementById("root")!).render(<App />);

// Setup performance optimizations after render
if (typeof window !== 'undefined') {
  // Setup link preloading on hover/touch
  setupLinkPreloading();
  
  // Preload critical routes during idle time
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadCriticalRoutes);
  } else {
    setTimeout(preloadCriticalRoutes, 2000);
  }
}

// Defer service worker registration to avoid render blocking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/registerSW.js').catch(() => {
      // SW registration failed, but app continues to work
    });
  });
}
