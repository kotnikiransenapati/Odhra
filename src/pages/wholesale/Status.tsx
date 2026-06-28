import { Link, Navigate } from "react-router-dom";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, XCircle, PauseCircle } from "lucide-react";

const META = {
  pending: { icon: Clock, color: "text-amber-500", title: "Application received", desc: "Our B2B team will review your details within 1 business day." },
  under_review: { icon: Clock, color: "text-amber-500", title: "Under review", desc: "We may reach out for additional KYC documents." },
  approved: { icon: CheckCircle2, color: "text-emerald-500", title: "Approved", desc: "Welcome aboard. You now have access to the wholesale portal." },
  rejected: { icon: XCircle, color: "text-destructive", title: "Application rejected", desc: "Please contact support if you'd like to reapply." },
  suspended: { icon: PauseCircle, color: "text-destructive", title: "Account suspended", desc: "Please reach out to your account manager." },
} as const;

export default function WholesaleStatus() {
  const { loading, account } = useWholesaler();

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) return <Navigate to="/wholesale/apply" replace />;
  if (account.status === "approved") return <Navigate to="/wholesale" replace />;

  const m = META[account.status];
  const Icon = m.icon;

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 py-12">
      <Card className="max-w-lg w-full p-8 text-center space-y-4">
        <Icon className={`h-12 w-12 mx-auto ${m.color}`} />
        <h1 className="text-2xl font-semibold">{m.title}</h1>
        <p className="text-muted-foreground">{m.desc}</p>
        {account.rejection_reason && account.status === "rejected" && (
          <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
            Reason: {account.rejection_reason}
          </p>
        )}
        <div className="text-xs text-muted-foreground border-t border-border pt-4 mt-4 text-left">
          <div className="flex justify-between py-1">
            <span>Business</span><span className="font-medium">{account.business_name}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Submitted</span><span className="font-medium">{new Date(account.created_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tier</span><span className="font-medium capitalize">{account.tier}</span>
          </div>
        </div>
        <div className="pt-2">
          <Button asChild variant="outline"><Link to="/">Back to store</Link></Button>
        </div>
      </Card>
    </div>
  );
}
