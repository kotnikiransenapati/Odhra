import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Mail,
  Copy,
  Share2,
  Send,
  Facebook,
  Twitter,
  Check,
  Link2,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import {
  type ShareableLink,
  type ShareChannel,
  executeShare,
  canNativeShare,
} from '@/lib/linkBuilder';

interface ShareSheetProps {
  shareable: ShareableLink;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after a share action completes */
  onShare?: (channel: ShareChannel) => void;
}

const channels: {
  id: ShareChannel;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10 hover:bg-[#25D366]/20' },
  { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-[#0088cc]', bg: 'bg-[#0088cc]/10 hover:bg-[#0088cc]/20' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-foreground', bg: 'bg-muted hover:bg-muted/80' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-[#34B7F1]', bg: 'bg-[#34B7F1]/10 hover:bg-[#34B7F1]/20' },
  { id: 'twitter', label: 'X (Twitter)', icon: Twitter, color: 'text-foreground', bg: 'bg-muted hover:bg-muted/80' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10 hover:bg-[#1877F2]/20' },
];

export function ShareSheet({ shareable, trigger, open, onOpenChange, onShare }: ShareSheetProps) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = (channel: ShareChannel) => {
    executeShare(channel, shareable);

    if (channel === 'copy') {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }

    onShare?.(channel);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-1.5">
      <Share2 className="w-4 h-4" />
      Share
    </Button>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        {trigger || defaultTrigger}
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-lg">Share</DrawerTitle>
          <DrawerDescription className="text-xs line-clamp-1">
            {shareable.title}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Link preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground truncate flex-1">{shareable.url}</p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 px-3 gap-1.5 text-xs"
              onClick={() => handleShare('copy')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          {/* Channel grid */}
          <div className="grid grid-cols-4 gap-3">
            {channels.map((ch, i) => (
              <motion.button
                key={ch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleShare(ch.id)}
                className="flex flex-col items-center gap-2 py-3 rounded-xl transition-colors"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${ch.bg} transition-colors`}>
                  <ch.icon className={`w-5 h-5 ${ch.color}`} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{ch.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Native share (if available) */}
          {canNativeShare() && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleShare('native')}
            >
              <Share2 className="w-4 h-4" />
              More Options
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
