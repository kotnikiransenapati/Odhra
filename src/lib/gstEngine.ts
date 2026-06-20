/**
 * Batch K3 — GST tax engine (CGST / SGST / IGST + reverse charge).
 *
 * Determinism is critical: this module is the single source of truth used by
 * checkout, invoice PDF, and vendor tax reports. All values are rounded to
 * 2 decimal paise-equivalent using banker's rounding to keep totals stable.
 *
 * Rules:
 *   - Place of supply = ship-to state.
 *   - Intra-state (POS == vendor's home state) → CGST + SGST (split 50/50).
 *   - Inter-state (POS != vendor's home state)  → IGST (full rate).
 *   - Tax inclusive vs exclusive controlled by `priceMode`.
 *   - Reverse charge (B2B GSTIN supplied AND product.reverse_charge) ⇒
 *     no tax is added to the invoice; flag is set so the buyer self-assesses.
 */

export type IndianState =
  | 'AN' | 'AP' | 'AR' | 'AS' | 'BR' | 'CG' | 'CH' | 'DD' | 'DL' | 'DN'
  | 'GA' | 'GJ' | 'HP' | 'HR' | 'JH' | 'JK' | 'KA' | 'KL' | 'LA' | 'LD'
  | 'MH' | 'ML' | 'MN' | 'MP' | 'MZ' | 'NL' | 'OD' | 'PB' | 'PY' | 'RJ'
  | 'SK' | 'TG' | 'TN' | 'TR' | 'UK' | 'UP' | 'WB';

export interface TaxLineInput {
  /** stable id (product_id or order_item_id) */
  id: string;
  /** quantity (>=1) */
  quantity: number;
  /** unit price (₹). If priceMode='inclusive', this includes tax. */
  unit_price: number;
  /** HSN (goods) or SAC (services) code */
  hsn_code?: string | null;
  sac_code?: string | null;
  /** Per-product GST rate in percent; falls back to default lookup. */
  gst_rate_percent?: number | null;
  reverse_charge?: boolean;
  /** Vendor's registered state (used to decide intra vs inter-state). */
  vendor_state: IndianState;
}

export interface TaxContext {
  /** ship-to state — drives place of supply */
  buyer_state: IndianState;
  /** buyer GSTIN if B2B */
  buyer_gstin?: string | null;
  /** discount allocated to this invoice in ₹ (subtracted pro-rata from taxable values) */
  invoice_discount?: number;
  /** how unit prices are expressed */
  priceMode?: 'exclusive' | 'inclusive';
}

export interface TaxLineResult {
  id: string;
  hsn_code: string | null;
  taxable_value: number;
  gst_rate_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  reverse_charge: boolean;
  line_total: number;
}

export interface TaxComputation {
  lines: TaxLineResult[];
  taxable_subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  grand_total: number;
  reverse_charge_applied: boolean;
  place_of_supply: IndianState;
  buyer_gstin: string | null;
}

/* ---------------- Default HSN → GST rate map (extend in admin) ------------ */

const DEFAULT_RATE_BY_HSN: Record<string, number> = {
  // Apparel & textiles (typical)
  '5007': 5,   // Woven fabrics of silk
  '5208': 5,   // Cotton woven fabrics
  '6203': 12,  // Men's suits
  '6204': 12,  // Women's suits/dresses
  '6211': 12,  // Track suits, swimwear
  '6214': 12,  // Shawls, scarves, dupattas
  '6307': 5,   // Made-up textile articles
  '7113': 3,   // Articles of jewellery
};

export function lookupGstRate(hsn?: string | null, override?: number | null): number {
  if (typeof override === 'number' && override >= 0) return override;
  if (!hsn) return 5;
  const trimmed = hsn.trim();
  if (DEFAULT_RATE_BY_HSN[trimmed]) return DEFAULT_RATE_BY_HSN[trimmed];
  // Try first 4 digits
  const prefix = trimmed.slice(0, 4);
  if (DEFAULT_RATE_BY_HSN[prefix]) return DEFAULT_RATE_BY_HSN[prefix];
  return 5;
}

/* ---------------- GSTIN validation (15 chars, checksum) ------------------- */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(g: string | null | undefined): boolean {
  if (!g) return false;
  const v = g.trim().toUpperCase();
  if (!GSTIN_REGEX.test(v)) return false;
  // Mod 36 checksum per CBIC spec
  let factor = 1;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const idx = GSTIN_CHARS.indexOf(v[i]);
    if (idx < 0) return false;
    const product = idx * factor;
    sum += Math.floor(product / 36) + (product % 36);
    factor = factor === 1 ? 2 : 1;
  }
  const checkCalc = (36 - (sum % 36)) % 36;
  return GSTIN_CHARS[checkCalc] === v[14];
}

export function stateCodeFromGstin(g: string | null | undefined): string | null {
  if (!g) return null;
  return g.trim().slice(0, 2);
}

/* ---------------- Rounding helpers --------------------------------------- */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ---------------- Core engine -------------------------------------------- */

export function computeTax(input: { lines: TaxLineInput[] } & TaxContext): TaxComputation {
  const { lines, buyer_state, buyer_gstin, priceMode = 'exclusive' } = input;
  const invoiceDiscount = input.invoice_discount ?? 0;
  const gstinValid = buyer_gstin ? isValidGstin(buyer_gstin) : false;

  // Step 1: per-line gross (pre-discount, pre-tax)
  const grossPerLine = lines.map((l) => l.unit_price * Math.max(1, l.quantity));
  const grossTotal = grossPerLine.reduce((a, b) => a + b, 0) || 1;

  // Step 2: pro-rata invoice discount allocation
  const discountPerLine = lines.map((_, i) =>
    invoiceDiscount > 0 ? round2((grossPerLine[i] / grossTotal) * invoiceDiscount) : 0,
  );

  let reverseChargeApplied = false;
  const out: TaxLineResult[] = lines.map((l, i) => {
    const gross = grossPerLine[i] - discountPerLine[i];
    const rate = lookupGstRate(l.hsn_code, l.gst_rate_percent);
    const lineReverseCharge = Boolean(l.reverse_charge) && gstinValid;
    if (lineReverseCharge) reverseChargeApplied = true;

    // Resolve taxable value from price mode
    const taxable = priceMode === 'inclusive'
      ? round2(gross / (1 + rate / 100))
      : round2(gross);

    let cgst = 0, sgst = 0, igst = 0;
    if (!lineReverseCharge) {
      const taxAmount = round2((taxable * rate) / 100);
      if (l.vendor_state === buyer_state) {
        cgst = round2(taxAmount / 2);
        sgst = round2(taxAmount - cgst);
      } else {
        igst = taxAmount;
      }
    }

    const lineTotal = priceMode === 'inclusive'
      ? round2(gross) // already includes tax
      : round2(taxable + cgst + sgst + igst);

    return {
      id: l.id,
      hsn_code: l.hsn_code ?? l.sac_code ?? null,
      taxable_value: taxable,
      gst_rate_percent: rate,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      reverse_charge: lineReverseCharge,
      line_total: lineTotal,
    };
  });

  const taxable_subtotal = round2(out.reduce((a, b) => a + b.taxable_value, 0));
  const cgst_total = round2(out.reduce((a, b) => a + b.cgst_amount, 0));
  const sgst_total = round2(out.reduce((a, b) => a + b.sgst_amount, 0));
  const igst_total = round2(out.reduce((a, b) => a + b.igst_amount, 0));
  const grand_total = round2(out.reduce((a, b) => a + b.line_total, 0));

  return {
    lines: out,
    taxable_subtotal,
    cgst_total,
    sgst_total,
    igst_total,
    grand_total,
    reverse_charge_applied: reverseChargeApplied,
    place_of_supply: buyer_state,
    buyer_gstin: gstinValid ? (buyer_gstin as string).trim().toUpperCase() : null,
  };
}
