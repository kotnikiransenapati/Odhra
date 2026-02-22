import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  Loader2,
  RefreshCw,
  Bug,
  Activity,
  Clock,
  Server,
  XCircle,
} from 'lucide-react';

export function ErrorMonitoringDashboard() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedError, setSelectedError] = useState<any>(null);

  const { data: errorLogs, isLoading, refetch } = useQuery({
    queryKey: ['error-logs', levelFilter, sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (levelFilter !== 'all') {
        query = query.eq('error_level', levelFilter);
      }
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredLogs = errorLogs?.filter(log =>
    !search ||
    log.message.toLowerCase().includes(search.toLowerCase()) ||
    (log.function_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.error_code || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: errorLogs?.length || 0,
    critical: errorLogs?.filter(l => l.error_level === 'critical').length || 0,
    error: errorLogs?.filter(l => l.error_level === 'error').length || 0,
    warning: errorLogs?.filter(l => l.error_level === 'warning').length || 0,
    info: errorLogs?.filter(l => l.error_level === 'info').length || 0,
  };

  const sources = [...new Set(errorLogs?.map(l => l.source).filter(Boolean) || [])];

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <Info className="w-4 h-4 text-info" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      critical: 'destructive',
      error: 'destructive',
      warning: 'default',
      info: 'secondary',
    };
    return <Badge variant={variants[level] || 'secondary'} className="text-xs capitalize">{level}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="w-6 h-6 text-accent" />
            Error Monitoring
          </h2>
          <p className="text-muted-foreground text-sm">Track and diagnose platform errors in real-time</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Logs', value: stats.total, icon: Activity, color: 'text-info', bg: 'bg-info/10' },
          { label: 'Critical', value: stats.critical, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Errors', value: stats.error, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Warnings', value: stats.warning, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Info', value: stats.info, icon: Info, color: 'text-info', bg: 'bg-info/10' },
        ].map((stat, i) => (
          <Card key={i} className="glass">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by message, function, or error code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map(src => (
              <SelectItem key={src} value={src!}>{src}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4" />
            Error Logs ({filteredLogs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Level</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map(log => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-secondary/20"
                    onClick={() => setSelectedError(log)}
                  >
                    <TableCell>{getLevelBadge(log.error_level)}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.error_level)}
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.source || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{log.function_name || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{log.error_code || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredLogs || filteredLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Bug className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No error logs found</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && getLevelIcon(selectedError.error_level)}
              Error Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(80vh-100px)]">
            {selectedError && (
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Level</p>
                    {getLevelBadge(selectedError.error_level)}
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedError.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium">{selectedError.source || 'Unknown'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Function</p>
                    <p className="text-sm font-mono">{selectedError.function_name || 'N/A'}</p>
                  </div>
                </div>

                {selectedError.error_code && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Error Code</p>
                    <Badge variant="outline" className="font-mono">{selectedError.error_code}</Badge>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm">{selectedError.message}</p>
                </div>

                {selectedError.stack_trace && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Stack Trace</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap bg-background/50 p-3 rounded overflow-x-auto">
                      {selectedError.stack_trace}
                    </pre>
                  </div>
                )}

                {selectedError.metadata && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                    <pre className="text-xs font-mono whitespace-pre-wrap bg-background/50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedError.request_id && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Request ID</p>
                    <p className="text-sm font-mono">{selectedError.request_id}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
