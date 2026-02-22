import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminDisputes, useUpdateDispute, useSendDisputeMessage, useDispute } from '@/hooks/useDisputes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  Search,
  Loader2,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  User,
  Store,
  Shield,
  Send,
} from 'lucide-react';

const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  open: { color: 'bg-warning/10 text-warning', label: 'Open', icon: Clock },
  under_review: { color: 'bg-info/10 text-info', label: 'Under Review', icon: Eye },
  awaiting_customer: { color: 'bg-accent/10 text-accent', label: 'Awaiting Customer', icon: User },
  awaiting_vendor: { color: 'bg-accent/10 text-accent', label: 'Awaiting Vendor', icon: Store },
  escalated: { color: 'bg-destructive/10 text-destructive', label: 'Escalated', icon: ArrowUpCircle },
  resolved: { color: 'bg-success/10 text-success', label: 'Resolved', icon: CheckCircle },
  closed: { color: 'bg-muted text-muted-foreground', label: 'Closed', icon: XCircle },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-muted text-muted-foreground', label: 'Low' },
  medium: { color: 'bg-warning/10 text-warning', label: 'Medium' },
  high: { color: 'bg-warning/10 text-warning', label: 'High' },
  urgent: { color: 'bg-destructive/10 text-destructive', label: 'Urgent' },
};

const typeLabels: Record<string, string> = {
  order_not_received: 'Order Not Received',
  item_not_as_described: 'Item Not as Described',
  refund_issue: 'Refund Issue',
  payment_dispute: 'Payment Dispute',
  delivery_issue: 'Delivery Issue',
  vendor_complaint: 'Vendor Complaint',
  customer_complaint: 'Customer Complaint',
  other: 'Other',
};

const resolutionTypes = [
  { value: 'refund_full', label: 'Full Refund' },
  { value: 'refund_partial', label: 'Partial Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'no_action', label: 'No Action Required' },
  { value: 'vendor_warning', label: 'Vendor Warning' },
  { value: 'vendor_penalty', label: 'Vendor Penalty' },
  { value: 'customer_warning', label: 'Customer Warning' },
];

export function DisputeManagement() {
  const { user } = useAuth();
  const { data: disputes, isLoading } = useAdminDisputes();
  const updateDispute = useUpdateDispute();
  const sendMessage = useSendDisputeMessage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionType, setResolutionType] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionAmount, setResolutionAmount] = useState('');

  const { data: selectedDispute, refetch: refetchDispute } = useDispute(selectedDisputeId || undefined);

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedDisputeId) return;

    const channel = supabase
      .channel(`dispute-${selectedDisputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${selectedDisputeId}`,
        },
        () => {
          refetchDispute();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisputeId, refetchDispute]);

  const filteredDisputes = disputes?.filter((dispute: any) => {
    const matchesSearch =
      dispute.dispute_number.toLowerCase().includes(search.toLowerCase()) ||
      dispute.title.toLowerCase().includes(search.toLowerCase()) ||
      dispute.orders?.order_number?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || dispute.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleSendMessage = async () => {
    if (!selectedDisputeId || !newMessage.trim()) return;

    await sendMessage.mutateAsync({
      disputeId: selectedDisputeId,
      message: newMessage,
      isInternal,
    });

    setNewMessage('');
  };

  const handleResolve = async () => {
    if (!selectedDisputeId || !resolutionType) return;

    await updateDispute.mutateAsync({
      disputeId: selectedDisputeId,
      updates: {
        status: 'resolved',
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes || undefined,
        resolution_amount: resolutionAmount ? parseFloat(resolutionAmount) : undefined,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      },
    });

    setSelectedDisputeId(null);
    setResolutionType('');
    setResolutionNotes('');
    setResolutionAmount('');
  };

  const handleEscalate = async (disputeId: string) => {
    await updateDispute.mutateAsync({
      disputeId,
      updates: {
        status: 'escalated',
        priority: 'urgent',
        escalated_at: new Date().toISOString(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const stats = {
    open: disputes?.filter((d: any) => d.status === 'open').length || 0,
    urgent: disputes?.filter((d: any) => d.priority === 'urgent' && d.status !== 'resolved' && d.status !== 'closed').length || 0,
    inProgress: disputes?.filter((d: any) => ['under_review', 'awaiting_customer', 'awaiting_vendor', 'escalated'].includes(d.status)).length || 0,
    resolved: disputes?.filter((d: any) => d.status === 'resolved').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Eye className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search disputes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="awaiting_customer">Awaiting Customer</SelectItem>
            <SelectItem value="awaiting_vendor">Awaiting Vendor</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disputes Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Disputes ({filteredDisputes?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispute #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Raised By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes?.map((dispute: any, index: number) => {
                  const status = statusConfig[dispute.status] || statusConfig.open;
                  const priority = priorityConfig[dispute.priority] || priorityConfig.medium;
                  const StatusIcon = status.icon;
                  const raisedByIcon = dispute.raised_by_type === 'vendor' ? Store : dispute.raised_by_type === 'admin' ? Shield : User;

                  return (
                    <motion.tr
                      key={dispute.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDisputeId(dispute.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{dispute.dispute_number}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{dispute.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{typeLabels[dispute.dispute_type] || dispute.dispute_type}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {React.createElement(raisedByIcon, { className: 'w-3.5 h-3.5' })}
                          <span className="capitalize text-sm">{dispute.raised_by_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(dispute.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedDisputeId(dispute.id); }}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          {dispute.status !== 'resolved' && dispute.status !== 'closed' && dispute.status !== 'escalated' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleEscalate(dispute.id); }}
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDisputeId} onOpenChange={() => setSelectedDisputeId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {selectedDispute?.dispute_number}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            {selectedDispute && (
              <div className="space-y-6 p-1">
                {/* Dispute Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{typeLabels[selectedDispute.dispute_type]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order</p>
                    <p className="font-medium">{selectedDispute.orders?.order_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusConfig[selectedDispute.status]?.color}>
                      {statusConfig[selectedDispute.status]?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <Badge className={priorityConfig[selectedDispute.priority]?.color}>
                      {priorityConfig[selectedDispute.priority]?.label}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Title</p>
                  <p className="font-medium">{selectedDispute.title}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedDispute.description}</p>
                </div>

                {/* Evidence */}
                {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Evidence</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedDispute.evidence_urls.map((url: string, i: number) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Conversation</p>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {selectedDispute.messages?.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.is_internal 
                            ? 'bg-warning/10 border border-warning/20' 
                            : msg.sender_type === 'admin' 
                              ? 'bg-primary/10 ml-8' 
                              : 'bg-muted/50 mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_type === 'admin' && <Shield className="w-3.5 h-3.5" />}
                          {msg.sender_type === 'vendor' && <Store className="w-3.5 h-3.5" />}
                          {msg.sender_type === 'customer' && <User className="w-3.5 h-3.5" />}
                          <span className="text-xs font-medium capitalize">{msg.sender_type}</span>
                          {msg.is_internal && <Badge variant="outline" className="text-[10px] px-1">Internal</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form */}
                  {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={sendMessage.isPending || !newMessage.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded"
                        />
                        Internal note (only visible to admins)
                      </label>
                    </div>
                  )}
                </div>

                {/* Resolution Form */}
                {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                  <div className="border-t pt-4 space-y-4">
                    <p className="text-sm font-medium">Resolve Dispute</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Resolution Type</label>
                        <Select value={resolutionType} onValueChange={setResolutionType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select resolution" />
                          </SelectTrigger>
                          <SelectContent>
                            {resolutionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Amount (if applicable)</label>
                        <Input
                          type="number"
                          placeholder="₹0"
                          value={resolutionAmount}
                          onChange={(e) => setResolutionAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Resolution Notes</label>
                      <Textarea
                        placeholder="Explain the resolution..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleResolve}
                      disabled={updateDispute.isPending || !resolutionType}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  </div>
                )}

                {/* Resolution Display */}
                {selectedDispute.status === 'resolved' && (
                  <div className="border-t pt-4 space-y-2 bg-success/5 p-4 rounded-lg">
                    <p className="text-sm font-medium text-success">Resolution</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{' '}
                        {resolutionTypes.find(t => t.value === selectedDispute.resolution_type)?.label}
                      </div>
                      {selectedDispute.resolution_amount && (
                        <div>
                          <span className="text-muted-foreground">Amount:</span>{' '}
                          ₹{selectedDispute.resolution_amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                    {selectedDispute.resolution_notes && (
                      <p className="text-sm">{selectedDispute.resolution_notes}</p>
                    )}
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
