import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Saves and restores window scroll position per location key.
 * - On POP (back/forward): restores prior scroll position.
 * - On PUSH/REPLACE: scrolls to top (default web behavior).
 */
const STORAGE_KEY = "odhra:scroll-positions";

function readMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export default function ScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();
  const prevKeyRef = useRef<string | null>(null);

  // Disable browser default to avoid conflicting with SPA lazy content
  useEffect(() => {
    const prev = window.history.scrollRestoration;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = prev;
      }
    };
  }, []);

  // Save current scroll before location changes
  useEffect(() => {
    const key = location.key || location.pathname;

    // Restore or reset on entry
    if (navType === "POP") {
      const map = readMap();
      const y = map[key];
      // wait for content paint
      requestAnimationFrame(() => {
        window.scrollTo(0, typeof y === "number" ? y : 0);
      });
    } else {
      window.scrollTo(0, 0);
    }

    prevKeyRef.current = key;

    const handleSave = () => {
      const map = readMap();
      map[key] = window.scrollY;
      writeMap(map);
    };

    window.addEventListener("scroll", handleSave, { passive: true });
    window.addEventListener("beforeunload", handleSave);

    return () => {
      handleSave();
      window.removeEventListener("scroll", handleSave);
      window.removeEventListener("beforeunload", handleSave);
    };
  }, [location.key, location.pathname, navType]);

  return null;
}
