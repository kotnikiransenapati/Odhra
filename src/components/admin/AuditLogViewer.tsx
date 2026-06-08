import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  User,
  Settings,
  Package,
  ShoppingCart,
  Store,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin_email?: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-success/10 text-success',
  update: 'bg-info/10 text-info',
  delete: 'bg-destructive/10 text-destructive',
  login: 'bg-accent/10 text-accent',
  approve: 'bg-success/10 text-success',
  reject: 'bg-warning/10 text-warning',
  default: 'bg-muted text-muted-foreground',
};

const ENTITY_ICONS: Record<string, React.ElementType> = {
  order: ShoppingCart,
  product: Package,
  vendor: Store,
  user: User,
  settings: Settings,
  default: History,
};

export function AuditLogViewer() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch admin emails
      const adminIds = [...new Set(data?.map(l => l.admin_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', adminIds as string[]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]));

      return data?.map(log => ({
        ...log,
        admin_email: log.admin_id ? profileMap.get(log.admin_id) : undefined,
      })) as AuditLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = search === '' ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'all' || 
      log.action.toLowerCase().includes(actionFilter.toLowerCase());

    return matchesSearch && matchesAction;
  });

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('create') || lowerAction.includes('add')) return ACTION_COLORS.create;
    if (lowerAction.includes('update') || lowerAction.includes('edit')) return ACTION_COLORS.update;
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) return ACTION_COLORS.delete;
    if (lowerAction.includes('login') || lowerAction.includes('auth')) return ACTION_COLORS.login;
    if (lowerAction.includes('approve')) return ACTION_COLORS.approve;
    if (lowerAction.includes('reject')) return ACTION_COLORS.reject;
    return ACTION_COLORS.default;
  };

  const getEntityIcon = (entityType: string | null) => {
    if (!entityType) return ENTITY_ICONS.default;
    return ENTITY_ICONS[entityType.toLowerCase()] || ENTITY_ICONS.default;
  };

  const exportToCSV = () => {
    if (!filteredLogs) return;

    const headers = ['Timestamp', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_email || 'System',
      log.action,
      log.entity_type || '-',
      log.entity_id || '-',
      log.ip_address || '-',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueEntities = [...new Set(logs?.map(l => l.entity_type).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground">Track all admin actions and changes</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(entity => (
                  <SelectItem key={entity} value={entity!}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="glass">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.map((log, index) => {
                    const Icon = getEntityIcon(log.entity_type);
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01 }}
                        className="border-b border-border hover:bg-secondary/20"
                      >
                        <TableCell className="whitespace-nowrap">
                          <div>
                            <p className="font-medium">{format(new Date(log.created_at), 'MMM dd, HH:mm')}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-accent" />
                            </div>
                            <span className="text-sm truncate max-w-[150px]">
                              {log.admin_email || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">{log.entity_type || '-'}</p>
                              {log.entity_id && (
                                <p className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">
                                  {log.entity_id.slice(0, 8)}...
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredLogs?.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">Admin</p>
                  <p className="font-medium">{selectedLog.admin_email || 'System'}</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge className={getActionColor(selectedLog.action)}>{selectedLog.action}</Badge>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-medium font-mono">{selectedLog.ip_address || '-'}</p>
                </div>
              </div>

              {/* Entity Info */}
              {selectedLog.entity_type && (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground mb-2">Entity</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedLog.entity_type}</Badge>
                    <span className="font-mono text-sm">{selectedLog.entity_id}</span>
                  </div>
                </div>
              )}

              {/* Changes */}
              {(selectedLog.old_values || selectedLog.new_values) && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Changes</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedLog.old_values && (
                      <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                        <p className="text-sm font-medium text-destructive mb-2">Before</p>
                        <ScrollArea className="h-[200px]">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.old_values, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                    {selectedLog.new_values && (
                      <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                        <p className="text-sm font-medium text-success mb-2">After</p>
                        <ScrollArea className="h-[200px]">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.new_values, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.user_agent && (
                <div className="p-4 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground mb-2">User Agent</p>
                  <p className="text-xs font-mono break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
