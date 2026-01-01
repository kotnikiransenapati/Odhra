import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadResult {
  url: string;
  path: string;
}

interface UseImageUploadOptions {
  bucket: 'product-images' | 'vendor-assets';
  maxSizeMB?: number;
  allowedTypes?: string[];
}

export function useImageUpload(options: UseImageUploadOptions) {
  const { bucket, maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }
    return null;
  };

  const uploadImage = async (file: File, folderPath: string): Promise<UploadResult | null> => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      setProgress(30);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const deleteImage = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete image');
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading,
    progress,
    validateFile,
  };
}
