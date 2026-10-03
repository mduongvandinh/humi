import { r2 } from '../engine/math';
import { INK } from '../engine/palette';
import { svg } from '../engine/svg';

/**
 * A single soft line that can open. curve: −1 frown … 1 smile.
 * Closed path whose bottom edge drops by `open`, so one element covers
 * smile, frown, "o", grin and gasp.
 */
export function mouthPath(width: number, curve: number, open: number, skew: number): string {
  const w = width;
  const c = curve * 4.5;
  const o = open * 7;
  const ly = -skew * 1.8;
  const ry = skew * 1.8;
  const cx = skew * w * 0.3;
  return (
    `M${r2(-w)},${r2(ly)}Q${r2(cx)},${r2(c * 2)} ${r2(w)},${r2(ry)}` +
    `Q${r2(cx)},${r2(c * 2 + o * 2)} ${r2(-w)},${r2(ly)}Z`
  );
}

export class HumiMouth {
  readonly el: SVGPathElement;

  constructor(parent: SVGGElement, color = INK, strokeWidth = 2.5) {
    this.el = svg(
      'path',
      {
        class: 'humi-ink humi-mouth',
        fill: color,
        stroke: color,
        'stroke-width': strokeWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      parent,
    );
  }

  render(x: number, y: number, width: number, curve: number, open: number, skew: number): void {
    this.el.setAttribute('transform', `translate(${r2(x)} ${r2(y)})`);
    this.el.setAttribute('d', mouthPath(width, curve, Math.max(0, open), skew));
  }
}
