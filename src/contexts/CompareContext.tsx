import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "compare:v1";
const MAX_ITEMS = 4;

export interface CompareItem {
  id: string;
  slug: string | null;
  title: string;
  image: string | null;
  price: number;
}

interface CompareContextValue {
  items: CompareItem[];
  count: number;
  has: (id: string) => boolean;
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  toggle: (item: CompareItem) => void;
  clear: () => void;
  full: boolean;
}

const Ctx = createContext<CompareContextValue | undefined>(undefined);

function readStorage(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>(() => readStorage());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const add = useCallback(
    (item: CompareItem) => {
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        if (prev.length >= MAX_ITEMS) {
          toast.error(`You can compare up to ${MAX_ITEMS} products`);
          return prev;
        }
        return [...prev, item];
      });
    },
    []
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggle = useCallback(
    (item: CompareItem) => {
      setItems((prev) => {
        if (prev.some((i) => i.id === item.id)) {
          return prev.filter((i) => i.id !== item.id);
        }
        if (prev.length >= MAX_ITEMS) {
          toast.error(`You can compare up to ${MAX_ITEMS} products`);
          return prev;
        }
        return [...prev, item];
      });
    },
    []
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      count: items.length,
      has,
      add,
      remove,
      toggle,
      clear,
      full: items.length >= MAX_ITEMS,
    }),
    [items, has, add, remove, toggle, clear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCompare must be used inside CompareProvider");
  return v;
}
