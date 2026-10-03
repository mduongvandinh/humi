import { r2, type Pt } from '../engine/math';
import { INK } from '../engine/palette';
import { svg } from '../engine/svg';
import { DIM } from './rig';

/**
 * A noodle limb: one quadratic curve drawn twice (ink underneath, fill on
 * top) so it gets a clean outline and round mitten ends. No fingers, no toes.
 */
export class HumiLimb {
  readonly el: SVGGElement;
  private ink: SVGPathElement;
  private fill: SVGPathElement;
  private inkHand?: SVGCircleElement;
  private fillHand?: SVGCircleElement;
  private readonly width: number;

  constructor(
    readonly kind: 'arm' | 'leg',
    fillColor: string,
  ) {
    this.width = kind === 'arm' ? DIM.armWidth : DIM.legWidth;
    this.el = svg('g', { class: `humi-limb humi-${kind}` }, null);
    const common = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    this.ink = svg('path', { ...common, class: 'humi-ink', stroke: INK, 'stroke-width': this.width + DIM.outline * 1.05 }, this.el);
    if (kind === 'arm') {
      this.inkHand = svg('circle', { class: 'humi-ink', fill: INK, r: DIM.handR + DIM.outline * 0.55 }, this.el);
    }
    this.fill = svg('path', { ...common, class: 'humi-fill', stroke: fillColor, 'stroke-width': this.width }, this.el);
    if (kind === 'arm') {
      this.fillHand = svg('circle', { class: 'humi-fill', fill: fillColor, r: DIM.handR }, this.el);
    }
  }

  /** from → (quadratic control) → to, plus an optional short foot nub. */
  render(from: Pt, ctrl: Pt, to: Pt, nub?: Pt): void {
    let d = `M${r2(from[0])},${r2(from[1])}Q${r2(ctrl[0])},${r2(ctrl[1])} ${r2(to[0])},${r2(to[1])}`;
    if (nub) d += `L${r2(nub[0])},${r2(nub[1])}`;
    this.ink.setAttribute('d', d);
    this.fill.setAttribute('d', d);
    if (this.inkHand && this.fillHand) {
      const cx = String(r2(to[0]));
      const cy = String(r2(to[1]));
      this.inkHand.setAttribute('cx', cx);
      this.inkHand.setAttribute('cy', cy);
      this.fillHand.setAttribute('cx', cx);
      this.fillHand.setAttribute('cy', cy);
    }
  }
}
