import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Gift, Info, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpinWheelWithAuth } from '@/components/marketing/SpinWheelWithAuth';
import { Navbar } from '@/components/layout/Navbar';

export default function SpinToWin() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 text-accent mb-4">
              <Sparkles className="w-6 h-6" />
              <span className="text-sm font-medium uppercase tracking-wider">Win Exclusive Discounts</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Spin to Win!</h1>
            <p className="text-muted-foreground text-lg">
              Try your luck and win exclusive discounts on your next purchase
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass overflow-hidden">
              <CardContent className="p-8">
                <SpinWheelWithAuth />
              </CardContent>
            </Card>
          </motion.div>

          {/* Rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Gift className="w-3 h-3 text-accent" />
                    </div>
                    <span><strong className="text-foreground">New users:</strong> Get 1 free spin when you sign up!</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShoppingCart className="w-3 h-3 text-accent" />
                    </div>
                    <span><strong className="text-foreground">Unlock more spins:</strong> Place an order of ₹999 or more to earn another spin</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-accent" />
                    </div>
                    <span><strong className="text-foreground">24-hour codes:</strong> Discount codes are valid for 24 hours after winning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-accent" />
                    </div>
                    <span><strong className="text-foreground">Single use:</strong> Each code can be used once per customer</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
