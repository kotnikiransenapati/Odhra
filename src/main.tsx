import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { setupLinkPreloading, preloadCriticalRoutes } from "@/lib/routePreloader";
import { initGlobalErrorReporter } from "@/lib/globalErrorReporter";
import { reportWebVitals } from "@/lib/webVitalsReporter";

// Initialize global error reporting before render
initGlobalErrorReporter();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

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

  // Report Core Web Vitals after idle
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(reportWebVitals);
  } else {
    setTimeout(reportWebVitals, 4000);
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
