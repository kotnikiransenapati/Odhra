import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { OTPInput } from '@/components/auth/OTPInput';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { signUpSchema, signInSchema, type SignUpFormData, type SignInFormData } from '@/lib/validations/auth';
import { Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'otp';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

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
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: data.fullName },
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
    <div className="min-h-screen flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/20" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-accent rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-accent/50 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-10 h-10 text-accent" />
              <h1 className="text-4xl font-bold text-primary-foreground tracking-tight">Odhra</h1>
            </div>
            <p className="text-display-sm text-primary-foreground/90 font-light leading-relaxed max-w-md">
              Where luxury meets innovation. Discover curated collections from premium vendors.
            </p>
            <div className="mt-12 flex gap-8">
              <div><p className="text-3xl font-bold text-accent">10K+</p><p className="text-primary-foreground/70 text-sm">Products</p></div>
              <div><p className="text-3xl font-bold text-accent">500+</p><p className="text-primary-foreground/70 text-sm">Vendors</p></div>
              <div><p className="text-3xl font-bold text-accent">50K+</p><p className="text-primary-foreground/70 text-sm">Customers</p></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right: Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="glass rounded-2xl p-8 shadow-xl">
            <AnimatePresence mode="wait">
              {mode === 'otp' ? (
                <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button onClick={() => setMode('signup')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <h2 className="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
                  <p className="text-muted-foreground text-center mb-8">Enter the 6-digit code sent to<br /><span className="font-medium text-foreground">{pendingEmail}</span></p>
                  <OTPInput onComplete={handleOTPComplete} disabled={isLoading} />
                  {isLoading && <div className="flex justify-center mt-6"><LoadingSpinner /></div>}
                </motion.div>
              ) : (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-accent" />
                    <span className="text-2xl font-bold">Odhra</span>
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-2">{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
                  <p className="text-muted-foreground text-center mb-6">{mode === 'signin' ? 'Sign in to continue shopping' : 'Join the luxury marketplace'}</p>
                  
                  <SocialAuthButtons isLoading={isLoading} />
                  <AuthDivider />

                  {mode === 'signin' ? (
                    <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" {...signInForm.register('email')} className="mt-1.5 h-12" />
                        {signInForm.formState.errors.email && <p className="text-destructive text-sm mt-1">{signInForm.formState.errors.email.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative mt-1.5">
                          <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...signInForm.register('password')} className="h-12 pr-12" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {signInForm.formState.errors.password && <p className="text-destructive text-sm mt-1">{signInForm.formState.errors.password.message}</p>}
                      </div>
                      <Button type="submit" className="w-full h-12 text-base font-semibold btn-press" disabled={isLoading}>
                        {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" placeholder="John Doe" {...signUpForm.register('fullName')} className="mt-1.5 h-12" />
                        {signUpForm.formState.errors.fullName && <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.fullName.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="signupEmail">Email</Label>
                        <Input id="signupEmail" type="email" placeholder="you@example.com" {...signUpForm.register('email')} className="mt-1.5 h-12" />
                        {signUpForm.formState.errors.email && <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.email.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="signupPassword">Password</Label>
                        <div className="relative mt-1.5">
                          <Input id="signupPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...signUpForm.register('password')} className="h-12 pr-12" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {signUpForm.formState.errors.password && <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.password.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" type="password" placeholder="••••••••" {...signUpForm.register('confirmPassword')} className="mt-1.5 h-12" />
                        {signUpForm.formState.errors.confirmPassword && <p className="text-destructive text-sm mt-1">{signUpForm.formState.errors.confirmPassword.message}</p>}
                      </div>
                      <Button type="submit" className="w-full h-12 text-base font-semibold btn-press" disabled={isLoading}>
                        {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
                      </Button>
                    </form>
                  )}

                  <p className="text-center text-sm text-muted-foreground mt-6">
                    {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-accent font-semibold hover:underline">
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
