import { clamp, r2 } from '../engine/math';
import { FONT, INK, WHITE } from '../engine/palette';
import { Spring, Spring2D } from '../engine/spring';
import { DefsBank, setAttrs, svg, tf } from '../engine/svg';
import type { HumiCharacter } from '../humi/HumiCharacter';

/** A drifting light that actions can "claim" each frame; fades when unused. */
export class LightOrb {
  readonly el: SVGGElement;
  private pos = new Spring2D(0, 0, { k: 30, zeta: 0.9 });
  private vis = new Spring(0, { k: 20, zeta: 1 });
  private star: SVGPathElement;
  private claimed: [number, number] | null = null;
  private t = 0;

  constructor(parent: SVGGElement, defs: DefsBank) {
    this.el = svg('g', { class: 'light-orb', opacity: 0 }, parent);
    svg('circle', { r: 70, fill: defs.glow('#FFE7A0') }, this.el);
    svg('circle', { r: 10, fill: '#FFF8E2', stroke: '#FFD166', 'stroke-width': 2 }, this.el);
    this.star = svg('path', { d: 'M0,-20Q2,-2 20,0Q2,2 0,20Q-2,2 -20,0Q-2,-2 0,-20Z', fill: WHITE, opacity: 0.8 }, this.el);
  }

  reset(): void {
    this.t = 0;
    this.vis.snap(0);
    this.claimed = null;
  }

  claim(x: number, y: number): void {
    if (this.vis.value < 0.01) this.pos.snap(x, y);
    this.claimed = [x, y];
  }

  get position(): [number, number] {
    return [this.pos.x.value, this.pos.y.value];
  }

  update(dt: number): void {
    this.t += dt;
    this.vis.step(dt, this.claimed ? 1 : 0);
    if (this.claimed) this.pos.step(this.claimed[0], this.claimed[1], dt);
    this.claimed = null;
    const v = clamp(this.vis.value);
    setAttrs(this.el, { opacity: v, transform: tf(this.pos.x.value, this.pos.y.value, 0, 0.6 + 0.4 * v) });
    this.star.setAttribute('transform', `rotate(${r2(this.t * 40)}) scale(${r2(0.8 + Math.sin(this.t * 4) * 0.2)})`);
  }
}

/** Glowing threads between Cores that are in sync — the relationship metaphor. */
export class SyncThreads {
  private pool: SVGPathElement[] = [];
  private t = 0;

  constructor(private readonly layer: SVGGElement) {}

  reset(): void {
    this.t = 0;
  }

  update(dt: number, chars: HumiCharacter[]): void {
    this.t += dt;
    const links: Array<[HumiCharacter, HumiCharacter, number]> = [];
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        const s = Math.min(chars[i].core.springs.value.sync, chars[j].core.springs.value.sync);
        if (s > 0.5) links.push([chars[i], chars[j], (s - 0.5) * 2]);
      }
    }
    while (this.pool.length < links.length) {
      this.pool.push(
        svg('path', { fill: 'none', stroke: '#7FE6F2', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '2 7' }, this.layer),
      );
    }
    this.pool.forEach((p, i) => {
      const l = links[i];
      if (!l) {
        p.setAttribute('opacity', '0');
        return;
      }
      const [a, b, k] = l;
      const pa = a.anchor('core');
      const pb = b.anchor('core');
      const mx = (pa[0] + pb[0]) / 2;
      const my = (pa[1] + pb[1]) / 2 + 36;
      const pulse = 0.5 + 0.5 * a.core.pulse;
      setAttrs(p, {
        d: `M${r2(pa[0])},${r2(pa[1])}Q${r2(mx)},${r2(my)} ${r2(pb[0])},${r2(pb[1])}`,
        opacity: k * (0.4 + 0.6 * pulse),
        'stroke-dashoffset': r2(-this.t * 20),
        'stroke-width': 2 + pulse * 2,
      });
    });
  }
}

/** Caption bar for educational sequences, in screen space. */
export class Caption {
  readonly el: SVGGElement;
  private bg: SVGRectElement;
  private text: SVGTextElement;
  private vis = new Spring(0, { k: 40, zeta: 1 });
  private current: string | null = null;

  constructor(
    parent: SVGGElement,
    private readonly W: number,
    private readonly H: number,
  ) {
    this.el = svg('g', { class: 'caption', opacity: 0 }, parent);
    this.bg = svg('rect', { rx: 22, fill: INK, opacity: 0.86 }, this.el);
    this.text = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: WHITE, 'font-size': 24, 'font-weight': 700, class: 'thought-text', 'font-family': FONT }, this.el);
  }

  reset(): void {
    this.set(null);
    this.vis.snap(0);
  }

  set(text: string | null): void {
    this.current = text;
    if (text) {
      this.text.textContent = text;
      const w = Math.min(this.W - 80, text.length * 11.5 + 56);
      setAttrs(this.bg, { x: this.W / 2 - w / 2, y: this.H - 92, width: w, height: 48 });
      setAttrs(this.text, { x: this.W / 2, y: this.H - 67 });
    }
  }

  update(dt: number): void {
    this.vis.step(dt, this.current ? 1 : 0);
    const v = clamp(this.vis.value);
    setAttrs(this.el, { opacity: v, transform: `translate(0 ${r2((1 - v) * 12)})` });
  }
}
