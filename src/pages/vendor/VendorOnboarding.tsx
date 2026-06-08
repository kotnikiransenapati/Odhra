import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { haptic } from '@/lib/haptics';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Store,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Shield,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ImageUploader } from '@/components/vendor/ImageUploader';
import { KYCDocumentUpload } from '@/components/vendor/KYCDocumentUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { vendorOnboardingSchema, VendorOnboardingFormData } from '@/lib/validations/vendor';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'Brand Info', icon: Store },
  { id: 2, title: 'Logo', icon: ImageIcon },
  { id: 3, title: 'Business Details', icon: FileText },
  { id: 4, title: 'KYC Documents', icon: Shield },
  { id: 5, title: 'Complete', icon: CheckCircle2 },
];

const clampStep = (step: number) => Math.min(Math.max(step, 1), 5);

export default function VendorOnboarding() {
  const navigate = useNavigate();
  const { user, isVendor, refreshRoles } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<VendorOnboardingFormData>({
    resolver: zodResolver(vendorOnboardingSchema),
    defaultValues: {
      brandName: '',
      bio: '',
      gstNumber: '',
      logoUrl: '',
    },
  });

  const logoUrl = watch('logoUrl');

  const { uploadImage, deleteImage, isUploading, progress } = useImageUpload({
    bucket: 'vendor-assets',
    maxSizeMB: 5,
  });

  // Resume incomplete onboarding from the last known step
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const savedStep = Number(localStorage.getItem(`vendor-onboarding-step-${user.id}`));
    if (savedStep) setCurrentStep(clampStep(savedStep));

    supabase
      .from('vendors')
      .select('id, kyc_status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || cancelled) return;
        setVendorId(data.id);
        if (!savedStep) setCurrentStep(data.kyc_status === 'submitted' || data.kyc_status === 'verified' ? 5 : 4);
      });

    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (user) localStorage.setItem(`vendor-onboarding-step-${user.id}`, String(currentStep));
  }, [currentStep, user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleLogoUpload = async (file: File): Promise<string | null> => {
    if (!vendorId && !user) return null;
    // Use a temporary folder with user ID until we have vendor ID
    const folder = vendorId || `temp-${user?.id}`;
    const result = await uploadImage(file, folder);
    return result?.url || null;
  };

  const handleLogoDelete = async (): Promise<boolean> => {
    // For simplicity, we just clear the URL
    // The actual file deletion would require storing the path
    return true;
  };

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        return await trigger(['brandName', 'bio']);
      case 2:
        return true; // Logo is optional
      case 3:
        return await trigger(['gstNumber']);
      default:
        return true;
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: VendorOnboardingFormData) => {
    if (!user) {
      toast.error('Please log in to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user already has a vendor record
      const { data: existing } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setVendorId(existing.id);
        toast.info('You already have a vendor application. Proceeding to KYC.');
        setCurrentStep(4);
        setIsSubmitting(false);
        return;
      }

      // Create vendor record
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          brand_name: data.brandName,
          bio: data.bio,
          logo_url: data.logoUrl || null,
          gst_number: data.gstNumber || null,
          slug: '', // Auto-generated by database trigger
          is_verified: false,
          is_active: true,
        })
        .select()
        .single();

      if (vendorError) throw vendorError;

      setVendorId(vendor.id);

      // Add vendor role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'vendor',
        });

      if (roleError) {
        // If role already exists, that's fine
        if (!roleError.message.includes('duplicate')) {
          throw roleError;
        }
      }

      // Refresh roles in context
      await refreshRoles();

      // Move to KYC step
      setCurrentStep(4);
      toast.success('Vendor application submitted! Now upload your KYC documents.');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                placeholder="Enter your brand name"
                {...register('brandName')}
                className={cn(errors.brandName && 'border-destructive')}
              />
              {errors.brandName && (
                <p className="text-sm text-destructive">{errors.brandName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Brand Description *</Label>
              <Textarea
                id="bio"
                placeholder="Tell customers about your brand, products, and what makes you unique..."
                rows={5}
                {...register('bio')}
                className={cn(errors.bio && 'border-destructive')}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{errors.bio?.message}</span>
                <span>{watch('bio')?.length || 0}/500</span>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <ImageUploader
              value={logoUrl}
              onChange={(url) => setValue('logoUrl', url)}
              onUpload={handleLogoUpload}
              onDelete={handleLogoDelete}
              isUploading={isUploading}
              progress={progress}
              label="Brand Logo"
              hint="Recommended: 400x400px, JPG or PNG"
              aspectRatio="square"
            />
            <p className="text-sm text-muted-foreground text-center">
              A professional logo helps build trust with customers. You can add this later.
            </p>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number (Optional)</Label>
              <Input
                id="gstNumber"
                placeholder="22AAAAA0000A1Z5"
                {...register('gstNumber')}
                className={cn(errors.gstNumber && 'border-destructive')}
              />
              {errors.gstNumber && (
                <p className="text-sm text-destructive">{errors.gstNumber.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Providing your GST number helps with tax compliance and builds buyer trust.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
              <h4 className="font-medium text-accent mb-2">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your application will be reviewed within 24-48 hours</li>
                <li>• Once approved, you can start listing products</li>
                <li>• You'll earn 90% of each sale (10% platform commission)</li>
              </ul>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {vendorId ? (
              <KYCDocumentUpload vendorId={vendorId} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Please complete the previous steps first.</p>
              </div>
            )}
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
            <p className="text-muted-foreground mb-8">
              Welcome aboard! Your KYC documents are under review.
              Start setting up your store and listing products.
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate('/vendor')}
            >
              Go to Vendor Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Become a Vendor
            </div>
            <h1 className="text-display-sm font-bold mb-2">Start Selling on Odhra</h1>
            <p className="text-muted-foreground">
              Join 500+ vendors and reach thousands of customers
            </p>
          </motion.div>

          {/* Progress Steps */}
          {currentStep < 5 && (
            <div className="flex items-center justify-center gap-2 mb-10">
              {steps.slice(0, 4).map((step) => (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-full transition-colors',
                      currentStep === step.id
                        ? 'bg-accent text-accent-foreground'
                        : currentStep > step.id
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <step.icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {step.title}
                    </span>
                  </div>
                  {step.id < 4 && (
                    <div
                      className={cn(
                        'w-6 h-0.5 rounded-full',
                        currentStep > step.id ? 'bg-accent' : 'bg-muted'
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Form Card */}
          <motion.div
            layout
            className="glass rounded-2xl p-6 md:p-8"
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {renderStepContent()}
              </AnimatePresence>

              {/* Navigation Buttons */}
              {currentStep < 5 && (
                <div className="flex gap-4 mt-8">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="flex-1 gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                  )}

                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 gap-2"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : currentStep === 3 ? (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit & Continue <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  ) : currentStep === 4 ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="flex-1 gap-2"
                    >
                      Finish Setup <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
