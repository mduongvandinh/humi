// Organic shape generation. Every soft form in the universe (HUMI's head and
// body, mental creatures, bubbles) is a ring of points with seeded noise,
// smoothed into a closed Catmull-Rom curve. "Slightly imperfect" is the rule:
// a static per-seed irregularity (personality) plus a slow time drift (boil).

import { hash1, noise1, r2, TAU, type Pt } from './math';

export function smoothClosedPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r2(c1x)},${r2(c1y)} ${r2(c2x)},${r2(c2y)} ${r2(p2[0])},${r2(p2[1])}`;
  }
  return d + 'Z';
}

export interface BlobOpts {
  n: number;
  rx: number;
  ry: number;
  seed: number;
  /** Time, for boil. */
  t: number;
  /** Static irregularity amplitude (fraction of radius). */
  irregularity?: number;
  /** Animated drift amplitude (fraction of radius). */
  boil?: number;
  boilSpeed?: number;
  /** Per-angle radius multiplier [mx, my]. uy > 0 is the bottom. */
  radial?: (theta: number, ux: number, uy: number) => Pt | number;
  /** Rotation of the whole ring (radians) around (cx, cy). */
  rot?: number;
}

export function blobPoints(cx: number, cy: number, o: BlobOpts): Pt[] {
  const pts: Pt[] = [];
  const irr = o.irregularity ?? 0.02;
  const boil = o.boil ?? 0.01;
  const speed = o.boilSpeed ?? 0.6;
  const cr = Math.cos(o.rot ?? 0);
  const sr = Math.sin(o.rot ?? 0);
  for (let i = 0; i < o.n; i++) {
    const th = (i / o.n) * TAU - Math.PI / 2;
    const ux = Math.cos(th);
    const uy = Math.sin(th);
    let mx = 1;
    let my = 1;
    if (o.radial) {
      const m = o.radial(th, ux, uy);
      if (typeof m === 'number') mx = my = m;
      else [mx, my] = m;
    }
    const r =
      1 + (hash1(o.seed * 13.7 + i * 3.1) - 0.5) * 2 * irr + noise1(o.t * speed + i * 1.37, o.seed + i) * boil;
    const x = ux * o.rx * mx * r;
    const y = uy * o.ry * my * r;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}

export const blobPath = (cx: number, cy: number, o: BlobOpts): string => smoothClosedPath(blobPoints(cx, cy, o));
