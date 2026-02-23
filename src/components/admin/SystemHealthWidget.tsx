import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Server, Database, HardDrive, Clock } from 'lucide-react';

interface HealthCheck {
  status: string;
  detail?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  latency_ms: number;
  checks: {
    database: HealthCheck;
    environment: HealthCheck;
    storage: HealthCheck;
  };
  version: string;
  error?: string;
}

export function SystemHealthWidget() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('health-check');
      if (error) throw error;
      return data as HealthResponse;
    },
    refetchInterval: 60000, // every minute
    staleTime: 30000,
  });

  const getStatusIcon = (status: string) => {
    if (status === 'ok' || status === 'healthy') return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === 'degraded') return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    if (status === 'healthy' || status === 'ok') return <Badge className="bg-success/10 text-success border-success/30">Healthy</Badge>;
    if (status === 'degraded') return <Badge className="bg-warning/10 text-warning border-warning/30">Degraded</Badge>;
    return <Badge variant="destructive">Error</Badge>;
  };

  const checks = [
    { label: 'Database', key: 'database' as const, icon: Database },
    { label: 'Environment', key: 'environment' as const, icon: Server },
    { label: 'Storage', key: 'storage' as const, icon: HardDrive },
  ];

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-accent" />
            System Health
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge(data?.status)}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map(check => {
          const checkData = data?.checks?.[check.key];
          return (
            <div key={check.key} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <check.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{check.label}</span>
              </div>
              {getStatusIcon(checkData?.status || 'error')}
            </div>
          );
        })}
        
        {data?.latency_ms !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Latency
            </div>
            <span className="font-mono">{data.latency_ms}ms</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
