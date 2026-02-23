import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Minimize2, Bot, Sparkles, User } from 'lucide-react';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickActions = [
  { label: '🔍 Find products', prompt: 'Help me find a product' },
  { label: '📦 Track order', prompt: 'How do I track my order?' },
  { label: '↩️ Returns', prompt: 'What is your return policy?' },
  { label: '💎 Deals', prompt: 'Show me the best deals today' },
];

export function LiveChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'ai' | 'human'>('ai');
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Human chat hooks
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { data: conversations } = useConversations();
  const { data: messages, isLoading: messagesLoading } = useConversationMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const { isConnected } = useRealtimeMessages(activeConversationId);

  useEffect(() => {
    if (conversations?.length && !activeConversationId && mode === 'human') {
      const openConvo = conversations.find(c => c.status === 'open' || c.status === 'assigned');
      if (openConvo) setActiveConversationId(openConvo.id);
    }
  }, [conversations, activeConversationId, mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiMessages]);

  const sendAIMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);
    setMessage('');

    try {
      const chatHistory = [...aiMessages, userMsg].slice(-10).map(m => ({
        role: m.role, content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: { messages: chatHistory, context: 'Shopping assistant on Odhra marketplace' },
      });

      if (error) throw error;

      // Handle streaming response
      let responseText = '';
      if (data && typeof data === 'object' && 'choices' in data) {
        responseText = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t process that.';
      } else if (typeof data === 'string') {
        // Parse SSE stream
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6));
              responseText += parsed.choices?.[0]?.delta?.content || '';
            } catch { /* skip */ }
          }
        }
      }

      if (!responseText) responseText = 'I\'m here to help! Could you rephrase your question?';

      const aiMsg: AIMessage = { id: `a-${Date.now()}`, role: 'assistant', content: responseText, timestamp: new Date() };
      setAiMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: AIMessage = { 
        id: `e-${Date.now()}`, role: 'assistant', 
        content: 'I\'m having trouble connecting. Try again or switch to live support!', 
        timestamp: new Date() 
      };
      setAiMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  }, [aiMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (mode === 'ai') {
      sendAIMessage(message);
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

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-36 right-4 z-50 md:bottom-24"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-xl relative group"
              onClick={() => setIsOpen(true)}
            >
              <Sparkles className="h-5 w-5 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
              <MessageCircle className="h-6 w-6 group-hover:opacity-0 transition-opacity" />
            </Button>
            {conversations?.some(c => c.status === 'open') && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-pulse" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 right-4 z-50 w-[calc(100%-2rem)] max-w-sm md:bottom-24"
          >
            <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    {mode === 'ai' ? <Bot className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{mode === 'ai' ? 'AI Assistant' : 'Live Support'}</h3>
                    <p className="text-[11px] opacity-80 flex items-center gap-1">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        mode === 'ai' ? "bg-accent" : isConnected ? "bg-success" : "bg-warning"
                      )} />
                      {mode === 'ai' ? 'Instant replies' : isConnected ? 'Connected' : 'Connecting...'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {/* Mode toggle */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[10px] text-primary-foreground hover:bg-primary-foreground/20 gap-1 px-2"
                    onClick={() => mode === 'ai' ? switchToHuman() : setMode('ai')}
                  >
                    {mode === 'ai' ? <><User className="h-3 w-3" /> Human</> : <><Bot className="h-3 w-3" /> AI</>}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                {mode === 'ai' ? (
                  /* AI Mode */
                  aiMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                        <Sparkles className="h-7 w-7 text-accent" />
                      </div>
                      <h4 className="font-semibold mb-1 text-sm">Hi! I'm Odhra's AI Assistant</h4>
                      <p className="text-xs text-muted-foreground mb-5">
                        Ask me anything about products, orders, or style advice.
                      </p>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        {quickActions.map((action) => (
                          <button
                            key={action.label}
                            onClick={() => sendAIMessage(action.prompt)}
                            className="text-left text-[11px] p-2.5 rounded-xl border border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all duration-200"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}
                        >
                          {msg.role === 'assistant' && (
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-accent/10 text-accent text-[10px]">
                                <Bot className="w-3.5 h-3.5" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3.5 py-2",
                              msg.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary rounded-bl-md"
                            )}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={cn(
                              "text-[9px] mt-1",
                              msg.role === 'user' ? "text-primary-foreground/60" : "text-muted-foreground"
                            )}>
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
                ) : (
                  /* Human Mode */
                  !activeConversationId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <h4 className="font-medium mb-2 text-sm">Need human help?</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Start a conversation with our support team.
                      </p>
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
                      {messages?.map((msg) => {
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
              </ScrollArea>

              {/* Input */}
              <form onSubmit={handleSend} className="p-3 border-t bg-background/80">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={mode === 'ai' ? "Ask me anything..." : "Type a message..."}
                    className="flex-1 h-10 text-sm"
                    disabled={isAiLoading || sendMessage.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-10 w-10"
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
        )}
      </AnimatePresence>
    </>
  );
}
