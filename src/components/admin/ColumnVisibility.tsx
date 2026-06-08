import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Columns3 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface ColumnDef {
  key: string;
  label: string;
  /** Columns marked required cannot be hidden. */
  required?: boolean;
}

interface ColumnVisibilityProps {
  storageKey: string;
  columns: ColumnDef[];
}

/**
 * Persistent column-visibility dropdown. Returns the visibility map
 * via the `useColumnVisibility` hook in the parent, while this
 * component renders only the trigger UI.
 */
export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const initial = Object.fromEntries(columns.map((c) => [c.key, true])) as Record<string, boolean>;
  const [visible, setVisible] = useLocalStorage<Record<string, boolean>>(
    `column-visibility.${storageKey}`,
    initial
  );
  const isVisible = (key: string) => visible[key] !== false;
  const toggle = (key: string) => setVisible({ ...visible, [key]: !isVisible(key) });
  return { isVisible, toggle, visible };
}

export function ColumnVisibility({ storageKey, columns }: ColumnVisibilityProps) {
  const { isVisible, toggle } = useColumnVisibility(storageKey, columns);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Columns3 className="w-4 h-4" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.key}
            checked={isVisible(c.key)}
            disabled={c.required}
            onCheckedChange={() => !c.required && toggle(c.key)}
            onSelect={(e) => e.preventDefault()}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
