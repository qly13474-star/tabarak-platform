import React, { useEffect, useState } from 'react';
import { DynamicCoverCategory, DynamicThemedCover } from './PlatformThemeUI';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  badgeText?: string;
  category?: DynamicCoverCategory;
}

/**
 * Unified Resilient Image Component
 * Automatically generates a Royal Navy (#0F172A/#1E293B) & Gold (#D4AF37/#F59E0B)
 * cover whenever `src` is empty, set to 'auto', or fails to load — ensuring dynamically
 * added courses, stages, and booklets never appear broken or off-brand.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  badgeText,
  category = 'default',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = src?.trim() ?? '';
  const shouldUseGeneratedCover =
    hasError || !cleanSrc || cleanSrc.toLowerCase() === 'auto';

  if (shouldUseGeneratedCover) {
    return (
      <DynamicThemedCover
        title={fallbackTitle || alt}
        badgeText={badgeText}
        category={category}
        className={className}
      />
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
