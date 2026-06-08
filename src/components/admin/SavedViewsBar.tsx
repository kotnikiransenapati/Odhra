import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Plus, X, Check } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

export interface SavedView<TState> {
  id: string;
  name: string;
  state: TState;
}

interface SavedViewsBarProps<TState> {
  /** Stable key for namespacing in localStorage, e.g. 'admin.orders'. */
  storageKey: string;
  /** Current filter state to capture on "Save view". */
  currentState: TState;
  /** Apply a chosen view's state back into the parent. */
  onApply: (state: TState) => void;
  /** Optional shallow equality for active-view highlight. */
  isEqual?: (a: TState, b: TState) => boolean;
}

const defaultEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function SavedViewsBar<TState>({
  storageKey,
  currentState,
  onApply,
  isEqual = defaultEqual,
}: SavedViewsBarProps<TState>) {
  const [views, setViews] = useLocalStorage<SavedView<TState>[]>(
    `saved-views.${storageKey}`,
    []
  );
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    setViews([...views, { id, name: trimmed, state: currentState }]);
    setName('');
    setOpen(false);
    toast.success(`View "${trimmed}" saved`);
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setViews(views.filter((v) => v.id !== id));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Bookmark className="w-4 h-4 text-muted-foreground" />
      {views.length === 0 && (
        <span className="text-xs text-muted-foreground">No saved views yet</span>
      )}
      {views.map((v) => {
        const active = isEqual(v.state, currentState);
        return (
          <Badge
            key={v.id}
            variant={active ? 'default' : 'secondary'}
            className="cursor-pointer gap-1 pl-2 pr-1 py-1"
            onClick={() => onApply(v.state)}
          >
            {active && <Check className="w-3 h-3" />}
            {v.name}
            <button
              onClick={(e) => remove(v.id, e)}
              className="ml-1 opacity-60 hover:opacity-100"
              aria-label={`Delete view ${v.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1">
            <Plus className="w-3 h-3" /> Save view
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-2">
            <p className="text-sm font-medium">Save current filters</p>
            <Input
              placeholder="e.g. Pending COD (30d)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoFocus
            />
            <Button size="sm" className="w-full" onClick={save} disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
