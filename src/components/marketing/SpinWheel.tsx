import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Prize {
  id: string;
  label: string;
  color: string;
  discount?: number;
  code?: string;
}

const defaultPrizes: Prize[] = [
  { id: '1', label: '10% OFF', color: 'hsl(var(--accent))', discount: 10, code: 'SPIN10' },
  { id: '2', label: 'Try Again', color: 'hsl(var(--muted))' },
  { id: '3', label: '20% OFF', color: 'hsl(var(--success))', discount: 20, code: 'SPIN20' },
  { id: '4', label: 'Free Ship', color: 'hsl(var(--info))', code: 'FREESHIP' },
  { id: '5', label: 'Try Again', color: 'hsl(var(--muted))' },
  { id: '6', label: '₹500 OFF', color: 'hsl(var(--primary))', discount: 500, code: 'SPIN500' },
  { id: '7', label: 'Try Again', color: 'hsl(var(--muted))' },
  { id: '8', label: '15% OFF', color: 'hsl(var(--destructive))', discount: 15, code: 'SPIN15' },
];

interface SpinWheelProps {
  prizes?: Prize[];
  onWin?: (prize: Prize) => void;
  compact?: boolean;
}

export function SpinWheel({ prizes = defaultPrizes, onWin, compact = false }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const wheelRef = useRef<SVGSVGElement>(null);

  const segmentAngle = 360 / prizes.length;

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setShowConfetti(false);

    // Random number of full rotations (5-8) plus random segment
    const fullRotations = 5 + Math.floor(Math.random() * 4);
    const randomSegment = Math.floor(Math.random() * prizes.length);
    const segmentRotation = randomSegment * segmentAngle;
    const newRotation = rotation + (fullRotations * 360) + segmentRotation;

    setRotation(newRotation);

    // Determine winner after spin
    setTimeout(() => {
      const normalizedRotation = newRotation % 360;
      const winningIndex = Math.floor((360 - normalizedRotation + segmentAngle / 2) / segmentAngle) % prizes.length;
      const prize = prizes[winningIndex];
      
      setWonPrize(prize);
      setIsSpinning(false);
      setShowResult(true);

      if (prize.code) {
        setShowConfetti(true);
      }

      onWin?.(prize);
    }, 5000);
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

  const wheelSize = compact ? 'w-[220px] h-[220px]' : 'w-[300px] h-[300px]';
  const buttonSize = compact ? 'w-10 h-10 text-[10px]' : 'w-14 h-14 text-xs';

  return (
    <>
      <div className={`relative ${wheelSize} mx-auto`}>
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--primary))'][i % 4],
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
          onClick={spin}
          disabled={isSpinning}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${buttonSize} rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold z-10`}
        >
          {isSpinning ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Star className="w-4 h-4" />
            </motion.span>
          ) : (
            'SPIN'
          )}
        </Button>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              {wonPrize?.code ? (
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
            {wonPrize?.code && (
              <div className="space-y-2">
                <p className="text-muted-foreground">Use code at checkout:</p>
                <motion.div 
                  className="bg-secondary px-6 py-3 rounded-xl font-mono text-xl font-bold"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.9, 1.05, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {wonPrize.code}
                </motion.div>
              </div>
            )}
          </motion.div>
          <Button onClick={() => setShowResult(false)} className="w-full">
            {wonPrize?.code ? 'Start Shopping' : 'Try Again Later'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
