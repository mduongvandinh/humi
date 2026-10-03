// Pure math helpers. Nothing in the engine uses Math.random: every bit of
// "imperfection" comes from seeded noise so a scene renders identically
// frame-for-frame (required for video export).

export const TAU = Math.PI * 2;

export type Pt = [number, number];

export const clamp = (v: number, lo = 0, hi = 1): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => clamp((v - a) / (b - a));
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

export const easeOutBack = (t: number, s = 1.70158): number => {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t: number): number => clamp(t) ** 3;
export const easeInOutCubic = (t: number): number => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** 0 → 1 → 0 hump over [0, 1], zero outside. */
export const bump = (t: number): number => (t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t));

/** Fractional part, always positive. */
export const fract = (x: number): number => x - Math.floor(x);

/** Deterministic hash → [0, 1). */
export function hash1(n: number): number {
  return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
}

/** Smooth 1D value noise → [-1, 1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const o = seed * 71.37;
  const a = hash1(i + o);
  const b = hash1(i + 1 + o);
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}

/** Layered noise, organic "hand-held" drift → roughly [-1, 1]. */
export function fbm(x: number, seed = 0): number {
  return (
    noise1(x, seed) * 0.6 +
    noise1(x * 2.17 + 3.1, seed + 11) * 0.3 +
    noise1(x * 4.31 + 7.7, seed + 23) * 0.1
  );
}

/** Seeded PRNG (mulberry32) → [0, 1). */
export function rng(seed: number): () => number {
  let a = Math.floor(seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rotate point (x, y) around (cx, cy) by angle a (radians). */
export function rotate(x: number, y: number, cx: number, cy: number, a: number): Pt {
  if (a === 0) return [x, y];
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * c - dy * s, cy + dx * s + dy * c];
}

/** Value of `to` (degrees) wrapped to be the nearest equivalent of `from`. */
export const nearestAngleDeg = (from: number, to: number): number =>
  from + ((((to - from) % 360) + 540) % 360) - 180;

export const r2 = (n: number): number => Math.round(n * 100) / 100;
