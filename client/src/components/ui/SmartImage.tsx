import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { imageSrcSet, imageUrl } from '../../lib/images';
import type { ImageRef } from '../../lib/types';

interface SmartImageProps {
  /** Tolerates a missing image (renders the designed fallback) so one bad record never breaks a page. */
  image: ImageRef | null | undefined;
  /** Width / height ratio for both the crop and the reserved box, preventing layout shift. */
  ratio?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Decorative images get empty alt text. */
  decorative?: boolean;
  /** Name shown on the designed fallback when the photo cannot load. */
  fallbackLabel?: string;
  maxWidth?: number;
  /** CSS view-transition-name, for shared-element transitions between pages. */
  transitionName?: string | undefined;
}

/**
 * Responsive, lazily loaded photo with a calm reveal. If the image fails (offline, blocked CDN)
 * a designed tonal panel replaces it, so layouts never show a broken-image icon.
 */
export function SmartImage({ image, ratio, sizes, priority = false, className, imgClassName, decorative = false, fallbackLabel, maxWidth, transitionName }: SmartImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div
      className={cn('relative overflow-hidden bg-limestone', className)}
      style={{ ...(ratio ? { aspectRatio: String(ratio) } : {}), ...(transitionName ? { viewTransitionName: transitionName } : {}) }}
    >
      {state === 'error' || !image?.src ? (
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 bg-[linear-gradient(160deg,var(--limestone),var(--mist))] p-5 text-muted">
          <ImageOff aria-hidden="true" className="size-5" />
          {fallbackLabel ? <span className="font-serif text-2xl leading-none text-ink">{fallbackLabel}</span> : null}
          <span className="text-micro">Photo unavailable</span>
        </div>
      ) : (
        <img
          src={imageUrl(image.src, { width: 1280, ratio })}
          srcSet={imageSrcSet(image.src, ratio, maxWidth)}
          sizes={sizes}
          alt={decorative ? '' : image.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          data-loaded={state === 'loaded'}
          className={cn('img-reveal absolute inset-0 size-full object-cover', imgClassName)}
          style={{ objectPosition: image.focus }}
        />
      )}
    </div>
  );
}

/** "Photo: Name / Unsplash" credit with a link to the original photo page. */
export function PhotoCredit({ image, className, place }: { image: ImageRef; className?: string; place?: string }) {
  return (
    <p className={cn('text-micro', className)}>
      {place ? <span>{place}. </span> : null}
      Photo by{' '}
      <a href={image.credit.url} target="_blank" rel="noopener noreferrer" className="link">
        {image.credit.name}
      </a>{' '}
      on Unsplash
    </p>
  );
}
