import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Star, Lock, Clock, ShoppingBag, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSpinWheel } from '@/hooks/useSpinWheel';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Prize {
  id: string;
  label: string;
  color: string;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

interface SpinWheelWithAuthProps {
  compact?: boolean;
}

export function SpinWheelWithAuth({ compact = false }: SpinWheelWithAuthProps) {
  const { user } = useAuth();
  const { eligibility, isLoading, spin, prizes, activeCode } = useSpinWheel();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [wonCode, setWonCode] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const wheelRef = useRef<SVGSVGElement>(null);

  const segmentAngle = 360 / prizes.length;

  const handleSpin = async () => {
    if (isSpinning) return;
    if (!user) {
      toast.error('Please log in to spin the wheel');
      return;
    }
    if (!eligibility?.can_spin) {
      return;
    }

    setIsSpinning(true);
    setShowResult(false);
    setShowConfetti(false);

    try {
      const result = await spin(prizes);
      const prizeIndex = prizes.findIndex(p => p.id === result.prize.id);
      
      // Random number of full rotations (5-8) plus the prize segment
      const fullRotations = 5 + Math.floor(Math.random() * 4);
      const segmentRotation = prizeIndex * segmentAngle;
      const newRotation = rotation + (fullRotations * 360) + segmentRotation;

      setRotation(newRotation);

      // Show result after spin animation
      setTimeout(() => {
        setWonPrize(result.prize);
        setWonCode(result.code || null);
        setIsSpinning(false);
        setShowResult(true);

        if (result.code) {
          setShowConfetti(true);
        }
      }, 5000);
    } catch (error) {
      setIsSpinning(false);
      toast.error('Failed to spin. Please try again.');
    }
  };

  const copyCode = () => {
    if (wonCode) {
      navigator.clipboard.writeText(wonCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const createWheelPath = (index: number, total: number) => {
    const startAngle = (index * 360) / total - 90;
    const endAngle = ((index + 1) * 360) / total - 90;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const radius = 120;
    const x1 = 150 + radius * Math.cos(startRad);
    const y1 = 150 + radius * Math.sin(startRad);
    const x2 = 150 + radius * Math.cos(endRad);
    const y2 = 150 + radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const getTextPosition = (index: number, total: number) => {
    const angle = ((index + 0.5) * 360) / total - 90;
    const rad = (angle * Math.PI) / 180;
    const radius = 80;
    return {
      x: 150 + radius * Math.cos(rad),
      y: 150 + radius * Math.sin(rad),
      rotation: angle + 90,
    };
  };

  const wheelSize = compact
    ? 'w-[min(220px,80vw)] aspect-square'
    : 'w-[min(300px,80vw)] aspect-square';
  const buttonSize = compact ? 'w-10 h-10 text-[10px]' : 'w-14 h-14 text-xs';

  const canSpin = user && eligibility?.can_spin && !isSpinning;
  const isLocked = !user || !eligibility?.can_spin;

  // Format expiry time
  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <>
      <div className="relative">
        {/* Active Code Banner */}
        {activeCode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-accent/10 border border-accent/30"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium">You have an active discount!</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="px-3 py-1 bg-background rounded-lg font-mono text-lg font-bold">
                    {activeCode.code}
                  </code>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeRemaining(activeCode.expires_at)}
                  </Badge>
                </div>
              </div>
              <Button size="sm" asChild>
                <Link to="/shop" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Shop Now
                </Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Eligibility Message */}
        {user && !eligibility?.can_spin && !activeCode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-secondary border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Spin Locked</p>
                <p className="text-sm text-muted-foreground">
                  Place an order of ₹999 or more to unlock your next spin!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-xl bg-secondary border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Login to Spin</p>
                <p className="text-sm text-muted-foreground">
                  New users get 1 free spin!
                </p>
              </div>
              <Button size="sm" asChild>
                <Link to="/auth">Login</Link>
              </Button>
            </div>
          </motion.div>
        )}

        <div className={`relative ${wheelSize} mx-auto ${isLocked ? 'opacity-60' : ''}`}>
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: ['hsl(45, 93%, 47%)', 'hsl(142, 76%, 36%)', 'hsl(199, 89%, 48%)', 'hsl(280, 65%, 60%)'][i % 4],
                    left: `${50 + (Math.random() - 0.5) * 20}%`,
                    top: '50%',
                  }}
                  initial={{ y: 0, opacity: 1, scale: 0 }}
                  animate={{
                    y: [0, -100 - Math.random() * 100],
                    x: [(Math.random() - 0.5) * 200],
                    opacity: [1, 1, 0],
                    scale: [0, 1, 0.5],
                    rotate: [0, Math.random() * 360],
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}

          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <motion.div 
              className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-accent drop-shadow-lg"
              animate={isSpinning ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3, repeat: isSpinning ? Infinity : 0 }}
            />
          </div>

          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-accent/20 blur-xl"
            animate={{ scale: isSpinning ? [1, 1.1, 1] : 1, opacity: isSpinning ? [0.3, 0.6, 0.3] : 0.3 }}
            transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
          />

          {/* Wheel */}
          <motion.svg
            ref={wheelRef}
            viewBox="0 0 300 300"
            className="w-full h-full drop-shadow-xl relative z-[1]"
            animate={{ rotate: rotation }}
            transition={{ duration: 5, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {/* Outer ring */}
            <circle cx="150" cy="150" r="140" fill="none" stroke="hsl(var(--accent))" strokeWidth="4" opacity="0.3" />
            
            {/* Segments */}
            {prizes.map((prize, index) => (
              <path
                key={prize.id}
                d={createWheelPath(index, prizes.length)}
                fill={prize.color}
                stroke="hsl(var(--background))"
                strokeWidth="2"
              />
            ))}

            {/* Labels */}
            {prizes.map((prize, index) => {
              const pos = getTextPosition(index, prizes.length);
              return (
                <text
                  key={`text-${prize.id}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${pos.rotation}, ${pos.x}, ${pos.y})`}
                  className="fill-foreground"
                  style={{ fontSize: compact ? '8px' : '10px', fontWeight: 'bold' }}
                >
                  {prize.label}
                </text>
              );
            })}

            {/* Center circle */}
            <circle cx="150" cy="150" r="25" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="3" />
            <circle cx="150" cy="150" r="20" fill="hsl(var(--accent))" />
          </motion.svg>

          {/* Spin Button */}
          <Button
            onClick={handleSpin}
            disabled={!canSpin || isLoading}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${buttonSize} rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold z-10`}
          >
            {isSpinning ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Star className="w-4 h-4" />
              </motion.span>
            ) : isLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              'SPIN'
            )}
          </Button>
        </div>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              {wonCode ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                  >
                    <Sparkles className="w-6 h-6 text-accent" />
                  </motion.div>
                  Congratulations!
                </>
              ) : (
                <>
                  <Gift className="w-6 h-6" />
                  Better Luck Next Time!
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <motion.div 
            className="py-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <div className="text-4xl font-bold mb-4" style={{ color: wonPrize?.color }}>
              {wonPrize?.label}
            </div>
            {wonCode && (
              <div className="space-y-3">
                <p className="text-muted-foreground">Your exclusive discount code:</p>
                <motion.div 
                  className="bg-secondary px-6 py-3 rounded-xl font-mono text-xl font-bold flex items-center justify-center gap-3"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.9, 1.05, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {wonCode}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyCode}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </motion.div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Valid for 7 days
                </div>
              </div>
            )}
            {!wonCode && (
              <p className="text-muted-foreground">
                Place an order of ₹999+ to unlock another spin!
              </p>
            )}
          </motion.div>
          <Button onClick={() => setShowResult(false)} className="w-full" asChild>
            <Link to="/shop">
              {wonCode ? 'Start Shopping' : 'Browse Products'}
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
