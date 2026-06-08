import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Phone, HelpCircle, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

const QUICK_MESSAGES = [
  { icon: HelpCircle, label: 'General Help', message: 'Hi! I need help with something.' },
  { icon: ShoppingBag, label: 'Product Query', message: 'Hi! I have a question about a product.' },
  { icon: Truck, label: 'Track Order', message: 'Hi! I want to track my order.' },
  { icon: Phone, label: 'Call Back', message: 'Hi! Please call me back regarding my query.' },
];

export function WhatsAppFloatingButton() {
  const { isEnabled } = useFeatureFlag('whatsapp_chat');
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const { data: settings } = useQuery({
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

  if (!isEnabled || settings?.whatsapp_enabled === 'false') return null;

  const phone = settings?.whatsapp_business_phone || '919876543210';

  const openWhatsApp = (message: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleSendCustom = () => {
    if (customMessage.trim()) {
      openWhatsApp(customMessage.trim());
      setCustomMessage('');
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-24 right-4 z-50 w-[calc(100%-2rem)] max-w-sm"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-[#25D366] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Chat with us</h3>
                        <p className="text-xs text-white/80">Typically replies in minutes</p>
                      </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Quick messages */}
                <div className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium mb-3">Quick messages</p>
                  {QUICK_MESSAGES.map((qm) => (
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

                  {/* Custom message */}
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendCustom()}
                    />
                    <Button
                      size="icon"
                      className="bg-[#25D366] hover:bg-[#1ea952] shrink-0"
                      onClick={handleSendCustom}
                      disabled={!customMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: 'spring', stiffness: 200 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center md:bottom-6"
        aria-label="Chat on WhatsApp"
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

        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        )}
      </motion.button>
    </>
  );
}
