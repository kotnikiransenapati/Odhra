import { Scale, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare, type CompareItem } from "@/contexts/CompareContext";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface Props {
  item: CompareItem;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function CompareButton({ item, className, size = "sm", variant = "outline" }: Props) {
  const { has, toggle, full } = useCompare();
  const added = has(item.id);

  return (
    <Button
      type="button"
      variant={added ? "secondary" : variant}
      size={size}
      className={cn(className, added && "border-accent/40")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        haptic(added ? "warning" : "selection");
        toggle(item);
      }}
      aria-pressed={added}
      aria-label={added ? "Remove from compare" : "Add to compare"}
      disabled={!added && full}
      title={!added && full ? "Compare list is full (max 4)" : undefined}
    >
      {added ? (
        <>
          <Check className="w-4 h-4 mr-1.5" /> Comparing
        </>
      ) : (
        <>
          <Scale className="w-4 h-4 mr-1.5" /> Compare
        </>
      )}
    </Button>
  );
}
