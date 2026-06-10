import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, RefreshCw, HardDrive, Globe, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BucketUsage {
  bucket_id: string;
  is_public: boolean;
  object_count: number;
  total_bytes: number;
  avg_bytes: number;
  largest_bytes: number;
  last_uploaded_at: string | null;
}

const fmtBytes = (b: number): string => {
  if (!b) return '0 B';
  const k = 1024;
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
};

export function StorageUsageAnalyzer() {
  const [data, setData] = useState<BucketUsage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase.rpc('admin_storage_usage');
    setLoading(false);
    if (error) return console.error('storage usage failed', error);
    setData((rows || []) as BucketUsage[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const grandTotal = data.reduce((s, r) => s + Number(r.total_bytes || 0), 0);
  const grandCount = data.reduce((s, r) => s + Number(r.object_count || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ stiffness: 400, damping: 30 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Storage Usage</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {grandCount.toLocaleString()} objects · {fmtBytes(grandTotal)} total
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.length === 0 && !loading && (
            <div className="text-center text-muted-foreground py-10 text-sm">No buckets found.</div>
          )}
          {data.map((b) => {
            const pct = grandTotal > 0 ? (Number(b.total_bytes) / grandTotal) * 100 : 0;
            return (
              <div key={b.bucket_id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{b.bucket_id}</span>
                    {b.is_public ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30 text-xs">
                        <Globe className="h-3 w-3 mr-1" /> public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" /> private
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground tabular-nums">
                    <span>{Number(b.object_count).toLocaleString()} files</span>
                    <span className="font-medium text-foreground">{fmtBytes(Number(b.total_bytes))}</span>
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground tabular-nums">
                  <div><span className="block text-[10px] uppercase">Avg</span>{fmtBytes(Number(b.avg_bytes))}</div>
                  <div><span className="block text-[10px] uppercase">Largest</span>{fmtBytes(Number(b.largest_bytes))}</div>
                  <div>
                    <span className="block text-[10px] uppercase">Last upload</span>
                    {b.last_uploaded_at ? formatDistanceToNow(new Date(b.last_uploaded_at), { addSuffix: true }) : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
