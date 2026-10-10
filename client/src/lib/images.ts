/** Builds optimised Unsplash CDN URLs (format negotiation, crop, width) for responsive images. */

const WIDTHS = [480, 720, 960, 1280, 1680, 2200] as const;

interface ImageOptions {
  width: number;
  /** Width / height. When set, Unsplash crops server-side to this ratio. */
  ratio?: number;
  quality?: number;
}

export function imageUrl(src: string, { width, ratio, quality = 72 }: ImageOptions): string {
  const params = new URLSearchParams({ auto: 'format', fit: 'crop', w: String(width), q: String(quality) });
  if (ratio) params.set('h', String(Math.round(width / ratio)));
  return `${src}?${params.toString()}`;
}

export function imageSrcSet(src: string, ratio?: number, maxWidth = 2200): string {
  return WIDTHS.filter((width) => width <= maxWidth)
    .map((width) => `${imageUrl(src, { width, ratio })} ${width}w`)
    .join(', ');
}
