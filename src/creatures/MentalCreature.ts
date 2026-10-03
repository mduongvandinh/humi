import { bump, clamp, easeInOutSine, easeOutBack, fract, noise1, r2, TAU } from '../engine/math';
import { blobPath } from '../engine/shape';
import { ACCENT, INK, WHITE } from '../engine/palette';
import { Spring } from '../engine/spring';
import { DefsBank, setAttrs, svg, tf } from '../engine/svg';
import { EyePair } from '../humi/HumiEyes';
import { HumiMouth } from '../humi/HumiMouth';
import { CREATURES, creatureLook, type CreatureDef, type CreatureLook } from './creatures';

const R = 22;

export interface CreatureOptions {
  defs: DefsBank;
  seed?: number;
  balance?: number;
}

/**
 * A procedural mental creature. Shape, colour, face and motion all come from
 * a CreatureLook, which is recomputed every frame from the (springy) balance —
 * so Fear can visibly shrink from a looming shadow into a small, alert helper.
 */
export class MentalCreature {
  readonly el: SVGGElement;
  readonly kind: string;
  private def: CreatureDef;
  private inner: SVGGElement;
  private aura: SVGCircleElement;
  private body: SVGPathElement;
  private face: SVGGElement;
  private eyes: EyePair;
  private mouth: HumiMouth;
  private feature: SVGGElement;
  private featureParts: SVGElement[] = [];
  private balance: Spring;
  private appear = 0;
  private leaving = false;
  private leaveT = 0;
  private time = 0;
  private readonly seed: number;
  /** Direction the creature looks, in its local space (unit-ish). */
  look: [number, number] = [0, 0];

  constructor(parent: SVGGElement, kind: string, o: CreatureOptions) {
    this.kind = CREATURES[kind] ? kind : 'fear';
    this.def = CREATURES[this.kind];
    this.seed = o.seed ?? 1;
    this.balance = new Spring(o.balance ?? 0, { k: 14, zeta: 1 });
    this.el = svg('g', { class: `creature creature-${this.kind}` }, parent);
    this.inner = svg('g', {}, this.el);
    const harmful = creatureLook(this.kind, -1);
    this.aura = svg(
      'circle',
      { r: R * 1.9, fill: o.defs.glow(`hsl(${harmful.hue} 45% 18%)`), opacity: 0 },
      this.inner,
    );
    if (this.def.feature === 'sparkles') {
      svg('circle', { r: R * 1.7, fill: o.defs.glow(ACCENT.sun), opacity: 0.55 }, this.inner);
    }
    this.body = svg('path', { class: 'humi-fill', stroke: INK, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, this.inner);
    this.feature = svg('g', {}, this.inner);
    this.face = svg('g', {}, this.inner);
    this.eyes = new EyePair(this.face);
    this.mouth = new HumiMouth(this.face, INK, 2);
    this.buildFeature();
  }

  setBalance(b: number): void {
    this.balance.target = clamp(b, -1, 1);
  }

  snapBalance(b: number): void {
    this.balance.snap(clamp(b, -1, 1));
  }

  get currentBalance(): number {
    return this.balance.value;
  }

  /** Start the exit animation; `done` becomes true when finished. */
  exit(): void {
    this.leaving = true;
  }

  get done(): boolean {
    return this.leaving && this.leaveT >= 1;
  }

  /** Current visual size multiplier (owners use it to place creatures). */
  get size(): number {
    return creatureLook(this.kind, this.balance.value).size;
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time + this.seed * 3.7;
    this.balance.step(dt);
    const L = creatureLook(this.kind, this.balance.value);

    this.appear = Math.min(1, this.appear + dt / 0.45);
    if (this.leaving) this.leaveT = Math.min(1, this.leaveT + dt / 0.35);
    const life = easeOutBack(this.appear) * (1 - easeInOutSine(this.leaveT));

    const m = this.motion(t, L);
    this.inner.setAttribute(
      'transform',
      tf(m.dx, m.dy, m.rot, L.size * m.sx * life, L.size * m.sy * life),
    );

    const fill = `hsl(${L.hue.toFixed(0)} ${L.sat.toFixed(0)}% ${L.light.toFixed(0)}%)`;
    setAttrs(this.body, {
      fill,
      'fill-opacity': L.alpha,
      d: blobPath(0, 0, {
        n: 30,
        rx: R,
        ry: R * L.squashY,
        seed: this.seed + 7,
        t,
        irregularity: 0.018,
        boil: L.fuzz,
        boilSpeed: 6,
        radial: (th, _ux, uy) => {
          const sp = L.spike * Math.pow(Math.max(0, Math.cos(L.spikeCount * (th + Math.PI / 2))), 4) * 0.55;
          return [1 + sp, (uy > 0 ? 0.9 : 1) * (1 + sp)];
        },
      }),
    });
    this.aura.setAttribute('opacity', String(r2(L.aura)));

    const lx = clamp(this.look[0], -1, 1) * 3.5;
    const ly = clamp(this.look[1], -1, 1) * 2.5 - 2;
    const blink = bump(fract(t / 3.9) / 0.05);
    this.eyes.render(
      {
        spacing: L.eyeSpacing,
        y: 0,
        scale: L.eyeScale,
        scaleY: 1,
        open: 1 - blink,
        smile: clamp(L.eyeSmile),
        lid: clamp(L.eyeLid),
        tilt: L.eyeTilt,
        sparkle: 0.8,
        asym: L.eyeAsym,
        w: 3.3,
        h: 4.3,
      },
      lx,
      ly,
    );
    this.mouth.render(lx * 0.8, 7 + ly * 0.6, L.mouthWidth, L.mouthCurve, L.mouthOpen, 0);
    this.updateFeature(t, L);
  }

  private motion(t: number, L: CreatureLook): { dx: number; dy: number; rot: number; sx: number; sy: number } {
    const a = L.motionAmp;
    const s = L.motionSpeed;
    let dx = 0;
    let dy = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    switch (this.def.motion) {
      case 'tremble': {
        dx = noise1(t * 30, this.seed) * 1.6 * a;
        const flinch = bump(fract(t / 3.1) / 0.18);
        sy = 1 + noise1(t * 7, this.seed + 1) * 0.03 - flinch * 0.12 * a;
        sx = 1 + flinch * 0.06 * a;
        dy = flinch * 3;
        break;
      }
      case 'pace': {
        dx = Math.sin(t * 1.2 * s) * 20 * a;
        rot = Math.cos(t * 1.2 * s) * 0.12 * a;
        dy = -Math.abs(Math.sin(t * 5 * s)) * 2.5 * a;
        break;
      }
      case 'tilt': {
        rot = Math.sin(t * 0.9 * s) * 0.28 * a;
        dy = Math.sin(t * 0.6) * 2;
        break;
      }
      case 'bounce':
      case 'hop': {
        const rate = this.def.motion === 'bounce' ? 1.1 : 0.75;
        const ph = fract(t * rate * s);
        const h = 4 * ph * (1 - ph);
        dy = -h * (this.def.motion === 'bounce' ? 20 : 26) * a;
        sy = 1 + (h - 0.45) * 0.18 * a;
        sx = 1 / sy;
        if (this.def.motion === 'hop' && Math.floor(t * rate * s) % 4 === 3) rot = TAU * easeInOutSine(ph);
        break;
      }
      case 'float': {
        dy = Math.sin(t * 0.9 * s) * 6 * a - 4;
        dx = Math.sin(t * 0.53 * s) * 5 * a;
        rot = Math.sin(t * 0.7) * 0.06;
        break;
      }
      case 'vibrate': {
        dx = noise1(t * 40, this.seed) * 1.4 * a;
        sy = 0.97 + Math.sin(t * 3 * s) * 0.03;
        sx = 1 / sy;
        break;
      }
      case 'inflate': {
        const k = 1 + Math.sin(t * 0.8 * s) * 0.07 * a;
        sx = k;
        sy = k;
        dy = -(k - 1) * 30;
        break;
      }
    }
    return { dx, dy, rot, sx, sy };
  }

  private buildFeature(): void {
    const g = this.feature;
    const parts = this.featureParts;
    const ink = { fill: 'none', stroke: INK, 'stroke-width': 1.8, 'stroke-linecap': 'round' };
    switch (this.def.feature) {
      case 'shiver':
        parts.push(svg('path', { ...ink, d: `M${-R - 6},-6 Q${-R - 10},0 ${-R - 6},6` }, g));
        parts.push(svg('path', { ...ink, d: `M${R + 6},-6 Q${R + 10},0 ${R + 6},6` }, g));
        break;
      case 'spiral':
        parts.push(
          svg('path', { ...ink, d: 'M0,0 C3,-4 7,0 4,4 C0,8 -7,4 -6,-2 C-5,-9 5,-11 9,-5', transform: `translate(0 ${-R - 12})` }, g),
        );
        break;
      case 'hook':
        parts.push(svg('path', { ...ink, 'stroke-width': 2.2, d: `M0,${-R + 2} C0,${-R - 8} 9,${-R - 10} 9,${-R - 4} C9,${-R} 4,${-R} 4,${-R - 4}` }, g));
        break;
      case 'sparkles':
        for (let i = 0; i < 3; i++) {
          parts.push(
            svg('path', { d: 'M0,-5Q1,-1 5,0Q1,1 0,5Q-1,1 -5,0Q-1,-1 0,-5Z', fill: WHITE, stroke: INK, 'stroke-width': 1 }, g),
          );
        }
        break;
      case 'inner': {
        // A tiny remembered HUMI, tucked low beside the face.
        const ig = svg('g', { opacity: 0.45 }, g);
        svg('circle', { cx: 11, cy: 6, r: 3.2, fill: '#4D98D6' }, ig);
        svg('ellipse', { cx: 11, cy: 12, rx: 3.4, ry: 3.8, fill: '#4D98D6' }, ig);
        parts.push(ig);
        parts.push(svg('path', { d: `M${-R * 0.55},${-R * 0.55} A${R * 0.75},${R * 0.75} 0 0 1 ${-R * 0.05},${-R * 0.78}`, fill: 'none', stroke: WHITE, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.8 }, g));
        // Face sits on top of the inner scene but should stay readable.
        break;
      }
      case 'confetti': {
        const colors = [ACCENT.sun, ACCENT.pink, ACCENT.teal, ACCENT.violet];
        for (let i = 0; i < 4; i++) {
          parts.push(svg('rect', { x: -2, y: -1.5, width: 4, height: 3, rx: 1, fill: colors[i], opacity: 0 }, g));
        }
        break;
      }
      case 'steam':
        for (let i = 0; i < 2; i++) {
          parts.push(svg('circle', { r: 4, fill: WHITE, stroke: INK, 'stroke-width': 1.4, opacity: 0 }, g));
        }
        break;
      case 'crown': {
        parts.push(
          svg('path', { d: `M-9,${-R * 1.1 + 4} L-9,${-R * 1.1 - 4} L-4.5,${-R * 1.1} L0,${-R * 1.1 - 7} L4.5,${-R * 1.1} L9,${-R * 1.1 - 4} L9,${-R * 1.1 + 4}Z`, fill: ACCENT.gold, stroke: INK, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, g),
        );
        parts.push(svg('circle', { cx: 0, cy: -R * 1.1 - 7, r: 1.6, fill: WHITE }, g));
        break;
      }
    }
  }

  private updateFeature(t: number, L: CreatureLook): void {
    const p = this.featureParts;
    const ry = R * L.squashY;
    switch (this.def.feature) {
      case 'shiver': {
        const o = 0.3 + 0.7 * Math.max(0, noise1(t * 8, this.seed));
        p.forEach((e) => e.setAttribute('opacity', String(r2(o * clamp(L.motionAmp)))));
        break;
      }
      case 'spiral':
        p[0].setAttribute('transform', `translate(0 ${r2(-ry - 12)}) rotate(${r2(t * 160 * L.motionSpeed)})`);
        break;
      case 'hook':
        p[0].setAttribute('transform', `translate(0 ${r2(R - ry)}) rotate(${r2(Math.sin(t * 2) * 8)})`);
        break;
      case 'sparkles':
        p.forEach((e, i) => {
          const a = t * 1.2 * L.motionSpeed + (i * TAU) / 3;
          const tw = 0.6 + 0.4 * Math.sin(t * 6 + i * 2);
          e.setAttribute('transform', tf(Math.cos(a) * R * 1.45, Math.sin(a) * R * 1.1 - 4, 0, tw));
        });
        break;
      case 'inner':
        p[0].setAttribute('transform', tf(Math.sin(t * 0.8) * 2, Math.cos(t * 0.6) * 1.5));
        break;
      case 'confetti': {
        const ph = fract(t * 0.75 * L.motionSpeed);
        p.forEach((e, i) => {
          const k = ph < 0.35 ? ph / 0.35 : 1;
          const ang = -Math.PI / 2 + (i - 1.5) * 0.6;
          const d = 8 + k * 22;
          setAttrs(e, {
            transform: tf(Math.cos(ang) * d, -R * 0.6 + Math.sin(ang) * d + k * k * 10, k * 4 + i),
            opacity: ph < 0.35 ? 1 - k : 0,
          });
        });
        break;
      }
      case 'steam':
        p.forEach((e, i) => {
          const u = fract(t * 0.8 * L.motionSpeed + i * 0.5);
          setAttrs(e, {
            transform: tf((i ? 8 : -8) + Math.sin(u * 6) * 2, -ry - 2 - u * 18, 0, 0.6 + u * 0.9),
            opacity: bump(u) * clamp(L.motionAmp),
          });
        });
        break;
      case 'crown':
        p.forEach((e) => e.setAttribute('transform', `translate(0 ${r2(R - ry)})`));
        p[1].setAttribute('opacity', String(r2(0.4 + 0.6 * Math.max(0, Math.sin(t * 2.5)))));
        break;
    }
  }
}
