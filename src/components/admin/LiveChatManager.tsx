import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  User,
  Headphones,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
  Circle,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ChatConversation {
  id: string;
  customer_id: string;
  assigned_agent_id: string | null;
  status: string;
  priority: string;
  subject: string | null;
  last_message_at: string;
  resolved_at: string | null;
  created_at: string;
  customer?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function useAdminConversations() {
  return useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: async () => {
      // First get conversations
      const { data: conversations, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      if (!conversations) return [];

      // Then get customer profiles for each conversation
      const customerIds = [...new Set(conversations.map(c => c.customer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', customerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return conversations.map(conv => ({
        ...conv,
        customer: profileMap.get(conv.customer_id) || null,
      })) as ChatConversation[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['admin-chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function LiveChatManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading } = useAdminConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useConversationMessages(selectedConversationId);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
          queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConversationId || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversationId,
          sender_id: user.id,
          sender_type: 'agent',
          message: replyMessage.trim(),
        });

      if (error) throw error;

      // Update conversation's last_message_at and assign agent
      await supabase
        .from('chat_conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          assigned_agent_id: user.id,
          status: 'active',
        })
        .eq('id', selectedConversationId);

      setReplyMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (conversationId: string, status: string) => {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      await supabase
        .from('chat_conversations')
        .update(updates)
        .eq('id', conversationId);

      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      toast.success(`Conversation marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      (conv.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       conv.customer?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
       conv.subject?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-warning/20 text-warning border-0"><Circle className="w-2 h-2 mr-1 fill-current" /> Open</Badge>;
      case 'active':
        return <Badge className="bg-success/20 text-success border-0"><Circle className="w-2 h-2 mr-1 fill-current animate-pulse" /> Active</Badge>;
      case 'resolved':
        return <Badge className="bg-info/20 text-info border-0"><CheckCircle className="w-3 h-3 mr-1" /> Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-muted text-muted-foreground border-0"><XCircle className="w-3 h-3 mr-1" /> Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-accent" />
            Live Chat
          </h2>
          <p className="text-muted-foreground">Manage customer conversations in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-8 px-3">
            {conversations.filter(c => c.status === 'open' || c.status === 'active').length} Active Chats
          </Badge>
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-base">Conversations ({filteredConversations.length})</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">No conversations found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.5)' }}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedConversationId === conv.id ? 'bg-accent/10 border-l-2 border-accent' : ''
                    }`}
                    onClick={() => setSelectedConversationId(conv.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conv.customer?.avatar_url || undefined} />
                        <AvatarFallback>
                          {conv.customer?.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate text-sm">
                            {conv.customer?.full_name || 'Customer'}
                          </p>
                          {getStatusBadge(conv.status)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.subject || conv.customer?.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Panel */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedConversation.customer?.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedConversation.customer?.full_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedConversation.customer?.full_name || 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">{selectedConversation.customer?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={selectedConversation.status} 
                      onValueChange={(v) => handleUpdateStatus(selectedConversation.id, v)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl p-3 ${
                              msg.sender_type === 'agent'
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted rounded-bl-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {msg.sender_type === 'agent' ? (
                                <Headphones className="w-3 h-3" />
                              ) : (
                                <User className="w-3 h-3" />
                              )}
                              <span className="text-xs opacity-80 font-medium">
                                {msg.sender_type === 'agent' ? 'Support' : 'Customer'}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Reply Input */}
              {selectedConversation.status !== 'closed' && (
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                    <Button onClick={handleSendReply} disabled={!replyMessage.trim() || isSending}>
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a chat from the list to start responding</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
