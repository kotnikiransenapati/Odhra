import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  useReferralCode, 
  useGenerateReferralCode, 
  useReferralStats,
  useMyReferrals,
  REFERRAL_CONFIG 
} from '@/hooks/useReferrals';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { ShareSheet } from '@/components/sharing/ShareSheet';
import { buildReferralShareable } from '@/lib/linkBuilder';
import { 
  Users, Gift, Copy, CheckCircle, Clock, TrendingUp, Loader2, Sparkles, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export function ReferralDashboard() {
  const { user } = useAuth();
  const { data: referralCode, isLoading: codeLoading } = useReferralCode();
  const { data: stats, isLoading: statsLoading } = useReferralStats();
  const { data: referrals } = useMyReferrals();
  const generateCode = useGenerateReferralCode();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const referralShareable = referralCode?.code
    ? buildReferralShareable(referralCode.code, { reward: REFERRAL_CONFIG.referredReward })
    : null;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = codeLoading || statsLoading;

  return (
    <div className="space-y-6">
      {/* Hero referral card */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-accent via-accent/90 to-primary text-accent-foreground relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Gift className="w-6 h-6" />
                Refer & Earn
              </h3>
              <p className="text-accent-foreground/70 text-sm mt-1">
                Invite friends, both earn rewards
              </p>
            </div>
            <Badge variant="secondary" className="bg-accent-foreground/20 text-accent-foreground border-0 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              {REFERRAL_CONFIG.referrerReward} pts each
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : referralCode?.code ? (
            <>
              <div className="bg-accent-foreground/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-accent-foreground/10">
                <p className="text-xs text-accent-foreground/60 mb-1.5 uppercase tracking-wider font-medium">Your referral code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-2xl font-mono font-bold tracking-[0.2em]">
                    {referralCode.code}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-accent-foreground/20 hover:bg-accent-foreground/30 text-accent-foreground border-0 backdrop-blur-sm"
                    onClick={() => handleCopy(referralCode.code)}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {referralShareable && (
                <ShareSheet
                  shareable={referralShareable}
                  trigger={
                    <Button className="w-full bg-background text-accent hover:bg-background/90 gap-2 font-semibold">
                      <Gift className="w-4 h-4" />
                      Share with Friends
                    </Button>
                  }
                />
              )}
            </>
          ) : (
            <Button 
              className="w-full bg-background text-accent hover:bg-background/90 gap-2 font-semibold"
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
            >
              {generateCode.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" />Get Your Referral Code</>}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Referrals', value: stats.totalReferrals, icon: Users, color: 'text-info', bg: 'bg-info/10' },
            { label: 'Successful', value: stats.successfulReferrals, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Pending', value: stats.pendingReferrals, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Points Earned', value: stats.totalEarnings, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* How it works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:gap-0">
            {[
              { step: 1, title: 'Share your code', desc: 'Send your unique code to friends' },
              { step: 2, title: 'Friend signs up', desc: 'They create an account with your code' },
              { step: 3, title: 'Both earn rewards', desc: `You get ${REFERRAL_CONFIG.referrerReward} pts, they get ${REFERRAL_CONFIG.referredReward} pts!` },
            ].map((item, i) => (
              <div key={item.step} className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                {i < 2 && <ArrowRight className="hidden md:block w-4 h-4 text-muted-foreground/40 mt-2 shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals && referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Referrals</CardTitle>
            <CardDescription className="text-xs">Track your referral progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.map((referral) => (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      referral.status === 'completed' ? 'bg-success/10' : 'bg-warning/10'
                    }`}>
                      {referral.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <Clock className="w-4 h-4 text-warning" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Referral #{referral.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {referral.status}
                    </Badge>
                    {referral.status === 'completed' && (
                      <p className="text-xs text-success font-medium mt-1">+{referral.referrer_reward} pts</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
