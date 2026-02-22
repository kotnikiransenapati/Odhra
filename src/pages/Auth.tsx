import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
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
import { Eye, EyeOff, ArrowLeft, Sparkles, Shield, Truck, CreditCard, Gift, Crown, Star, Diamond } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

type AuthMode = 'signin' | 'signup' | 'otp';

const features = [
  { icon: Shield, title: 'Verified Vendors', description: 'Every seller is vetted for quality and authenticity' },
  { icon: Truck, title: 'Premium Delivery', description: 'White-glove logistics with real-time tracking' },
  { icon: CreditCard, title: 'Secure Payments', description: 'Bank-grade encryption on every transaction' },
];

const testimonial = {
  quote: "Odhra transformed how I shop for luxury goods. The curation is impeccable.",
  author: "Priya Sharma",
  role: "Diamond Tier Member",
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Redirect destination after auth (from ProtectedRoute state)
  const redirectTo = (location.state as any)?.from?.pathname || '/';
  const { user } = useAuth();

  // If already logged in, redirect away from auth page
  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      setMode('signup');
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
      navigate(redirectTo);
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
            referral_code: referralCode,
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
          const { data: refCodeData } = await supabase
            .from('referral_codes')
            .select('user_id')
            .eq('code', referralCode)
            .eq('is_active', true)
            .maybeSingle();

          if (refCodeData && refCodeData.user_id !== authData.user.id) {
            await supabase.from('referrals').insert({
              referrer_id: refCodeData.user_id,
              referred_id: authData.user.id,
              referral_code: referralCode,
              status: 'pending',
              referrer_reward: 100,
              referred_reward: 50,
            });

            await supabase.rpc('generate_referral_code', { p_user_id: refCodeData.user_id });
          }
        } catch (refError) {
          console.error('Error applying referral:', refError);
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
      navigate(redirectTo);
    } catch (err) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <SEOHead title={mode === 'signin' ? 'Sign In' : 'Create Account'} description="Sign in or create your Odhra account to access exclusive deals, track orders, and join our premium marketplace." noIndex />
      {/* Left: Luxury Brand Panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Deep indigo base */}
        <div className="absolute inset-0 bg-sidebar-background" />
        
        {/* Subtle radial gradient */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, hsl(var(--sidebar-accent)) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, hsl(var(--accent) / 0.06) 0%, transparent 50%)',
        }} />

        {/* Gold accent line at the right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--sidebar-foreground)) 0.5px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        {/* Floating gold orb - top right */}
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Floating gold orb - bottom left */}
        <motion.div
          className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.05) 0%, transparent 70%)' }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-accent/12 border border-accent/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent" />
            </div>
            <span className="text-2xl font-bold text-sidebar-foreground tracking-tight">Odhra</span>
          </motion.div>

          {/* Center: Hero */}
          <div className="flex-1 flex flex-col justify-center -mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 48 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="h-0.5 bg-accent mb-8 rounded-full"
              />
              
               <h1 className="text-[2.75rem] xl:text-[3.25rem] leading-[1.1] font-bold text-sidebar-foreground mb-6 tracking-tight">
                Where Luxury
                <br />
                <span className="text-accent">Meets Innovation</span>
              </h1>
              
              <p className="text-lg text-sidebar-foreground/60 font-light leading-relaxed max-w-md mb-10">
                Curated collections from the world's most exclusive vendors, 
                all in one premium marketplace.
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-8">
                {[
                  { value: '10K+', label: 'Products' },
                  { value: '500+', label: 'Vendors' },
                  { value: '50K+', label: 'Customers' },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    className="text-center"
                  >
                    <p className="text-2xl xl:text-3xl font-bold text-accent">{stat.value}</p>
                    <p className="text-xs text-sidebar-foreground/50 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom: Features + Testimonial */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="space-y-6"
          >
            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-sidebar-foreground/4 border border-sidebar-foreground/8 backdrop-blur-sm"
                >
                  <feature.icon className="w-4 h-4 text-accent" />
                  <span className="text-sm text-sidebar-foreground/88 font-medium">{feature.title}</span>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="p-5 rounded-xl bg-sidebar-foreground/3 border border-sidebar-foreground/6"
            >
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-sidebar-foreground/70 italic leading-relaxed mb-3">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
                  <Diamond className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-sidebar-foreground/88">{testimonial.author}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right: Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 lg:p-12 relative">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back</span>
        </button>
        
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <motion.div 
          className="w-full max-w-[420px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
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
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-sm">Back</span>
                </button>
                
                <div className="text-center mb-8">
                  <motion.div 
                    className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.1 }}
                  >
                    <Shield className="w-7 h-7 text-accent" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter the 6-digit code sent to
                    <br />
                    <span className="font-semibold text-foreground">{pendingEmail}</span>
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
                <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight">Odhra</span>
                </div>
                
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.h2 
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold mb-2 tracking-tight"
                  >
                    {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                  </motion.h2>
                  <p className="text-muted-foreground text-sm">
                    {mode === 'signin' 
                      ? 'Sign in to your luxury marketplace' 
                      : 'Join the exclusive marketplace'}
                  </p>
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
                      <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="you@example.com" 
                        {...signInForm.register('email')} 
                        className="h-12 bg-secondary/50 border-border/50 focus:border-accent focus:bg-background transition-all rounded-xl" 
                      />
                      {signInForm.formState.errors.email && (
                        <p className="text-destructive text-xs mt-1">{signInForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••" 
                          {...signInForm.register('password')} 
                          className="h-12 pr-12 bg-secondary/50 border-border/50 focus:border-accent focus:bg-background transition-all rounded-xl" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {signInForm.formState.errors.password && (
                        <p className="text-destructive text-xs mt-1">{signInForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <Link to="/reset-password" className="text-xs text-accent font-medium hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-sm font-semibold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-all shadow-accent rounded-xl btn-press" 
                      disabled={isLoading}
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                      <Input 
                        id="fullName" 
                        placeholder="John Doe" 
                        {...signUpForm.register('fullName')} 
                        className="h-12 bg-secondary/50 border-border/50 focus:border-accent focus:bg-background transition-all rounded-xl" 
                      />
                      {signUpForm.formState.errors.fullName && (
                        <p className="text-destructive text-xs mt-1">{signUpForm.formState.errors.fullName.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="signupEmail" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                      <Input 
                        id="signupEmail" 
                        type="email" 
                        placeholder="you@example.com" 
                        {...signUpForm.register('email')} 
                        className="h-12 bg-secondary/50 border-border/50 focus:border-accent focus:bg-background transition-all rounded-xl" 
                      />
                      {signUpForm.formState.errors.email && (
                        <p className="text-destructive text-xs mt-1">{signUpForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="signupPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                        <div className="relative">
                          <Input 
                            id="signupPassword" 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="••••••••" 
                            {...signUpForm.register('password')} 
                            className="h-12 pr-12 bg-secondary/50 border-border/50 focus:border-accent focus:bg-background transition-all rounded-xl" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {signUpForm.formState.errors.password && (
                          <p className="text-destructive text-xs mt-1">{signUpForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      <PasswordStrengthIndicator password={watchedPassword || ''} />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="••••••••" 
                        {...signUpForm.register('confirmPassword')} 
                        className="h-12 bg-secondary/50 border-border/50 focus:border-accent focus:bg-background transition-all rounded-xl" 
                      />
                      {signUpForm.formState.errors.confirmPassword && (
                        <p className="text-destructive text-xs mt-1">{signUpForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-sm font-semibold uppercase tracking-wider bg-accent text-accent-foreground hover:bg-accent/90 transition-all shadow-accent rounded-xl btn-press" 
                      disabled={isLoading}
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
                    </Button>
                    
                    <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                      By signing up, you agree to our{' '}
                      <Link to="/terms" className="text-accent hover:underline">Terms</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
                    </p>
                  </form>
                )}

                {/* Toggle */}
                <p className="text-center text-sm text-muted-foreground mt-8">
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
        </motion.div>
      </div>
    </div>
  );
}
