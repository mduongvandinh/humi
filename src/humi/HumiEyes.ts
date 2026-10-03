import { clamp, lerp, r2 } from '../engine/math';
import { INK, WHITE } from '../engine/palette';
import { svg, tf } from '../engine/svg';
import type { HumiParams } from './params';

/**
 * One eye as a single morphing path. smile bends the bottom edge upward into
 * a happy crescent; lid flattens the top edge. Combined with rotation (tilt)
 * these cover every eye shape HUMI needs.
 */
export function eyePath(w: number, h: number, smile: number, lid: number): string {
  // The lid lowers a flat top edge: corners rise to meet it, so that a
  // tilted eye reads as a slanted lid (anger, worry) rather than a smaller dot.
  const k = clamp(lid);
  const flat = -h * (1 - k * 0.75);
  const corner = lerp(0, flat, k);
  const ey = lerp(corner, h * 0.3, smile);
  const topC = lerp(lerp(-h * 1.333, flat, k), -h * 1.45, smile);
  const botC = lerp((h - 0.25 * corner) / 0.75, -h * 0.55, smile);
  const ew = w * (1 + 0.2 * smile);
  return (
    `M${r2(-ew)},${r2(ey)}C${r2(-ew)},${r2(topC)} ${r2(ew)},${r2(topC)} ${r2(ew)},${r2(ey)}` +
    `C${r2(ew)},${r2(botC)} ${r2(-ew)},${r2(botC)} ${r2(-ew)},${r2(ey)}Z`
  );
}

export interface EyeSettings {
  spacing: number;
  y: number;
  scale: number;
  scaleY: number;
  open: number;
  smile: number;
  lid: number;
  tilt: number;
  sparkle: number;
  asym: number;
  /** base half-width / half-height at scale 1 */
  w: number;
  h: number;
}

/** Shared eye renderer (HUMI and mental creatures use the same eyes). */
export class EyePair {
  readonly el: SVGGElement;
  private eyes: SVGPathElement[] = [];
  private sparkles: SVGCircleElement[] = [];
  private groups: SVGGElement[] = [];

  constructor(parent: SVGGElement, color = INK) {
    this.el = svg('g', { class: 'humi-eyes' }, parent);
    for (let i = 0; i < 2; i++) {
      const g = svg('g', {}, this.el);
      this.groups.push(g);
      this.eyes.push(
        svg('path', { class: 'humi-ink', fill: color, stroke: color, 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, g),
      );
      this.sparkles.push(svg('circle', { class: 'humi-sparkle', fill: WHITE, r: 1 }, g));
    }
  }

  render(e: EyeSettings, fx: number, fy: number): void {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const k = 1 + e.asym * 0.28 * side;
      const w = e.w * e.scale * k;
      const h = e.h * e.scale * e.scaleY * k * Math.max(e.open, 0.07);
      const lid = clamp(e.lid + Math.max(0, -e.asym * side) * 0.3);
      this.groups[i].setAttribute('transform', tf(side * e.spacing + fx, e.y + fy, -side * e.tilt));
      this.eyes[i].setAttribute('d', eyePath(w, h, e.smile, lid));
      const sp = e.sparkle * (1 - e.smile) * clamp((e.open - 0.35) * 2) * (1 - lid * 0.6);
      this.sparkles[i].setAttribute('cx', String(r2(w * 0.32)));
      this.sparkles[i].setAttribute('cy', String(r2(-h * 0.36 * (1 - lid * 0.5))));
      this.sparkles[i].setAttribute('r', String(r2(Math.max(0, 1.4 * e.scale * k * sp))));
    }
  }
}

/** HUMI's two dot eyes, driven by the parameter vector. */
export class HumiEyes {
  private pair: EyePair;

  constructor(parent: SVGGElement) {
    this.pair = new EyePair(parent);
  }

  render(p: HumiParams, fx: number, fy: number): void {
    this.pair.render(
      {
        spacing: p.eyeSpacing * (1 - Math.abs(p.lookX) * 0.12),
        y: p.eyeY,
        scale: p.eyeScale,
        scaleY: p.eyeScaleY,
        open: clamp(p.eyeOpen),
        smile: clamp(p.eyeSmile),
        lid: clamp(p.eyeLid),
        tilt: p.eyeTilt,
        sparkle: clamp(p.eyeSparkle),
        asym: p.eyeAsym,
        w: 4.3,
        h: 5.6,
      },
      fx,
      fy,
    );
  }
}
