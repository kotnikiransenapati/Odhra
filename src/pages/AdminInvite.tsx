import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, signInSchema, type SignUpFormData, type SignInFormData } from '@/lib/validations/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { OTPInput } from '@/components/auth/OTPInput';
import { SEOHead } from '@/components/SEOHead';
import { Shield, Crown, CheckCircle, XCircle, Eye, EyeOff, ArrowLeft, UserPlus, Clock } from 'lucide-react';

interface InviteData {
  valid: boolean;
  error?: string;
  email?: string;
  role_name?: string;
  notes?: string;
  expires_at?: string;
  access_expires_at?: string;
}

type Step = 'loading' | 'invalid' | 'details' | 'signup' | 'signin' | 'otp' | 'accepting' | 'success';

export default function AdminInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refreshRoles } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const watchedPassword = signUpForm.watch('password');

  // Validate the invite token on mount
  useEffect(() => {
    if (!token) {
      setStep('invalid');
      setErrorMessage('No invite token provided.');
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.rpc('validate_admin_invite', { p_token: token });
        if (error) throw error;
        
        const result = data as unknown as InviteData;
        setInviteData(result);

        if (!result.valid) {
          setStep('invalid');
          setErrorMessage(result.error || 'Invalid invite.');
        } else {
          // Pre-fill email in forms
          if (result.email) {
            signUpForm.setValue('email', result.email);
            signInForm.setValue('email', result.email);
          }
          setStep('details');
        }
      } catch (err) {
        console.error('Invite validation error:', err);
        setStep('invalid');
        setErrorMessage('Failed to validate invite. Please try again.');
      }
    })();
  }, [token]);

  // If user is already logged in, try to accept immediately
  useEffect(() => {
    if (user && inviteData?.valid && step === 'details') {
      acceptInvite();
    }
  }, [user, inviteData, step]);

  const acceptInvite = async () => {
    if (!token || !user) return;
    setStep('accepting');
    try {
      const { data, error } = await supabase.rpc('accept_admin_invite', {
        p_token: token,
        p_user_id: user.id,
      });
      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; role_name?: string };
      if (!result.success) {
        setStep('invalid');
        setErrorMessage(result.error || 'Failed to accept invite.');
        return;
      }

      await refreshRoles();
      setStep('success');
      toast.success('Welcome to the admin team!');
    } catch (err: any) {
      console.error('Accept invite error:', err);
      setStep('invalid');
      setErrorMessage(err.message || 'Failed to accept invite.');
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const { getSiteBaseUrl } = await import('@/lib/siteUrl');
      const siteUrl = getSiteBaseUrl({ preferPublishedInPreview: true });
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${siteUrl}/admin-invite/${token}`,
          data: { full_name: data.fullName },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
          setStep('signin');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Check your email for verification code!');
      setPendingEmail(data.email);
      setStep('otp');
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email first');
          setPendingEmail(data.email);
          setStep('otp');
        } else {
          toast.error(error.message || 'Invalid credentials');
        }
        return;
      }
      // Auth state change will trigger the useEffect above to accept the invite
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

      toast.success('Email verified!');
      // Auth state will update and trigger invite acceptance
    } catch (err) {
      toast.error('Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Admin Invitation" description="Accept your admin invitation to Odhra Marketplace." noIndex />
      
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-accent" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Odhra</span>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground mt-4">Validating your invite...</p>
          </div>
        )}

        {/* Invalid */}
        {step === 'invalid' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Invite Unavailable</h2>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="rounded-xl">
              Go to Homepage
            </Button>
          </div>
        )}

        {/* Details - show invite info and auth options */}
        {step === 'details' && inviteData && !user && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold mb-1">You're Invited!</h2>
              <p className="text-muted-foreground text-sm">
                Join Odhra Marketplace as an administrator
              </p>
            </div>

            {/* Invite card */}
            <div className="bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</span>
                <span className="bg-accent/15 text-accent text-sm font-semibold px-3 py-1 rounded-full">
                  {inviteData.role_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{inviteData.email}</span>
              </div>
              {inviteData.expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expires</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(inviteData.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {inviteData.notes && (
                <p className="text-sm text-muted-foreground italic border-t border-accent/10 pt-3 mt-2">
                  "{inviteData.notes}"
                </p>
              )}
            </div>

            {/* Auth buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => setStep('signup')}
                className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              >
                Create Account & Accept
              </Button>
              <Button
                onClick={() => setStep('signin')}
                variant="outline"
                className="w-full h-12 rounded-xl font-semibold"
              >
                Sign In & Accept
              </Button>
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        {step === 'signup' && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <button
              onClick={() => setStep('details')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-xl font-bold mb-1">Create Your Account</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Sign up with <strong>{inviteData?.email}</strong> to accept the invite
            </p>

            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input {...signUpForm.register('fullName')} placeholder="Your name" className="h-11 rounded-xl bg-secondary/50" />
                {signUpForm.formState.errors.fullName && (
                  <p className="text-destructive text-xs">{signUpForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input {...signUpForm.register('email')} type="email" disabled className="h-11 rounded-xl bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    {...signUpForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-11 pr-12 rounded-xl bg-secondary/50"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signUpForm.formState.errors.password && (
                  <p className="text-destructive text-xs">{signUpForm.formState.errors.password.message}</p>
                )}
                <PasswordStrengthIndicator password={watchedPassword || ''} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
                <Input {...signUpForm.register('confirmPassword')} type="password" placeholder="••••••••" className="h-11 rounded-xl bg-secondary/50" />
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-destructive text-xs">{signUpForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <button type="button" onClick={() => setStep('signin')} className="text-accent font-semibold hover:underline">
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* Sign In Form */}
        {step === 'signin' && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <button
              onClick={() => setStep('details')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-xl font-bold mb-1">Sign In</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Sign in with <strong>{inviteData?.email}</strong> to accept the invite
            </p>

            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input {...signInForm.register('email')} type="email" disabled className="h-11 rounded-xl bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    {...signInForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-11 pr-12 rounded-xl bg-secondary/50"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-destructive text-xs">{signInForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In & Accept'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{' '}
              <button type="button" onClick={() => setStep('signup')} className="text-accent font-semibold hover:underline">
                Create Account
              </button>
            </p>
          </div>
        )}

        {/* OTP Verification */}
        {step === 'otp' && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
            <button
              onClick={() => setStep('signup')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">Verify Your Email</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Enter the 6-digit code sent to<br />
              <span className="font-semibold text-foreground">{pendingEmail}</span>
            </p>
            <OTPInput onComplete={handleOTPComplete} disabled={isLoading} email={pendingEmail} showResend cooldownSeconds={60} />
            {isLoading && <div className="flex justify-center mt-6"><LoadingSpinner /></div>}
          </div>
        )}

        {/* Accepting */}
        {step === 'accepting' && (
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground mt-4">Accepting your invitation...</p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-bold mb-2">Welcome Aboard! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              You're now an admin of Odhra Marketplace. You can access the admin dashboard to manage the platform.
            </p>
            <Button
              onClick={() => navigate('/admin')}
              className="w-full h-12 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
            >
              Go to Admin Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
