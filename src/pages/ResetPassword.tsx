import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { 
  forgotPasswordSchema, 
  resetPasswordSchema,
  type ForgotPasswordFormData, 
  type ResetPasswordFormData 
} from '@/lib/validations/auth';
import { ArrowLeft, Sparkles, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

type Mode = 'request' | 'reset' | 'success' | 'error';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for recovery token in URL (both hash and query params)
  useEffect(() => {
    const checkRecoveryToken = async () => {
      setIsCheckingSession(true);
      
      try {
        // Check hash params (Supabase sends tokens in hash)
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('type');
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        // Also check query params for our custom token format
        const queryToken = searchParams.get('token');
        const queryType = searchParams.get('type');
        
        // Handle error in URL
        if (errorParam) {
          setErrorMessage(errorDescription || 'Password reset link is invalid or expired');
          setMode('error');
          setIsCheckingSession(false);
          return;
        }
        
        // If we have a hash token (from Supabase email)
        if (accessToken && tokenType === 'recovery') {
          // Supabase automatically handles the session, check if we have it
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            // Try to set session manually with the token
            const refreshToken = hashParams.get('refresh_token');
            if (refreshToken) {
              const { error: setError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (setError) {
                setErrorMessage('Password reset link is invalid or has expired. Please request a new one.');
                setMode('error');
                setIsCheckingSession(false);
                return;
              }
            }
          }
          
          setMode('reset');
          // Clean the URL
          window.history.replaceState({}, document.title, '/reset-password');
        } else if (queryToken) {
          // Custom token format (if we want to use it in the future)
          setMode('reset');
        } else {
          // Check if user already has a valid session with recovery type
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // User might have clicked on an old valid link
            setMode('reset');
          }
        }
      } catch (error) {
        console.error('Error checking recovery token:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkRecoveryToken();
  }, [location.hash, searchParams]);

  const requestForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleRequestReset = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        // Don't expose if email exists or not for security
        if (error.message.includes('rate limit')) {
          toast.error('Too many requests. Please try again later.');
        } else {
          // Always show success to prevent email enumeration
          setEmail(data.email);
          toast.success('If an account exists with this email, you will receive a reset link.');
          setMode('success');
        }
        return;
      }

      setEmail(data.email);
      toast.success('Password reset email sent!');
      setMode('success');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        if (error.message.includes('should be different')) {
          toast.error('New password must be different from your current password');
        } else if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast.error('Password reset link has expired. Please request a new one.');
          setMode('request');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Sign out after password change for security
      await supabase.auth.signOut();
      
      toast.success('Password updated successfully! Please sign in with your new password.');
      navigate('/auth');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking for recovery token
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
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
          {/* Logo */}
          <div className="flex items-center gap-2 justify-center mb-6">
            <div className="p-1.5 bg-accent/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <span className="text-2xl font-bold">Odhra</span>
          </div>

          {mode === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Link Expired</h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || 'This password reset link is invalid or has expired.'}
              </p>
              <Button
                onClick={() => {
                  setErrorMessage('');
                  setMode('request');
                }}
                className="w-full h-12"
              >
                Request New Link
              </Button>
              <Link to="/auth" className="block mt-4">
                <Button variant="ghost" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </motion.div>
          )}

          {mode === 'request' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Link 
                to="/auth" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Sign In</span>
              </Link>

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
                <p className="text-muted-foreground">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...requestForm.register('email')}
                    className="h-12 bg-card border-border/50 focus:border-accent transition-colors"
                  />
                  {requestForm.formState.errors.email && (
                    <p className="text-destructive text-sm">
                      {requestForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold btn-press"
                  disabled={isLoading}
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
                </Button>
              </form>
            </motion.div>
          )}

          {mode === 'reset' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Set New Password</h2>
                <p className="text-muted-foreground">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...resetForm.register('password')}
                    className="h-12 bg-card border-border/50 focus:border-accent transition-colors"
                  />
                  {resetForm.formState.errors.password && (
                    <p className="text-destructive text-sm">
                      {resetForm.formState.errors.password.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...resetForm.register('confirmPassword')}
                    className="h-12 bg-card border-border/50 focus:border-accent transition-colors"
                  />
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-destructive text-sm">
                      {resetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold btn-press"
                  disabled={isLoading}
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Update Password'}
                </Button>
              </form>
              
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button
                  onClick={() => setMode('request')}
                  className="text-accent hover:underline"
                >
                  Request a new reset link
                </button>
              </p>
            </motion.div>
          )}

          {mode === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a password reset link to<br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> The link will expire in 1 hour. Check your spam folder if you don't see it.
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Didn't receive the email?{' '}
                <button
                  onClick={() => setMode('request')}
                  className="text-accent font-semibold hover:underline"
                >
                  Try again
                </button>
              </p>
              <Link to="/auth">
                <Button variant="outline" className="w-full h-12">
                  Back to Sign In
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
