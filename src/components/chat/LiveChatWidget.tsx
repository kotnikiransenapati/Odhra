import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Minimize2 } from 'lucide-react';
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function LiveChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useConversations();
  const { data: messages, isLoading: messagesLoading } = useConversationMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const { isConnected } = useRealtimeMessages(activeConversationId);

  // Auto-select most recent open conversation
  useEffect(() => {
    if (conversations?.length && !activeConversationId) {
      const openConvo = conversations.find(c => c.status === 'open' || c.status === 'assigned');
      if (openConvo) {
        setActiveConversationId(openConvo.id);
      }
    }
  }, [conversations, activeConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartChat = async () => {
    const result = await createConversation.mutateAsync('General Inquiry');
    setActiveConversationId(result.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeConversationId) return;

    await sendMessage.mutateAsync({
      conversationId: activeConversationId,
      message: message.trim()
    });
    setMessage('');
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
            className="fixed bottom-20 right-4 z-50 md:bottom-6"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-6 w-6" />
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
            className="fixed bottom-20 right-4 z-50 w-[calc(100%-2rem)] max-w-sm md:bottom-6"
          >
            <div className="bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Live Support</h3>
                    <p className="text-xs opacity-80 flex items-center gap-1">
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        isConnected ? "bg-green-400" : "bg-yellow-400"
                      )} />
                      {isConnected ? 'Connected' : 'Connecting...'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <Minimize2 className="h-4 w-4" />
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

              {/* Messages */}
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                {!activeConversationId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h4 className="font-medium mb-2">Need help?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start a conversation with our support team.
                    </p>
                    <Button onClick={handleStartChat} disabled={createConversation.isPending}>
                      {createConversation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Start Chat
                    </Button>
                  </div>
                ) : messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <p>Send a message to start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages?.map((msg) => {
                      const isOwn = msg.sender_type === 'customer';
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            isOwn ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {msg.sender_type === 'bot' ? 'AI' : 'AG'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-2",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p className={cn(
                              "text-[10px] mt-1",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              {activeConversationId && (
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sendMessage.isPending}
                    />
                    <Button 
                      type="submit" 
                      size="icon"
                      disabled={!message.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
