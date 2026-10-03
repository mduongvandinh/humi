import { rotate, type Pt } from '../engine/math';
import { smoothClosedPath, blobPoints } from '../engine/shape';
import { INK } from '../engine/palette';
import { svg, uid } from '../engine/svg';
import { DIM, type Rig } from './rig';

/** The soft bean/drop body: narrower shoulders, fuller base, a little wobble. */
export class HumiBody {
  readonly el: SVGPathElement;
  /** Stroke-only copy drawn above the Core light so the outline stays crisp. */
  readonly outline: SVGPathElement;
  readonly id = uid('humi-body');

  constructor(
    parent: SVGGElement,
    fill: string,
    private readonly seed: number,
  ) {
    this.el = svg(
      'path',
      { id: this.id, class: 'humi-fill humi-body', fill, stroke: INK, 'stroke-width': DIM.outline, 'stroke-linejoin': 'round' },
      parent,
    );
    this.outline = svg('path', {
      class: 'humi-ink',
      fill: 'none',
      stroke: INK,
      'stroke-width': DIM.outline,
      'stroke-linejoin': 'round',
    });
  }

  render(rig: Rig, t: number): void {
    const { cx, cy, rx, ry, puff } = rig.body;
    const pts = blobPoints(cx, cy, {
      n: 16,
      rx,
      ry,
      seed: this.seed,
      t,
      irregularity: 0.018,
      boil: 0.008,
      boilSpeed: 0.5,
      radial: (_th, _ux, uy) => {
        const top = Math.max(0, -uy);
        const bot = Math.max(0, uy);
        const mx = 1 - 0.2 * top ** 1.4 + 0.07 * bot + puff * 0.18 * top * (1 - top);
        return [mx, uy > 0 ? 0.94 : 1];
      },
    });
    const [px, py] = rig.pivot;
    const rotated = pts.map(([x, y]) => rotate(x, y, px, py, rig.lean) as Pt);
    const d = smoothClosedPath(rotated);
    this.el.setAttribute('d', d);
    this.outline.setAttribute('d', d);
  }
}
