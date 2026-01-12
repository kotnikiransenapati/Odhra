import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MultiImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  bucket?: string;
}

export function MultiImageUploader({
  images,
  onImagesChange,
  maxImages = 8,
  bucket = 'product-images',
}: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = maxImages - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    if (filesToUpload.length === 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    
    await uploadFiles(filesToUpload);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = maxImages - images.length;
    const filesToUpload = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remainingSlots);
    
    if (filesToUpload.length === 0) return;
    
    await uploadFiles(filesToUpload);
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    const newUrls: string[] = [];
    
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        newUrls.push(publicUrl);
      }
      
      if (newUrls.length > 0) {
        onImagesChange([...images, ...newUrls]);
        toast.success(`${newUrls.length} image(s) uploaded`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/50',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                {isDragging ? 'Drop images here' : 'Click or drag to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WebP. Max 5MB each. {images.length}/{maxImages} uploaded.
              </p>
            </>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <Reorder.Group
          axis="x"
          values={images}
          onReorder={onImagesChange}
          className="flex flex-wrap gap-3"
        >
          <AnimatePresence>
            {images.map((url, index) => (
              <Reorder.Item
                key={url}
                value={url}
                className="relative group"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'w-24 h-24 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing',
                    index === 0 ? 'border-accent ring-2 ring-accent/20' : 'border-border'
                  )}
                >
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded font-medium">
                      Primary
                    </span>
                  )}
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Drag images to reorder. First image will be the primary image.
        </p>
      )}
    </div>
  );
}