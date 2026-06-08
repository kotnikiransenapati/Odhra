import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Loader2, Bot, Sparkles, User,
  HelpCircle, ShoppingBag, Truck, Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  useConversations,
  useConversationMessages,
  useCreateConversation,
  useSendMessage,
  useRealtimeMessages
} from '@/hooks/useLiveChat';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type ChatMode = 'ai' | 'human' | 'whatsapp';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const aiQuickActions = [
  { label: '🔍 Find products', prompt: 'Help me find a product' },
  { label: '📦 Track order', prompt: 'How do I track my order?' },
  { label: '↩️ Returns', prompt: 'What is your return policy?' },
  { label: '💎 Deals', prompt: 'Show me the best deals today' },
];

const whatsappQuickMessages = [
  { icon: HelpCircle, label: 'General Help', message: 'Hi! I need help with something.' },
  { icon: ShoppingBag, label: 'Product Query', message: 'Hi! I have a question about a product.' },
  { icon: Truck, label: 'Track Order', message: 'Hi! I want to track my order.' },
  { icon: Phone, label: 'Call Back', message: 'Hi! Please call me back regarding my query.' },
];

// WhatsApp icon SVG
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export function UnifiedChatWidget() {
  const { user } = useAuth();
  const { isEnabled: liveChatEnabled } = useFeatureFlag('live_chat_widget');
  const { isEnabled: whatsappFlagEnabled } = useFeatureFlag('whatsapp_chat');
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ChatMode>('ai');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Human chat hooks
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { data: conversations } = useConversations();
  const { data: humanMessages, isLoading: messagesLoading } = useConversationMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const { isConnected } = useRealtimeMessages(activeConversationId);

  // WhatsApp settings
  const { data: waSettings } = useQuery({
    queryKey: ['whatsapp-storefront-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['whatsapp_business_phone', 'whatsapp_default_message', 'whatsapp_enabled']);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : String(s.value); });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isWhatsAppEnabled = whatsappFlagEnabled && waSettings?.whatsapp_enabled !== 'false';
  const waPhone = waSettings?.whatsapp_business_phone || '919876543210';

  useEffect(() => {
    if (conversations?.length && !activeConversationId && mode === 'human') {
      const openConvo = conversations.find(c => c.status === 'open' || c.status === 'assigned');
      if (openConvo) setActiveConversationId(openConvo.id);
    }
  }, [conversations, activeConversationId, mode]);

  useEffect(() => {
    if (mode === 'whatsapp' && !isWhatsAppEnabled) setMode('ai');
  }, [mode, isWhatsAppEnabled]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [humanMessages, aiMessages]);

  const openWhatsApp = (msg: string) => {
    const cleanPhone = waPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const sendAIMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);
    setMessage('');

    try {
      const chatHistory = [...aiMessages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(user ? { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } : {}),
          },
          body: JSON.stringify({ messages: chatHistory, context: 'Shopping assistant on Odhra marketplace' }),
        }
      );
      if (!response.ok) throw new Error('Failed to get AI response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      const streamMsgId = `a-${Date.now()}`;
      setAiMessages(prev => [...prev, { id: streamMsgId, role: 'assistant', content: '', timestamp: new Date() }]);
      setIsAiLoading(false);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content || '';
                responseText += delta;
                setAiMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: responseText } : m));
              } catch { /* skip */ }
            }
          }
        }
      }
      if (!responseText) responseText = "I'm here to help! Could you rephrase your question?";
      setAiMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: responseText } : m));
    } catch {
      setAiMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant',
        content: "I'm having trouble connecting. Try again or switch to live support!",
        timestamp: new Date()
      }]);
    } finally {
      setIsAiLoading(false);
    }
  }, [aiMessages, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (mode === 'ai') {
      sendAIMessage(message);
    } else if (mode === 'whatsapp') {
      openWhatsApp(message.trim());
      setMessage('');
    } else {
      if (!activeConversationId) {
        const result = await createConversation.mutateAsync('General Inquiry');
        setActiveConversationId(result.id);
        await sendMessage.mutateAsync({ conversationId: result.id, message: message.trim() });
      } else {
        await sendMessage.mutateAsync({ conversationId: activeConversationId, message: message.trim() });
      }
      setMessage('');
    }
  };

  const switchToHuman = async () => {
    setMode('human');
    if (!activeConversationId) {
      const result = await createConversation.mutateAsync('Escalated from AI Assistant');
      setActiveConversationId(result.id);
    }
  };

  // Tab config
  const tabs: { key: ChatMode; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'ai', label: 'AI', icon: <Bot className="h-3.5 w-3.5" />, show: true },
    { key: 'human', label: 'Support', icon: <User className="h-3.5 w-3.5" />, show: true },
    { key: 'whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon className="h-3.5 w-3.5" />, show: isWhatsAppEnabled },
  ];

  const visibleTabs = tabs.filter(t => t.show);

  const headerColors: Record<ChatMode, string> = {
    ai: 'bg-primary',
    human: 'bg-primary',
    whatsapp: 'bg-[#25D366]',
  };

  if (!liveChatEnabled) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-[96px] right-4 z-50 w-[calc(100%-2rem)] max-w-sm md:bottom-[5.5rem] md:right-4"
            >
              <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
                {/* Header */}
                <div className={cn('p-3 text-white transition-colors', headerColors[mode])}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                        {mode === 'ai' ? <Bot className="h-4.5 w-4.5" /> :
                         mode === 'whatsapp' ? <WhatsAppIcon className="h-4 w-4" /> :
                         <MessageCircle className="h-4.5 w-4.5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">
                          {mode === 'ai' ? 'AI Assistant' : mode === 'whatsapp' ? 'WhatsApp' : 'Live Support'}
                        </h3>
                        <p className="text-[10px] opacity-80 flex items-center gap-1">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            mode === 'human' ? (isConnected ? "bg-green-300" : "bg-yellow-300") : "bg-green-300"
                          )} />
                          {mode === 'ai' ? 'Instant replies' :
                           mode === 'whatsapp' ? 'Typically replies in minutes' :
                           isConnected ? 'Connected' : 'Connecting...'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Tabs */}
                  {visibleTabs.length > 1 && (
                    <div className="flex gap-1 bg-white/10 rounded-lg p-0.5">
                      {visibleTabs.map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setMode(tab.key)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all",
                            mode === tab.key
                              ? "bg-white/25 text-white shadow-sm"
                              : "text-white/70 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {tab.icon}
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <ScrollArea ref={scrollRef} className="flex-1 p-4">
                  {mode === 'ai' && (
                    aiMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                          <Sparkles className="h-7 w-7 text-accent" />
                        </div>
                        <h4 className="font-semibold mb-1 text-sm">Hi! I'm your AI Assistant</h4>
                        <p className="text-xs text-muted-foreground mb-5">
                          Ask me anything about products, orders, or style advice.
                        </p>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          {aiQuickActions.map(action => (
                            <button
                              key={action.label}
                              onClick={() => sendAIMessage(action.prompt)}
                              className="text-left text-[11px] p-2.5 rounded-xl border border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiMessages.map(msg => (
                          <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            {msg.role === 'assistant' && (
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-accent/10 text-accent text-[10px]">
                                  <Bot className="w-3.5 h-3.5" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={cn(
                              "max-w-[80%] rounded-2xl px-3.5 py-2",
                              msg.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary rounded-bl-md"
                            )}>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <p className={cn("text-[9px] mt-1", msg.role === 'user' ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                {format(msg.timestamp, 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))}
                        {isAiLoading && (
                          <div className="flex gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-accent/10 text-accent text-[10px]">
                                <Bot className="w-3.5 h-3.5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                              <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {mode === 'human' && (
                    !user ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <User className="h-12 w-12 text-muted-foreground mb-4" />
                        <h4 className="font-medium mb-2 text-sm">Sign in for Live Support</h4>
                        <p className="text-xs text-muted-foreground mb-4">Log in to chat with our support team in real-time.</p>
                        <Button size="sm" asChild>
                          <Link to="/auth">Sign In</Link>
                        </Button>
                      </div>
                    ) : !activeConversationId ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h4 className="font-medium mb-2 text-sm">Need human help?</h4>
                        <p className="text-xs text-muted-foreground mb-4">Start a conversation with our support team.</p>
                        <Button size="sm" onClick={switchToHuman} disabled={createConversation.isPending}>
                          {createConversation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Start Chat
                        </Button>
                      </div>
                    ) : messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {humanMessages?.map(msg => {
                          const isOwn = msg.sender_type === 'customer';
                          return (
                            <div key={msg.id} className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
                              {!isOwn && (
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                                    {msg.sender_type === 'bot' ? 'AI' : 'AG'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn(
                                "max-w-[80%] rounded-2xl px-3.5 py-2",
                                isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"
                              )}>
                                <p className="text-sm">{msg.message}</p>
                                <p className={cn("text-[9px] mt-1", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                  {format(new Date(msg.created_at), 'HH:mm')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}

                  {mode === 'whatsapp' && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium mb-3">Quick messages</p>
                      {whatsappQuickMessages.map(qm => (
                        <button
                          key={qm.label}
                          onClick={() => openWhatsApp(qm.message)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0">
                            <qm.icon className="w-4 h-4 text-[#25D366]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{qm.label}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{qm.message}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 border-t bg-background/80">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        mode === 'ai' ? "Ask me anything..." :
                        mode === 'whatsapp' ? "Type a message for WhatsApp..." :
                        "Type a message..."
                      }
                      className="flex-1 h-10 text-sm"
                      disabled={isAiLoading || sendMessage.isPending}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className={cn(
                        "h-10 w-10 shrink-0",
                        mode === 'whatsapp' && "bg-[#25D366] hover:bg-[#1ea952]"
                      )}
                      disabled={!message.trim() || isAiLoading || sendMessage.isPending}
                    >
                      {(isAiLoading || sendMessage.isPending) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: 'spring', stiffness: 200 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[84px] right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center md:bottom-6"
        aria-label="Open chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
        )}
      </motion.button>
    </>
  );
}
