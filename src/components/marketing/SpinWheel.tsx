import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import confetti from 'canvas-confetti';

interface Prize {
  id: string;
  label: string;
  color: string;
  discount?: number;
  code?: string;
}

const defaultPrizes: Prize[] = [
  { id: '1', label: '10% OFF', color: 'hsl(45, 93%, 47%)', discount: 10, code: 'SPIN10' },
  { id: '2', label: 'Try Again', color: 'hsl(220, 14%, 96%)' },
  { id: '3', label: '20% OFF', color: 'hsl(142, 76%, 36%)', discount: 20, code: 'SPIN20' },
  { id: '4', label: 'Free Ship', color: 'hsl(199, 89%, 48%)', code: 'FREESHIP' },
  { id: '5', label: 'Try Again', color: 'hsl(220, 14%, 96%)' },
  { id: '6', label: '₹500 OFF', color: 'hsl(280, 65%, 60%)', discount: 500, code: 'SPIN500' },
  { id: '7', label: 'Try Again', color: 'hsl(220, 14%, 96%)' },
  { id: '8', label: '15% OFF', color: 'hsl(0, 84%, 60%)', discount: 15, code: 'SPIN15' },
];

interface SpinWheelProps {
  prizes?: Prize[];
  onWin?: (prize: Prize) => void;
}

export function SpinWheel({ prizes = defaultPrizes, onWin }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);

  const segmentAngle = 360 / prizes.length;

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);

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
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
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

  return (
    <>
      <div className="relative w-[300px] h-[300px] mx-auto">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-accent" />
        </div>

        {/* Wheel */}
        <motion.svg
          ref={wheelRef}
          viewBox="0 0 300 300"
          className="w-full h-full drop-shadow-xl"
          animate={{ rotate: rotation }}
          transition={{ duration: 5, ease: [0.2, 0.8, 0.2, 1] }}
        >
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
                className="text-[10px] font-bold fill-foreground"
                style={{ fontSize: '10px', fontWeight: 'bold' }}
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xs z-10"
        >
          {isSpinning ? '...' : 'SPIN'}
        </Button>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
              {wonPrize?.code ? (
                <>
                  <Sparkles className="w-6 h-6 text-accent" />
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
          <div className="py-6">
            <div className="text-4xl font-bold mb-4" style={{ color: wonPrize?.color }}>
              {wonPrize?.label}
            </div>
            {wonPrize?.code && (
              <div className="space-y-2">
                <p className="text-muted-foreground">Use code at checkout:</p>
                <div className="bg-secondary px-6 py-3 rounded-xl font-mono text-xl font-bold">
                  {wonPrize.code}
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setShowResult(false)} className="w-full">
            {wonPrize?.code ? 'Start Shopping' : 'Try Again Later'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
