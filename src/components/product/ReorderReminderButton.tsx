import { useState } from "react";
import { CalendarClock, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpsertReorderReminder } from "@/hooks/useReorderReminders";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  productId: string;
  className?: string;
  size?: "sm" | "default";
}

const OPTIONS = [
  { label: "Every week", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every month", days: 30 },
  { label: "Every 2 months", days: 60 },
  { label: "Every 3 months", days: 90 },
];

export function ReorderReminderButton({ productId, className, size = "sm" }: Props) {
  const { user } = useAuth();
  const upsert = useUpsertReorderReminder();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Button asChild variant="outline" size={size} className={className}>
        <Link to={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}>
          <CalendarClock className="w-4 h-4 mr-1.5" /> Remind me
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className={className} disabled={upsert.isPending}>
          {upsert.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <CalendarClock className="w-4 h-4 mr-1.5" />
          )}
          Remind me <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.days}
            onClick={() => upsert.mutate({ product_id: productId, interval_days: opt.days })}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
