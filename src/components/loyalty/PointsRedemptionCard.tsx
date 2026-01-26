import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Gift, 
  Percent, 
  Truck, 
  CreditCard,
  Loader2,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  useRedemptionOptions, 
  useRedeemPoints, 
  useActiveRedemptionCodes,
  type RedemptionOption,
  type PointsRedemption
} from '@/hooks/usePointsRedemption';
import { useLoyaltyPoints } from '@/hooks/useLoyalty';
import { toast } from 'sonner';

const rewardTypeIcons = {
  discount_percentage: Percent,
  discount_fixed: Gift,
  free_shipping: Truck,
  gift_card: CreditCard,
};

interface RedemptionOptionCardProps {
  option: RedemptionOption;
  userPoints: number;
  onRedeem: () => void;
  isRedeeming: boolean;
}

function RedemptionOptionCard({ option, userPoints, onRedeem, isRedeeming }: RedemptionOptionCardProps) {
  const canAfford = userPoints >= option.points_cost;
  const Icon = rewardTypeIcons[option.reward_type] || Gift;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 border rounded-lg transition-colors ${
        canAfford 
          ? 'border-border hover:border-accent/50 cursor-pointer' 
          : 'border-border/50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{option.name}</h4>
          {option.description && (
            <p className="text-sm text-muted-foreground">{option.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{option.points_cost.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
      </div>
      <Button 
        className="w-full mt-4 gap-2" 
        disabled={!canAfford || isRedeeming}
        onClick={onRedeem}
      >
        {isRedeeming ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Redeem
          </>
        )}
      </Button>
    </motion.div>
  );
}

function ActiveCodeCard({ redemption }: { redemption: PointsRedemption }) {
  const [copied, setCopied] = useState(false);
  const details = redemption.reward_details as { name: string; type: string; value: Record<string, number> };
  const expiresAt = redemption.expires_at ? new Date(redemption.expires_at) : null;
  const daysLeft = expiresAt 
    ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleCopy = async () => {
    if (redemption.reward_code) {
      await navigator.clipboard.writeText(redemption.reward_code);
      setCopied(true);
      toast.success('Code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-3 border rounded-lg bg-accent/5 border-accent/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{details.name}</p>
          <code className="text-lg font-mono font-bold text-accent">
            {redemption.reward_code}
          </code>
        </div>
        <div className="flex items-center gap-2">
          {daysLeft !== null && (
            <Badge variant="outline" className="text-xs">
              {daysLeft}d left
            </Badge>
          )}
          <Button size="icon" variant="ghost" onClick={handleCopy}>
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PointsRedemptionCard() {
  const { data: loyalty } = useLoyaltyPoints();
  const { data: options, isLoading } = useRedemptionOptions(loyalty?.tier);
  const { data: activeCodes } = useActiveRedemptionCodes();
  const redeemPoints = useRedeemPoints();
  const [selectedOption, setSelectedOption] = useState<RedemptionOption | null>(null);

  const userPoints = loyalty?.points || 0;

  const handleRedeem = async () => {
    if (!selectedOption) return;
    await redeemPoints.mutateAsync(selectedOption.id);
    setSelectedOption(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              Redeem Points
            </CardTitle>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {userPoints.toLocaleString()} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Codes */}
          {activeCodes && activeCodes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Your Active Codes</h4>
              <div className="space-y-2">
                {activeCodes.map(code => (
                  <ActiveCodeCard key={code.id} redemption={code} />
                ))}
              </div>
            </div>
          )}

          {/* Redemption Options */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Available Rewards</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {options?.map(option => (
                <RedemptionOptionCard
                  key={option.id}
                  option={option}
                  userPoints={userPoints}
                  onRedeem={() => setSelectedOption(option)}
                  isRedeeming={redeemPoints.isPending}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedOption} onOpenChange={() => setSelectedOption(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              You're about to redeem <strong>{selectedOption?.points_cost.toLocaleString()}</strong> points 
              for <strong>{selectedOption?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between text-sm">
              <span>Current Points</span>
              <span className="font-medium">{userPoints.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span>After Redemption</span>
              <span className="font-medium text-accent">
                {(userPoints - (selectedOption?.points_cost || 0)).toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOption(null)}>
              Cancel
            </Button>
            <Button onClick={handleRedeem} disabled={redeemPoints.isPending}>
              {redeemPoints.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirm Redemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
