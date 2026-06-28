import { useWholesaler } from "@/hooks/useWholesaler";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Receipt, CreditCard, ArrowRight, Download } from "lucide-react";

export default function WholesaleDashboard() {
  const { account } = useWholesaler();
  const creditAvail = Math.max((account?.credit_limit ?? 0) - (account?.credit_used ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {account?.tier?.toUpperCase()} TIER
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            Welcome, {account?.business_name}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/install"><Download className="h-4 w-4 mr-2" /> Install workspace</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Credit limit" value={`₹${(account?.credit_limit ?? 0).toLocaleString("en-IN")}`} />
        <Stat label="Credit used" value={`₹${(account?.credit_used ?? 0).toLocaleString("en-IN")}`} />
        <Stat label="Credit available" value={`₹${creditAvail.toLocaleString("en-IN")}`} highlight />
        <Stat label="Payment terms" value={`${account?.payment_terms_days ?? 0} days`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <QuickCard
          icon={Package}
          title="Browse wholesale catalog"
          desc="Tier pricing, MOQ, pack sizes and live stock."
          to="/wholesale/catalog"
        />
        <QuickCard
          icon={ShoppingCart}
          title="Bulk cart & quick order"
          desc="Paste SKUs + quantity to build orders fast."
          to="/wholesale/cart"
        />
        <QuickCard
          icon={Receipt}
          title="Invoices"
          desc="Download GST-compliant invoices and statements."
          to="/wholesale/invoices"
        />
        <QuickCard
          icon={CreditCard}
          title="Payments"
          desc="Pay online or settle via NEFT/RTGS."
          to="/wholesale/payments"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function QuickCard({
  icon: Icon, title, desc, to,
}: { icon: any; title: string; desc: string; to: string }) {
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
          <Button asChild variant="link" className="px-0 h-auto mt-2">
            <Link to={to}>Open <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
