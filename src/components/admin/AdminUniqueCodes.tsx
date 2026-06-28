import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useUniqueCodePolicies, useUpsertUniqueCodePolicy,
  useIssuedUniqueCodes, useIssueUniqueCode,
  type UniqueCodeKind, type UniqueCodePolicy,
} from '@/hooks/useUniqueCodes';
import { getSiteBaseUrl } from '@/lib/siteUrl';

const KINDS: UniqueCodeKind[] = ['referral','spin','welcome','birthday','custom_link','coupon'];
const BASE = getSiteBaseUrl({ preferPublishedInPreview: true });

function PolicyEditor({ policy }: { policy: UniqueCodePolicy }) {
  const [draft, setDraft] = useState(policy);
  const save = useUpsertUniqueCodePolicy();
  const set = <K extends keyof UniqueCodePolicy>(k: K, v: UniqueCodePolicy[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base capitalize">{policy.kind} policy</CardTitle>
        <div className="flex items-center gap-2">
          <Switch checked={draft.is_active} onCheckedChange={(v) => set('is_active', v)} />
          <span className="text-xs text-muted-foreground">{draft.is_active ? 'Active' : 'Disabled'}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div><Label>Name</Label><Input value={draft.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><Label>Prefix</Label><Input value={draft.prefix} onChange={(e) => set('prefix', e.target.value.toUpperCase().slice(0,8))} /></div>
        <div><Label>Code length</Label><Input type="number" min={4} max={24} value={draft.code_length} onChange={(e) => set('code_length', Number(e.target.value))} /></div>
        <div><Label>Validity (hours)</Label><Input type="number" min={1} value={draft.validity_hours} onChange={(e) => set('validity_hours', Number(e.target.value))} /></div>
        <div><Label>Max uses</Label><Input type="number" min={1} value={draft.max_uses} onChange={(e) => set('max_uses', Number(e.target.value))} /></div>
        <div><Label>Max active per user</Label><Input type="number" min={0} value={draft.max_per_user} onChange={(e) => set('max_per_user', Number(e.target.value))} /></div>
        <div>
          <Label>Discount type</Label>
          <select className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            value={draft.discount_type ?? ''}
            onChange={(e) => set('discount_type', (e.target.value || null) as 'percentage' | 'fixed' | null)}>
            <option value="">None</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
        </div>
        <div><Label>Discount value</Label><Input type="number" min={0} value={draft.discount_value ?? ''} onChange={(e) => set('discount_value', e.target.value === '' ? null : Number(e.target.value))} /></div>
        <div><Label>Min order ₹</Label><Input type="number" min={0} value={draft.min_order_amount ?? ''} onChange={(e) => set('min_order_amount', e.target.value === '' ? null : Number(e.target.value))} /></div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={draft.generate_unique_link} onCheckedChange={(v) => set('generate_unique_link', v)} />
          <span className="text-sm">Generate unique URL (<code>/u/&lt;slug&gt;</code>)</span>
        </div>
        <div className="md:col-span-2"><Label>Link target path</Label><Input value={draft.link_target_path ?? ''} placeholder="/auth?mode=signup" onChange={(e) => set('link_target_path', e.target.value)} /></div>
        <div className="md:col-span-3 flex justify-end">
          <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save policy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IssuedTable({ kind }: { kind?: UniqueCodeKind }) {
  const { data, isLoading } = useIssuedUniqueCodes({ kind });
  const issue = useIssueUniqueCode();

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} most recent codes</p>
        {kind && kind !== 'coupon' && (
          <Button size="sm" variant="outline" onClick={() => issue.mutate({ kind })} disabled={issue.isPending}>
            <Plus className="mr-1 h-3 w-3" /> Issue test code
          </Button>
        )}
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">
                  <button className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied'); }}>
                    {c.code} <Copy className="h-3 w-3" />
                  </button>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{c.kind}</Badge></TableCell>
                <TableCell>{c.uses_count}/{c.max_uses}</TableCell>
                <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                <TableCell className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString() : '—'}</TableCell>
                <TableCell className="text-xs">
                  {c.link_slug ? (
                    <button className="text-primary hover:underline"
                      onClick={() => { navigator.clipboard.writeText(`${BASE}/u/${c.link_slug}`); toast.success('Link copied'); }}>
                      /u/{c.link_slug}
                    </button>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminUniqueCodes() {
  const { data: policies, isLoading } = useUniqueCodePolicies();
  const [tab, setTab] = useState<UniqueCodeKind>('referral');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Unique Codes</h2>
        <p className="text-sm text-muted-foreground">
          One engine for per-customer referral, spin, welcome, birthday, coupon & custom-link codes.
          Tune validity, discounts and per-user caps below — changes apply instantly to every issued code.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as UniqueCodeKind)}>
        <TabsList className="flex-wrap h-auto">
          {KINDS.map((k) => <TabsTrigger key={k} value={k} className="capitalize">{k.replace('_',' ')}</TabsTrigger>)}
        </TabsList>

        {KINDS.map((k) => {
          const policy = policies?.find((p) => p.kind === k);
          return (
            <TabsContent key={k} value={k} className="space-y-6 mt-4">
              {isLoading && <Skeleton className="h-60 w-full" />}
              {policy && <PolicyEditor policy={policy} />}
              {!policy && !isLoading && (
                <Card><CardContent className="py-8 text-center text-muted-foreground">
                  No policy seeded for {k}. Reload to retry.
                </CardContent></Card>
              )}
              <IssuedTable kind={k} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
