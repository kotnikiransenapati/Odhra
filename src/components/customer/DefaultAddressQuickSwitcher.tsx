import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, CheckCircle2, Pencil, Star } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

export function DefaultAddressQuickSwitcher() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase.from("profiles").select("address_book").eq("id", user.id).maybeSingle();
    setAddresses(((data?.address_book as unknown) as Address[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const setDefault = async (id: string) => {
    if (!user?.id) return;
    setSaving(id);
    const next = addresses.map(a => ({ ...a, is_default: a.id === id }));
    const { error } = await supabase.from("profiles")
      .update({ address_book: JSON.parse(JSON.stringify(next)) })
      .eq("id", user.id);
    setSaving(null);
    if (error) { haptic("error"); toast.error(error.message); return; }
    haptic("success");
    setAddresses(next);
    toast.success("Default address updated");
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" /> Delivery Addresses
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/addresses"><Pencil className="w-3.5 h-3.5" /> Manage</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[0,1].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No saved addresses</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/addresses">Add address</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.slice(0, 4).map((a, i) => (
              <motion.button
                key={a.id}
                onClick={() => !a.is_default && setDefault(a.id)}
                disabled={a.is_default || saving === a.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                className={`w-full text-left flex items-start gap-3 rounded-xl border p-3 transition-all ${
                  a.is_default
                    ? "border-accent/40 bg-accent/5 cursor-default"
                    : "border-border/40 bg-secondary/20 hover:bg-secondary/40 cursor-pointer"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.is_default ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground'}`}>
                  {a.is_default ? <CheckCircle2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{a.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.full_name}</p>
                    {a.is_default && (
                      <Badge className="bg-accent text-accent-foreground text-[10px] gap-1">
                        <Star className="w-3 h-3 fill-current" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {a.address_line1}, {a.city}, {a.state} — {a.pincode}
                  </p>
                </div>
              </motion.button>
            ))}
            {addresses.length > 4 && (
              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <Link to="/addresses">View all {addresses.length} addresses</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DefaultAddressQuickSwitcher;
