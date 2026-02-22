import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Star,
  User,
  Headphones,
} from 'lucide-react';
import { format } from 'date-fns';

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'open':
      return { color: 'bg-info', icon: Clock, label: 'Open' };
    case 'in_progress':
      return { color: 'bg-warning', icon: MessageSquare, label: 'In Progress' };
    case 'resolved':
      return { color: 'bg-success', icon: CheckCircle, label: 'Resolved' };
    case 'closed':
      return { color: 'bg-muted-foreground', icon: CheckCircle, label: 'Closed' };
    default:
      return { color: 'bg-muted-foreground', icon: AlertCircle, label: status };
  }
};

export default function SupportTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ticket, messages, isLoading, addMessage, isSending, closeTicket, isClosing } = useSupportTicket(ticketId);
  
  const [newMessage, setNewMessage] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await addMessage(newMessage);
    setNewMessage('');
  };

  const handleCloseTicket = async () => {
    await closeTicket({ rating, feedback });
    setShowFeedbackDialog(false);
    navigate('/support');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ticket not found</h2>
            <Button asChild>
              <Link to="/support">Back to Support</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);
  const StatusIcon = statusConfig.icon;
  const isOpen = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" asChild className="mb-4">
              <Link to="/support" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Support
              </Link>
            </Button>
          </motion.div>

          {/* Ticket Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">
                        {ticket.ticket_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={`${statusConfig.color} text-primary-foreground border-none`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                  </div>
                  {isOpen && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFeedbackDialog(true)}
                    >
                      Close Ticket
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Category: <strong className="text-foreground capitalize">{ticket.category}</strong></span>
                    <span>Priority: <strong className="text-foreground capitalize">{ticket.priority}</strong></span>
                    <span>Created: <strong className="text-foreground">{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation below.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.is_staff_reply ? '' : 'flex-row-reverse'}`}
                      >
                        <Avatar className={`w-8 h-8 shrink-0 ${msg.is_staff_reply ? 'bg-accent' : 'bg-muted'}`}>
                          <AvatarFallback>
                            {msg.is_staff_reply ? (
                              <Headphones className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.is_staff_reply
                              ? 'bg-accent/10 rounded-tl-none'
                              : 'bg-primary text-primary-foreground rounded-tr-none ml-auto'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.is_staff_reply ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isOpen && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex gap-3">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="shrink-0"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Ctrl+Enter to send
                    </p>
                  </>
                )}

                {!isOpen && ticket.satisfaction_rating && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Rating</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= ticket.satisfaction_rating!
                              ? 'fill-warning text-warning'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    {ticket.satisfaction_feedback && (
                      <p className="text-sm mt-2 italic">"{ticket.satisfaction_feedback}"</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>
              How was your support experience? Your feedback helps us improve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Rate your experience</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= rating
                          ? 'fill-warning text-warning'
                          : 'text-muted-foreground hover:text-warning'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Additional feedback (optional)</p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseTicket} disabled={isClosing}>
              {isClosing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                'Close Ticket'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
