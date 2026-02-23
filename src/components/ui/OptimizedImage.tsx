import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { optimizeImageUrl, generateSrcSet, getImageSizes, BLUR_PLACEHOLDER, type ImageSize } from '@/lib/imageOptimization';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  size?: ImageSize;
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

  const handleLoad = useCallback(() => setIsLoaded(true), []);
  const handleError = useCallback(() => setHasError(true), []);

  const optimizedSrc = optimizeImageUrl(src, size);
  const srcSet = generateSrcSet(src);
  const sizes = getImageSizes(size);

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
        role="img"
        aria-label={`${alt} - image unavailable`}
      >
        <span className="text-muted-foreground text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectClasses[aspectRatio], containerClassName)}>
      {/* Blur placeholder */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{ 
            backgroundImage: `url(${BLUR_PLACEHOLDER})`,
            backgroundSize: 'cover',
          }}
          aria-hidden="true"
        />
      )}
      
      <img
        src={optimizedSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
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
