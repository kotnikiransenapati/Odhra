import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useWholesaler } from "@/hooks/useWholesaler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, FileCheck2, MapPin, ShieldCheck } from "lucide-react";

const STEPS = ["Business", "KYC", "Address", "Review"] as const;

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const schema = z.object({
  business_name: z.string().trim().min(2).max(120),
  legal_name: z.string().trim().max(120).optional().or(z.literal("")),
  business_type: z.string().trim().max(60).optional().or(z.literal("")),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_RE, "Invalid GSTIN").optional().or(z.literal("")),
  pan: z.string().trim().toUpperCase().regex(PAN_RE, "Invalid PAN").optional().or(z.literal("")),
  contact_name: z.string().trim().min(2).max(80),
  contact_phone: z.string().trim().regex(PHONE_RE, "Enter a valid 10-digit mobile"),
  contact_email: z.string().trim().email().max(160),
  billing_address: z.object({
    line1: z.string().trim().min(3).max(120),
    line2: z.string().trim().max(120).optional().or(z.literal("")),
    city: z.string().trim().min(2).max(60),
    state: z.string().trim().min(2).max(60),
    pincode: z.string().trim().regex(/^\d{6}$/, "6-digit pincode"),
  }),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
type FormShape = z.infer<typeof schema>;

export default function WholesaleApply() {
  const { loading, userId, account, refresh } = useWholesaler();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormShape>({
    business_name: "",
    legal_name: "",
    business_type: "",
    gstin: "",
    pan: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    billing_address: { line1: "", line2: "", city: "", state: "", pincode: "" },
    notes: "",
  });

  useEffect(() => {
    if (!loading && !userId) nav("/auth?redirect=/wholesale/apply", { replace: true });
    if (account) nav("/wholesale/status", { replace: true });
  }, [loading, userId, account, nav]);

  const upd = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const updAddr = (k: keyof FormShape["billing_address"], v: string) =>
    setForm((f) => ({ ...f, billing_address: { ...f.billing_address, [k]: v } }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please fix the form");
      return;
    }
    if (!userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("wholesaler_accounts" as any).insert({
        user_id: userId,
        business_name: parsed.data.business_name,
        legal_name: parsed.data.legal_name || null,
        business_type: parsed.data.business_type || null,
        gstin: parsed.data.gstin || null,
        pan: parsed.data.pan || null,
        contact_name: parsed.data.contact_name,
        contact_phone: parsed.data.contact_phone,
        contact_email: parsed.data.contact_email,
        billing_address: parsed.data.billing_address,
        shipping_addresses: [parsed.data.billing_address],
        notes: parsed.data.notes || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Application submitted. Our team will review shortly.");
      await refresh();
      nav("/wholesale/status", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Wholesale Program
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-2">Apply for a B2B account</h1>
          <p className="text-muted-foreground mt-2">
            Unlock tier pricing, bulk ordering, credit terms and a dedicated installable workspace.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <div className="ml-2 text-xs font-medium hidden sm:block">{s}</div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-3" />}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8 space-y-5">
          {step === 0 && (
            <>
              <SectionTitle icon={<Building2 className="h-4 w-4" />} title="Business details" />
              <Field label="Business name *">
                <Input value={form.business_name} onChange={(e) => upd("business_name", e.target.value)} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Legal name">
                  <Input value={form.legal_name} onChange={(e) => upd("legal_name", e.target.value)} />
                </Field>
                <Field label="Business type">
                  <Input
                    placeholder="Retailer / Distributor / HoReCa"
                    value={form.business_type}
                    onChange={(e) => upd("business_type", e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Contact name *">
                  <Input value={form.contact_name} onChange={(e) => upd("contact_name", e.target.value)} />
                </Field>
                <Field label="Contact phone *">
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    value={form.contact_phone}
                    onChange={(e) => upd("contact_phone", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
              </div>
              <Field label="Contact email *">
                <Input type="email" value={form.contact_email} onChange={(e) => upd("contact_email", e.target.value)} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <SectionTitle icon={<FileCheck2 className="h-4 w-4" />} title="KYC (optional but recommended)" />
              <p className="text-xs text-muted-foreground">
                GSTIN and PAN help us approve faster and enable GST-compliant invoices.
              </p>
              <Field label="GSTIN">
                <Input
                  value={form.gstin}
                  onChange={(e) => upd("gstin", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                />
              </Field>
              <Field label="PAN">
                <Input
                  value={form.pan}
                  onChange={(e) => upd("pan", e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                You can upload documents (GST certificate, PAN, trade license, cancelled cheque) after submitting.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle icon={<MapPin className="h-4 w-4" />} title="Billing address" />
              <Field label="Address line 1 *">
                <Input
                  value={form.billing_address.line1}
                  onChange={(e) => updAddr("line1", e.target.value)}
                />
              </Field>
              <Field label="Address line 2">
                <Input
                  value={form.billing_address.line2 ?? ""}
                  onChange={(e) => updAddr("line2", e.target.value)}
                />
              </Field>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="City *">
                  <Input value={form.billing_address.city} onChange={(e) => updAddr("city", e.target.value)} />
                </Field>
                <Field label="State *">
                  <Input value={form.billing_address.state} onChange={(e) => updAddr("state", e.target.value)} />
                </Field>
                <Field label="Pincode *">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={form.billing_address.pincode}
                    onChange={(e) => updAddr("pincode", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
              </div>
              <Field label="Anything we should know?">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => upd("notes", e.target.value)}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle icon={<ShieldCheck className="h-4 w-4" />} title="Review & submit" />
              <ReviewRow k="Business" v={form.business_name} />
              <ReviewRow k="Contact" v={`${form.contact_name} • ${form.contact_phone} • ${form.contact_email}`} />
              <ReviewRow k="GSTIN / PAN" v={`${form.gstin || "—"} / ${form.pan || "—"}`} />
              <ReviewRow
                k="Billing"
                v={`${form.billing_address.line1}, ${form.billing_address.city}, ${form.billing_address.state} - ${form.billing_address.pincode}`}
              />
              <p className="text-xs text-muted-foreground">
                Submitting creates a pending application. You'll get an email and an in-portal update once reviewed.
              </p>
            </>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit application
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      {icon}
      {title}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm border-b border-border py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
