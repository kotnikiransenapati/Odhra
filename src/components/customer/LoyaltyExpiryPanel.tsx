import { Link } from "react-router-dom";
import { AlertTriangle, Gift, TimerReset } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLoyaltyPoints } from "@/hooks/useLoyalty";

export function LoyaltyExpiryPanel() {
  const { data: loyalty } = useLoyaltyPoints();
  const expiringPoints = loyalty?.expiring_points ?? 0;
  const expiryDate = loyalty?.expiry_date ? new Date(loyalty.expiry_date) : null;

  if (!expiryDate || expiringPoints <= 0) return null;

  const daysLeft = Math.max(0, differenceInCalendarDays(expiryDate, new Date()));
  const urgencyClass = daysLeft <= 7
    ? "border-destructive/40 bg-destructive/5"
    : daysLeft <= 30
      ? "border-warning/40 bg-warning/5"
      : "border-accent/30 bg-accent/5";
  const progress = Math.max(0, Math.min(100, ((90 - Math.min(daysLeft, 90)) / 90) * 100));

  return (
    <Card className={`overflow-hidden ${urgencyClass}`} aria-label="Loyalty point expiry warning">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-background/70 border border-border/50 flex items-center justify-center shrink-0">
            {daysLeft <= 7 ? (
              <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden />
            ) : (
              <TimerReset className="w-5 h-5 text-accent" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">{expiringPoints.toLocaleString("en-IN")} points expiring</h2>
                <p className="text-xs text-muted-foreground">
                  Use them by {format(expiryDate, "dd MMM yyyy")} · {daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5 shrink-0">
                <Link to="/account/rewards?tab=redeem">
                  <Gift className="w-4 h-4" aria-hidden /> Redeem
                </Link>
              </Button>
            </div>
            <Progress value={progress} className="h-2 mt-4" aria-label="Point expiry urgency" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}