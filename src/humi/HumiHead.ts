import { clamp, type Pt } from '../engine/math';
import { blobPath } from '../engine/shape';
import { BLUSH, INK } from '../engine/palette';
import { svg, tf } from '../engine/svg';
import { HumiEyes } from './HumiEyes';
import { HumiMouth } from './HumiMouth';
import type { HumiParams } from './params';
import { DIM, type Rig } from './rig';

/** Oversized round head carrying the minimal face. No nose, no hair, no ears. */
export class HumiHead {
  readonly el: SVGGElement;
  private shape: SVGPathElement;
  private face: SVGGElement;
  private blush: SVGEllipseElement[];
  private eyes: HumiEyes;
  private mouth: HumiMouth;

  constructor(
    parent: SVGGElement,
    fill: string,
    private readonly seed: number,
  ) {
    this.el = svg('g', { class: 'humi-head' }, parent);
    this.shape = svg(
      'path',
      { class: 'humi-fill', fill, stroke: INK, 'stroke-width': DIM.outline, 'stroke-linejoin': 'round' },
      this.el,
    );
    this.face = svg('g', { class: 'humi-face' }, this.el);
    this.blush = [0, 1].map(() =>
      svg('ellipse', { class: 'humi-blush', fill: BLUSH, rx: 5.5, ry: 3.2, opacity: 0 }, this.face),
    );
    this.eyes = new HumiEyes(this.face);
    this.mouth = new HumiMouth(this.face);
  }

  render(rig: Rig, p: HumiParams, t: number): void {
    const [hx, hy]: Pt = rig.head;
    this.el.setAttribute('transform', tf(hx, hy, rig.headRot));
    this.shape.setAttribute(
      'd',
      blobPath(0, 0, {
        n: 14,
        rx: DIM.headRx,
        ry: DIM.headRy,
        seed: this.seed + 101,
        t,
        irregularity: 0.016,
        boil: 0.007,
        boilSpeed: 0.45,
        radial: (_th, _ux, uy) => [1 + 0.035 * Math.max(0, uy), uy > 0 ? 0.97 : 1],
      }),
    );
    const { x: fx, y: fy } = rig.face;
    this.eyes.render(p, fx, fy);
    this.mouth.render(fx * 0.85, p.mouthY + fy * 0.8, p.mouthWidth, p.mouthCurve, p.mouthOpen, p.mouthSkew);
    const b = clamp(p.blush) * 0.5;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.blush[i].setAttribute('cx', String(side * (p.eyeSpacing + 11) + fx * 0.6));
      this.blush[i].setAttribute('cy', String(p.eyeY + 9.5 + fy * 0.6));
      this.blush[i].setAttribute('opacity', String(Math.round(b * 100) / 100));
    }
  }
}
