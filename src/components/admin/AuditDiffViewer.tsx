import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Plus, Minus, Pencil } from "lucide-react";

type Json = unknown;

interface Props {
  before?: Json;
  after?: Json;
}

type DiffRow =
  | { kind: "added"; path: string; next: Json }
  | { kind: "removed"; path: string; prev: Json }
  | { kind: "changed"; path: string; prev: Json; next: Json };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function diff(before: Json, after: Json, base = ""): DiffRow[] {
  const rows: DiffRow[] = [];
  const a = (before ?? {}) as Record<string, unknown>;
  const b = (after ?? {}) as Record<string, unknown>;
  const keys = new Set<string>([...Object.keys(a || {}), ...Object.keys(b || {})]);

  for (const k of keys) {
    const path = base ? `${base}.${k}` : k;
    const av = a?.[k];
    const bv = b?.[k];
    const aHas = a && k in a;
    const bHas = b && k in b;

    if (!aHas && bHas) {
      rows.push({ kind: "added", path, next: bv as Json });
      continue;
    }
    if (aHas && !bHas) {
      rows.push({ kind: "removed", path, prev: av as Json });
      continue;
    }
    if (isObject(av) && isObject(bv)) {
      rows.push(...diff(av, bv, path));
      continue;
    }
    if (JSON.stringify(av) !== JSON.stringify(bv)) {
      rows.push({ kind: "changed", path, prev: av as Json, next: bv as Json });
    }
  }
  return rows.sort((x, y) => x.path.localeCompare(y.path));
}

const fmt = (v: Json) => {
  if (v === null || v === undefined) return <span className="text-muted-foreground italic">null</span>;
  if (typeof v === "string") return <span>"{v}"</span>;
  if (typeof v === "object") return <span className="font-mono">{JSON.stringify(v)}</span>;
  return <span>{String(v)}</span>;
};

export function AuditDiffViewer({ before, after }: Props) {
  const rows = useMemo(() => diff(before ?? {}, after ?? {}), [before, after]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 rounded-md border bg-muted/30">
        No field-level changes detected.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="px-3 py-2 border-b text-xs text-muted-foreground flex items-center gap-2">
        <span>{rows.length} field{rows.length === 1 ? "" : "s"} changed</span>
      </div>
      <ScrollArea className="max-h-[360px]">
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.path}`} className="px-3 py-2 text-sm flex items-start gap-3">
              <Badge
                variant="outline"
                className={
                  r.kind === "added"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : r.kind === "removed"
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                }
              >
                {r.kind === "added" && <Plus className="h-3 w-3 mr-1" />}
                {r.kind === "removed" && <Minus className="h-3 w-3 mr-1" />}
                {r.kind === "changed" && <Pencil className="h-3 w-3 mr-1" />}
                {r.kind}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-muted-foreground">{r.path}</div>
                <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                  {r.kind !== "added" && (
                    <span className="line-through text-destructive/90">{fmt((r as any).prev)}</span>
                  )}
                  {r.kind === "changed" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  {r.kind !== "removed" && (
                    <span className="text-emerald-700 dark:text-emerald-400">{fmt((r as any).next)}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

export default AuditDiffViewer;
