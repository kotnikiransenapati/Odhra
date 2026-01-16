import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MessageSquare, Bell } from 'lucide-react';

interface NewTicket {
  id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  created_at: string;
}

interface TicketRealtimeNotificationProps {
  onNewTicket?: (ticket: NewTicket) => void;
}

export function TicketRealtimeNotification({ onNewTicket }: TicketRealtimeNotificationProps) {
  const [recentTickets, setRecentTickets] = useState<NewTicket[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Subscribe to new support tickets
    const channel = supabase
      .channel('admin-ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const newTicket = payload.new as NewTicket;
          
          // Show toast notification
          toast('New Support Ticket', {
            description: `#${newTicket.ticket_number}: ${newTicket.subject}`,
            icon: <MessageSquare className="w-4 h-4 text-accent" />,
            action: {
              label: 'View',
              onClick: () => {
                onNewTicket?.(newTicket);
              },
            },
          });

          // Add to recent tickets
          setRecentTickets(prev => [newTicket, ...prev.slice(0, 4)]);
          setShowNotification(true);

          // Auto-hide after 10 seconds
          setTimeout(() => {
            setRecentTickets(prev => prev.filter(t => t.id !== newTicket.id));
          }, 10000);

          onNewTicket?.(newTicket);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewTicket]);

  const dismissTicket = (ticketId: string) => {
    setRecentTickets(prev => prev.filter(t => t.id !== ticketId));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (recentTickets.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {recentTickets.map((ticket) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="bg-card border border-border rounded-xl p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">New Ticket</span>
                  <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                    {ticket.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  #{ticket.ticket_number}
                </p>
                <p className="text-sm truncate">{ticket.subject}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-6 w-6"
                onClick={() => dismissTicket(ticket.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
