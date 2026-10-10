import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

/**
 * Paints the globe's surface: a dot-matrix of land on a forest-dark ocean, in an equirectangular
 * projection. Land shapes come from Natural Earth (public domain) via the world-atlas package.
 * Dot spacing widens with latitude so the pattern stays even once wrapped onto the sphere.
 */
export async function buildGlobeTexture(width = 2048, isLight = false): Promise<HTMLCanvasElement> {
  const { default: topology } = (await import('world-atlas/land-110m.json')) as unknown as { default: Topology<{ land: GeometryCollection }> };
  const height = width / 2;

  // 1. Land mask at half resolution.
  const maskWidth = width / 2;
  const maskHeight = height / 2;
  const mask = document.createElement('canvas');
  mask.width = maskWidth;
  mask.height = maskHeight;
  const maskContext = mask.getContext('2d', { willReadFrequently: true });
  if (!maskContext) throw new Error('Canvas 2D unavailable');
  maskContext.fillStyle = '#000';
  const land = feature(topology, topology.objects.land);
  const project = (lng: number, lat: number): [number, number] => [((lng + 180) / 360) * maskWidth, ((90 - lat) / 180) * maskHeight];
  for (const shape of land.features) {
    const geometry = shape.geometry;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    for (const polygon of polygons) {
      maskContext.beginPath();
      for (const ring of polygon) {
        ring.forEach(([lng = 0, lat = 0], index) => {
          const [x, y] = project(lng, lat);
          if (index === 0) maskContext.moveTo(x, y);
          else maskContext.lineTo(x, y);
        });
        maskContext.closePath();
      }
      maskContext.fill('evenodd');
    }
  }
  const pixels = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
  const isLand = (x: number, y: number) => {
    const mx = Math.min(maskWidth - 1, Math.max(0, Math.round(x / 2)));
    const my = Math.min(maskHeight - 1, Math.max(0, Math.round(y / 2)));
    return (pixels[(my * maskWidth + mx) * 4 + 3] ?? 0) > 128;
  };

  // 2. The visible texture.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  const ocean = context.createLinearGradient(0, 0, 0, height);
  if (isLight) {
    ocean.addColorStop(0, '#e5ded3');
    ocean.addColorStop(0.5, '#ede6db');
    ocean.addColorStop(1, '#e5ded3');
    context.fillStyle = ocean;
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'rgba(20, 33, 29, 0.72)';
  } else {
    ocean.addColorStop(0, '#0d1a16');
    ocean.addColorStop(0.5, '#132520');
    ocean.addColorStop(1, '#0d1a16');
    context.fillStyle = ocean;
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'rgba(231, 225, 213, 0.82)';
  }
  const spacing = width / 300;
  const radius = spacing * 0.3;
  for (let y = spacing / 2; y < height; y += spacing) {
    const lat = 90 - (y / height) * 180;
    const stretch = 1 / Math.max(0.12, Math.cos((lat * Math.PI) / 180));
    const stepX = spacing * stretch;
    for (let x = (y / spacing) % 2 ? stepX / 2 : 0; x < width; x += stepX) {
      if (!isLand(x, y)) continue;
      context.beginPath();
      context.ellipse(x, y, radius * stretch, radius, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  return canvas;
}
