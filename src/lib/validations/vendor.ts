import { z } from 'zod';

export const vendorOnboardingSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(2, 'Brand name must be at least 2 characters')
    .max(100, 'Brand name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-&'.]+$/, 'Brand name contains invalid characters'),
  bio: z
    .string()
    .trim()
    .min(20, 'Bio must be at least 20 characters')
    .max(500, 'Bio must be less than 500 characters'),
  gstNumber: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)'
    )
    .optional()
    .or(z.literal('')),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
});

export type VendorOnboardingFormData = z.infer<typeof vendorOnboardingSchema>;
