import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { optimizeImageUrl, generateSrcSet, BLUR_PLACEHOLDER } from '@/lib/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  size?: 'thumbnail' | 'card' | 'medium' | 'large';
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  width?: number;
  height?: number;
}

function OptimizedImageComponent({
  src,
  alt,
  size = 'card',
  priority = false,
  className,
  containerClassName,
  aspectRatio = 'auto',
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const optimizedSrc = optimizeImageUrl(src, size);
  const srcSet = generateSrcSet(src);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          'bg-muted flex items-center justify-center',
          aspectClasses[aspectRatio],
          containerClassName
        )}
      >
        <span className="text-muted-foreground text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClasses[aspectRatio], containerClassName)}>
      {/* Blur placeholder - shows while image loads */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ 
            backgroundImage: `url(${BLUR_PLACEHOLDER})`,
            backgroundSize: 'cover',
          }}
        />
      )}
      
      <img
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? '(max-width: 640px) 200px, (max-width: 1024px) 400px, 600px' : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}

export const OptimizedImage = memo(OptimizedImageComponent);
