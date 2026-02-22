import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package, Truck, CreditCard, MessageSquare, RotateCcw, Shield,
  AlertTriangle, CheckCircle, Clock, ArrowRight, Plus, User, Bot
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderTimelineProps {
  orderId: string;
  compact?: boolean;
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  status_change: ArrowRight,
  payment: CreditCard,
  shipping: Truck,
  note: MessageSquare,
  refund: RotateCcw,
  return: Package,
  fraud_check: Shield,
  created: Plus,
  escalation: AlertTriangle,
};

const ACTIVITY_COLORS: Record<string, string> = {
  status_change: 'bg-info/10 text-info border-info/20',
  payment: 'bg-success/10 text-success border-success/20',
  shipping: 'bg-info/10 text-info border-info/20',
  note: 'bg-warning/10 text-warning border-warning/20',
  refund: 'bg-warning/10 text-warning border-warning/20',
  return: 'bg-destructive/10 text-destructive border-destructive/20',
  fraud_check: 'bg-accent/10 text-accent border-accent/20',
  created: 'bg-success/10 text-success border-success/20',
  escalation: 'bg-destructive/10 text-destructive border-destructive/20',
};

const ACTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  system: Bot,
  admin: Shield,
  vendor: Package,
  customer: User,
};

export function OrderTimeline({ orderId, compact = false }: OrderTimelineProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['order-activity', orderId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('order_activity_log') as any)
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orderId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await (supabase.from('order_activity_log') as any)
        .insert({
          order_id: orderId,
          actor_id: user?.id,
          actor_type: 'admin',
          activity_type: 'note',
          title: 'Admin Note',
          description: note,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-activity', orderId] });
      setNoteText('');
      setShowAddNote(false);
      toast.success('Note added to timeline');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Order Timeline
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddNote(!showAddNote)}
          className="gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Add Note
        </Button>
      </div>

      {showAddNote && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add an internal note to this order..."
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAddNote(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!noteText.trim()}
              onClick={() => addNoteMutation.mutate(noteText.trim())}
            >
              Save Note
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className={compact ? 'max-h-[400px]' : ''}>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {activities.map((activity: any, index: number) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
              const ActorIcon = ACTOR_ICONS[activity.actor_type] || Bot;
              const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'bg-muted text-muted-foreground border-border';

              return (
                <div key={activity.id} className="relative flex gap-4 py-3 pl-1">
                  {/* Icon */}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ActorIcon className="w-3 h-3" />
                          {activity.actor_type}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-[10px]">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
