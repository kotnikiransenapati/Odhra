import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

interface VoiceSearchButtonProps {
  onResult: (transcript: string) => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceSearchButton({ onResult, className, size = 'icon' }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-IN';
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable it in your browser settings.');
        } else if (event.error === 'no-speech') {
          toast.info('No speech detected. Please try again.');
        } else {
          toast.error('Voice search error. Please try again.');
        }
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
    
    return () => {
      if (recognition) {
        recognition.abort();
      }
    };
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
        toast.info('Listening... Speak now', { duration: 2000 });
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice search');
      }
    }
  }, [isListening, recognition]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <Button
      type="button"
      variant={isListening ? 'default' : 'ghost'}
      size={size}
      onClick={toggleListening}
      className={cn(
        'relative transition-all duration-300',
        isListening && 'bg-destructive hover:bg-destructive/90',
        className
      )}
      aria-label={isListening ? 'Stop listening' : 'Start voice search'}
    >
      <AnimatePresence mode="wait">
        {isListening ? (
          <motion.div
            key="listening"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="relative"
          >
            <MicOff className="w-4 h-4" />
            {/* Pulsing ring animation */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-destructive-foreground"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [1, 0, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Mic className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
