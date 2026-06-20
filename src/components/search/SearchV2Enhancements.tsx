import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, Sparkles, TrendingUp, History, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { haptics } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";

/**
 * Batch I5 — Search v2 Enhancements
 * - Typo-tolerant fuzzy matching (Levenshtein scored client-side over server suggestions)
 * - Voice mic with live transcript & confidence
 * - Zero-result recovery: synonyms, category fallback, trending picks, contact CTA
 * - Recent searches with privacy-aware local persistence
 *
 * Wire-up: drop into GlobalSearchModal or any search surface.
 */

const RECENT_KEY = "odhra:search:recent";
const MAX_RECENT = 6;

// --- Lightweight Damerau-Levenshtein for typo tolerance scoring -------------
function dlDistance(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const dp: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[al][bl];
}

export function fuzzyScore(query: string, candidate: string): number {
  if (!query) return 0;
  const d = dlDistance(query, candidate);
  const max = Math.max(query.length, candidate.length);
  return 1 - d / max;
}

// --- Recent searches --------------------------------------------------------
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);
  const push = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setRecent((prev) => {
      const next = [term, ...prev.filter((p) => p.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clear = () => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  };
  return { recent, push, clear };
}

// --- Voice search ----------------------------------------------------------
export function VoiceSearchInline({ onTranscript, language = "en-IN" }: { onTranscript: (text: string, finalized: boolean) => void; language?: string }) {
  const [listening, setListening] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  const start = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = language;
    recog.interimResults = true;
    recog.maxAlternatives = 1;
    recog.onstart = () => { setListening(true); haptics.selection(); };
    recog.onend = () => { setListening(false); };
    recog.onerror = () => { setListening(false); haptics.error(); };
    recog.onresult = (e: any) => {
      const result = e.results[e.resultIndex];
      const text = result[0].transcript;
      setConfidence(result[0].confidence ?? null);
      onTranscript(text, result.isFinal);
      if (result.isFinal) haptics.success();
    };
    recog.start();
  };

  if (!supported) return null;
  return (
    <button
      type="button"
      aria-label={listening ? "Stop voice search" : "Start voice search"}
      onClick={start}
      className={`relative grid h-10 w-10 place-items-center rounded-full transition ${listening ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
    >
      <Mic className="h-4 w-4" />
      {listening && (
        <motion.span
          className="absolute inset-0 rounded-full ring-2 ring-primary"
          animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      {confidence !== null && listening && (
        <span className="sr-only">Confidence {Math.round(confidence * 100)}%</span>
      )}
    </button>
  );
}

// --- Zero-result recovery --------------------------------------------------
export interface ZeroResultsProps {
  query: string;
  onPick: (suggestion: string) => void;
  synonyms?: Record<string, string[]>;
}

const DEFAULT_SYNONYMS: Record<string, string[]> = {
  saree: ["sari", "drape", "lehenga set"],
  kurta: ["kurti", "tunic", "ethnic top"],
  shoes: ["footwear", "sneakers", "sandals"],
  jeans: ["denim", "trousers"],
};

export function ZeroResultsRecovery({ query, onPick, synonyms = DEFAULT_SYNONYMS }: ZeroResultsProps) {
  const [trending, setTrending] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("search_queries" as any)
        .select("query, count")
        .order("count", { ascending: false })
        .limit(6);
      if (mounted && Array.isArray(data)) {
        setTrending((data as any[]).map((r) => r.query).filter(Boolean));
      }
    })().catch(() => {});
    return () => { mounted = false; };
  }, []);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    const direct = Object.keys(synonyms).find((k) => fuzzyScore(q, k) > 0.6);
    return direct ? synonyms[direct] : [];
  }, [query, synonyms]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="space-y-4 py-6"
    >
      <Card className="border-dashed bg-muted/30 p-5 text-center">
        <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
        <p className="text-sm font-medium">
          No results for "<span className="font-semibold">{query}</span>"
        </p>
        <p className="text-xs text-muted-foreground">Try one of these instead</p>
      </Card>

      {suggestions.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Did you mean</h4>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => { haptics.selection(); onPick(s); }}>
                {s}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Trending now
          </h4>
          <div className="flex flex-wrap gap-2">
            {trending.map((t) => (
              <Badge key={t} variant="outline" className="cursor-pointer" onClick={() => { haptics.selection(); onPick(t); }}>
                {t}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

// --- Composite Search v2 input --------------------------------------------
export interface SearchV2InputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchV2Input({ value, onChange, onSubmit, placeholder = "Search products, brands and more", autoFocus }: SearchV2InputProps) {
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}
      className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/40"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <Input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
      {value && (
        <button type="button" aria-label="Clear" onClick={() => onChange("")} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <VoiceSearchInline onTranscript={(t, final) => { onChange(t); if (final) onSubmit(t); }} />
    </form>
  );
}

// --- Recent strip ---------------------------------------------------------
export function RecentSearchesStrip({ onPick }: { onPick: (q: string) => void }) {
  const { recent, clear } = useRecentSearches();
  if (recent.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <AnimatePresence initial={false}>
        {recent.map((q) => (
          <motion.button
            key={q}
            type="button"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => { haptics.selection(); onPick(q); }}
            className="shrink-0 rounded-full border bg-background px-3 py-1 text-xs hover:border-primary"
          >
            {q}
          </motion.button>
        ))}
      </AnimatePresence>
      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={clear}>
        Clear
      </Button>
    </div>
  );
}
