import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { OTPInput } from '@/components/auth/OTPInput';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { signUpSchema, signInSchema, type SignUpFormData, type SignInFormData } from '@/lib/validations/auth';
import { Eye, EyeOff, ArrowLeft, Sparkles, Shield, Truck, CreditCard, Gift } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'otp';

const features = [
  { icon: Shield, title: 'Verified Vendors', description: 'Every seller is vetted for quality' },
  { icon: Truck, title: 'Premium Delivery', description: 'White-glove service worldwide' },
  { icon: CreditCard, title: 'Secure Payments', description: 'Bank-grade encryption' },
];

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      setMode('signup'); // Switch to signup mode when referral code is present
      toast.info(`Referral code ${refCode.toUpperCase()} applied!`, {
        description: 'Create an account to receive your bonus points.',
      });
    }
  }, [searchParams]);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  // Watch password for strength indicator
  const watchedPassword = signUpForm.watch('password');

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email first');
          setPendingEmail(data.email);
          setMode('otp');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { 
            full_name: data.fullName,
            referral_code: referralCode, // Store referral code in user metadata
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // If user was created and has a referral code, apply it
      if (authData?.user && referralCode) {
        try {
          // Find the referral code owner
          const { data: refCodeData } = await supabase
            .from('referral_codes')
            .select('user_id')
            .eq('code', referralCode)
            .eq('is_active', true)
            .maybeSingle();

          if (refCodeData && refCodeData.user_id !== authData.user.id) {
            // Create pending referral record
            await supabase.from('referrals').insert({
              referrer_id: refCodeData.user_id,
              referred_id: authData.user.id,
              referral_code: referralCode,
              status: 'pending',
              referrer_reward: 100,
              referred_reward: 50,
            });

            // Update referral code stats
            await supabase.rpc('generate_referral_code', { p_user_id: refCodeData.user_id });
          }
        } catch (refError) {
          console.error('Error applying referral:', refError);
          // Don't fail signup for referral errors
        }
      }

      toast.success('Check your email for verification code!');
      setPendingEmail(data.email);
      setMode('otp');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: 'signup',
      });

      if (error) {
        toast.error('Invalid or expired code. Please try again.');
        return;
      }

      toast.success('Email verified! Welcome to Odhra.');
      navigate('/');
    } catch (err) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        
        {/* Animated Orbs */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-20 left-20 w-72 h-72 bg-accent/30 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-40 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        {/* Glass Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top: Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 bg-accent/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <span className="text-3xl font-bold text-primary-foreground tracking-tight">Odhra</span>
          </motion.div>

          {/* Center: Tagline */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-display-lg text-primary-foreground font-bold leading-tight mb-6">
              Where Luxury<br />
              <span className="text-accent">Meets Innovation</span>
            </h1>
            <p className="text-xl text-primary-foreground/80 font-light leading-relaxed max-w-md mb-12">
              Discover curated collections from the world's most exclusive vendors, 
              all in one premium marketplace.
            </p>

            {/* Stats */}
            <div className="flex gap-10">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <p className="text-4xl font-bold text-accent">10K+</p>
                <p className="text-primary-foreground/60 text-sm mt-1">Products</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <p className="text-4xl font-bold text-accent">500+</p>
                <p className="text-primary-foreground/60 text-sm mt-1">Vendors</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <p className="text-4xl font-bold text-accent">50K+</p>
                <p className="text-primary-foreground/60 text-sm mt-1">Customers</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Bottom: Features */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="space-y-4"
          >
            {features.map((feature, index) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div className="p-2 bg-accent/20 rounded-lg">
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-primary-foreground font-medium text-sm">{feature.title}</p>
                  <p className="text-primary-foreground/60 text-xs">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right: Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="glass rounded-2xl p-8 shadow-xl border border-border/50">
            <AnimatePresence mode="wait">
              {mode === 'otp' ? (
                <motion.div 
                  key="otp" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button 
                    onClick={() => setMode('signup')} 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                  </button>
                  
                  <div className="text-center mb-8">
                    <motion.div 
                      className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                    >
                      <Shield className="w-8 h-8 text-accent" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                    <p className="text-muted-foreground">
                      Enter the 6-digit code sent to<br />
                      <span className="font-medium text-foreground">{pendingEmail}</span>
                    </p>
                  </div>
                  
                  <OTPInput 
                    onComplete={handleOTPComplete} 
                    disabled={isLoading}
                    email={pendingEmail}
                    showResend={true}
                    cooldownSeconds={60}
                  />
                  
                  {isLoading && (
                    <div className="flex justify-center mt-6">
                      <LoadingSpinner />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="auth" 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Mobile Logo */}
                  <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
                    <div className="p-1.5 bg-accent/10 rounded-lg">
                      <Sparkles className="w-6 h-6 text-accent" />
                    </div>
                    <span className="text-2xl font-bold">Odhra</span>
                  </div>
                  
                  {/* Header */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">
                      {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-muted-foreground">
                      {mode === 'signin' 
                        ? 'Sign in to continue shopping' 
                        : 'Join the luxury marketplace'}
                    </p>
                    {/* Show referral bonus badge */}
                    {mode === 'signup' && referralCode && (
                      <Badge variant="secondary" className="mt-3 gap-1.5 bg-accent/10 text-accent border-accent/20">
                        <Gift className="w-3.5 h-3.5" />
                        +50 bonus points with code {referralCode}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Social Auth */}
                  <SocialAuthButtons isLoading={isLoading} />
                  <AuthDivider />

                  {/* Forms */}
                  {mode === 'signin' ? (
                    <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="you@example.com" 
                          {...signInForm.register('email')} 
                          className="h-12 bg-card border-border/50 focus:border-accent transition-colors" 
                        />
                        {signInForm.formState.errors.email && (
                          <p className="text-destructive text-sm">{signInForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Input 
                            id="password" 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="••••••••" 
                            {...signInForm.register('password')} 
                            className="h-12 pr-12 bg-card border-border/50 focus:border-accent transition-colors" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {signInForm.formState.errors.password && (
                          <p className="text-destructive text-sm">{signInForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="flex justify-end">
                        <Link to="/reset-password" className="text-sm text-accent hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl btn-press" 
                        disabled={isLoading}
                      >
                        {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                        <Input 
                          id="fullName" 
                          placeholder="John Doe" 
                          {...signUpForm.register('fullName')} 
                          className="h-12 bg-card border-border/50 focus:border-accent transition-colors" 
                        />
                        {signUpForm.formState.errors.fullName && (
                          <p className="text-destructive text-sm">{signUpForm.formState.errors.fullName.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="signupEmail" className="text-sm font-medium">Email</Label>
                        <Input 
                          id="signupEmail" 
                          type="email" 
                          placeholder="you@example.com" 
                          {...signUpForm.register('email')} 
                          className="h-12 bg-card border-border/50 focus:border-accent transition-colors" 
                        />
                        {signUpForm.formState.errors.email && (
                          <p className="text-destructive text-sm">{signUpForm.formState.errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="signupPassword" className="text-sm font-medium">Password</Label>
                          <div className="relative">
                            <Input 
                              id="signupPassword" 
                              type={showPassword ? 'text' : 'password'} 
                              placeholder="••••••••" 
                              {...signUpForm.register('password')} 
                              className="h-12 pr-12 bg-card border-border/50 focus:border-accent transition-colors" 
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPassword(!showPassword)} 
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {signUpForm.formState.errors.password && (
                            <p className="text-destructive text-sm">{signUpForm.formState.errors.password.message}</p>
                          )}
                        </div>
                        <PasswordStrengthIndicator password={watchedPassword || ''} />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                        <Input 
                          id="confirmPassword" 
                          type="password" 
                          placeholder="••••••••" 
                          {...signUpForm.register('confirmPassword')} 
                          className="h-12 bg-card border-border/50 focus:border-accent transition-colors" 
                        />
                        {signUpForm.formState.errors.confirmPassword && (
                          <p className="text-destructive text-sm">{signUpForm.formState.errors.confirmPassword.message}</p>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl btn-press" 
                        disabled={isLoading}
                      >
                        {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
                      </Button>
                      
                      <p className="text-xs text-center text-muted-foreground">
                        By signing up, you agree to our{' '}
                        <a href="/terms" className="text-accent hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>
                      </p>
                    </form>
                  )}

                  {/* Toggle */}
                  <p className="text-center text-sm text-muted-foreground mt-6">
                    {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} 
                      className="text-accent font-semibold hover:underline"
                    >
                      {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
