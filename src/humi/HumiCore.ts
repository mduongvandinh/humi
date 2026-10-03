import { clamp, fbm, fract, lerp, nearestAngleDeg, noise1, TAU } from '../engine/math';
import { INK, WHITE } from '../engine/palette';
import { SpringBank } from '../engine/spring';
import { setAttrs, svg, tf, uid } from '../engine/svg';
import { CORE_DEFAULT, coreTarget, type CoreKey, type CoreParams } from './coreStates';
import { DIM } from './rig';

export interface CoreFrame {
  x: number;
  y: number;
  /** Shared scene clock, used by synchronized Cores to share one beat. */
  sceneTime: number;
  /** Additive offsets from actions (e.g. brighter as a light approaches). */
  extra?: Partial<CoreParams>;
}

const CRACKS =
  'M-1,-8.2L0.8,-4L-1.6,-0.8L1.2,2.4L0,8.3M-1.6,-0.8L-5.4,1.4M1.2,2.4L5,4.6M0.8,-4L4.2,-5.6';

/** The Human Core: the glowing light inside HUMI's chest. */
/** Where the Core draws: halo behind the body, light clipped inside it, rings on top. */
export interface CoreLayers {
  halo: SVGGElement;
  inner: SVGGElement;
  rings: SVGGElement;
}

export class HumiCore {
  readonly el: SVGGElement;
  readonly springs: SpringBank<CoreKey>;
  state = 'calm';
  intensity = 1;
  /** Last pulse value 0..1 (read by scene effects such as sync threads). */
  pulse = 0;

  private glow: SVGCircleElement;
  private halo: SVGCircleElement;
  private haloG: SVGGElement;
  private ringG: SVGGElement;
  private socket: SVGCircleElement;
  private rings: SVGCircleElement[];
  private orb: SVGCircleElement;
  private highlight: SVGEllipseElement;
  private cracks: SVGGElement;
  private crackLight: SVGPathElement;
  private glowStops: SVGStopElement[];
  private orbStops: SVGStopElement[];
  private phase = 0;
  private ringPhase = 0;
  private flashV = 0;

  constructor(
    layers: CoreLayers,
    private readonly seed: number,
  ) {
    this.el = svg('g', { class: 'humi-core' }, layers.inner);
    this.haloG = svg('g', {}, layers.halo);
    this.ringG = svg('g', {}, layers.rings);
    const defs = svg('defs', {}, this.el);
    const glowId = uid('core-glow');
    const orbId = uid('core-orb');
    const gg = svg('radialGradient', { id: glowId }, defs);
    this.glowStops = [0, 40, 100].map((o) => svg('stop', { offset: `${o}%` }, gg));
    setAttrs(this.glowStops[0], { 'stop-opacity': 0.9 });
    setAttrs(this.glowStops[1], { 'stop-opacity': 0.32 });
    setAttrs(this.glowStops[2], { 'stop-opacity': 0 });
    const og = svg('radialGradient', { id: orbId, cx: '40%', cy: '38%', r: '70%' }, defs);
    this.orbStops = [0, 55, 100].map((o) => svg('stop', { offset: `${o}%` }, og));

    this.halo = svg('circle', { class: 'core-halo', fill: `url(#${glowId})` }, this.haloG);
    this.glow = svg('circle', { class: 'core-glow', fill: `url(#${glowId})` }, this.el);
    this.socket = svg(
      'circle',
      { fill: 'none', stroke: INK, 'stroke-width': 1.3, 'stroke-dasharray': '2.5 3', r: DIM.coreR * 1.7, opacity: 0 },
      this.el,
    );
    this.rings = [0, 1].map(() => svg('circle', { fill: 'none', 'stroke-width': 1.6, opacity: 0 }, this.ringG));
    this.orb = svg('circle', { class: 'core-orb', fill: `url(#${orbId})` }, this.el);
    this.cracks = svg('g', { opacity: 0 }, this.el);
    this.crackLight = svg('path', { d: CRACKS, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.6 }, this.cracks);
    svg('path', { d: CRACKS, fill: 'none', stroke: INK, 'stroke-width': 1.25, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.cracks);
    this.highlight = svg('ellipse', { fill: WHITE, opacity: 0.85 }, this.el);

    this.springs = new SpringBank<CoreKey>({ ...CORE_DEFAULT }, (k) =>
      k === 'hue' || k === 'sat' || k === 'light'
        ? { k: 40, zeta: 1 }
        : k === 'size'
          ? { k: 90, zeta: 0.45 }
          : { k: 60, zeta: 0.75 },
    );
  }

  setState(state: string, intensity = this.intensity): void {
    this.state = state;
    this.intensity = intensity;
  }

  /** A burst of light: a thought arriving, a realisation. */
  flash(amount = 1): void {
    this.flashV = Math.min(1.6, this.flashV + amount);
  }

  snap(): void {
    this.retarget();
    this.springs.snap();
  }

  private retarget(extra?: Partial<CoreParams>): void {
    const target = coreTarget(this.state, this.intensity);
    if (extra) {
      for (const k in extra) {
        const key = k as CoreKey;
        target[key] += extra[key] ?? 0;
      }
    }
    target.hue = nearestAngleDeg(this.springs.value.hue, target.hue);
    this.springs.setTarget(target);
  }

  update(dt: number, t: number, f: CoreFrame): void {
    this.retarget(f.extra);
    this.springs.step(dt);
    const c = this.springs.value;
    this.flashV *= Math.exp(-dt * 2.8);
    const fl = this.flashV;

    // Pulse — own rhythm, blended toward the shared scene rhythm when synced.
    const irregular = 1 + c.jitter * fbm(t * 1.7, this.seed) * 0.9;
    this.phase += dt * TAU * c.pulseRate * irregular;
    const own = 0.5 + 0.5 * Math.sin(this.phase);
    const shared = 0.5 + 0.5 * Math.sin(f.sceneTime * TAU * c.pulseRate);
    const pw = Math.pow(lerp(own, shared, clamp(c.sync)), 1 + 2 * clamp(c.pulseDepth));
    this.pulse = pw;

    const flick = 1 - clamp(c.flicker) * Math.max(0, noise1(t * 13, this.seed + 3)) * 0.85;
    const bright = clamp(c.brightness * flick + fl * 0.6, 0, 1.4);
    const jx = fbm(t * 11, this.seed + 7) * c.jitter * 2.6 + fbm(t * 0.35, this.seed + 9) * c.detach * 6;
    const jy = fbm(t * 12, this.seed + 8) * c.jitter * 2.6 + c.detach * (3 + fbm(t * 0.3, this.seed + 10) * 3);

    const at = tf(f.x, f.y);
    this.el.setAttribute('transform', at);
    this.haloG.setAttribute('transform', at);
    this.ringG.setAttribute('transform', at);

    const h = Math.round(((c.hue % 360) + 360) % 360);
    const b1 = Math.min(1, bright);
    const S = clamp(c.sat * (0.4 + 0.6 * b1), 0, 100);
    const L = clamp(c.light * (0.55 + 0.45 * b1), 0, 100);
    const col = `hsl(${h} ${S.toFixed(0)}% ${L.toFixed(0)}%)`;
    const hot = `hsl(${h} ${S.toFixed(0)}% ${Math.min(97, L + 30).toFixed(0)}%)`;
    const deep = `hsl(${h} ${S.toFixed(0)}% ${(L * 0.62).toFixed(0)}%)`;

    const size = Math.max(0.2, c.size) * (1 + pw * c.pulseDepth * 0.2 + fl * 0.35);
    const r = DIM.coreR * size;

    for (const s of this.glowStops) s.setAttribute('stop-color', col);
    this.orbStops[0].setAttribute('stop-color', hot);
    this.orbStops[1].setAttribute('stop-color', col);
    this.orbStops[2].setAttribute('stop-color', deep);

    const glowR = DIM.coreR * (2 + Math.max(0, c.glow) * 4.2) * (1 + pw * c.pulseDepth * 0.3 + fl * 0.6);
    const glowOp = clamp(bright * (0.15 + 0.85 * clamp(c.glow)) + fl * 0.4);
    setAttrs(this.glow, { cx: jx, cy: jy, r: glowR, opacity: glowOp });
    // The halo leaks out around the body only when the light is strong.
    setAttrs(this.halo, { cx: jx, cy: jy, r: glowR * 1.9, opacity: clamp(glowOp * (clamp(c.glow) * 0.9 + fl * 0.5)) });
    setAttrs(this.orb, { cx: jx, cy: jy, r, opacity: 0.55 + 0.45 * b1 });
    setAttrs(this.highlight, {
      cx: jx - r * 0.33,
      cy: jy - r * 0.38,
      rx: r * 0.28,
      ry: r * 0.2,
      opacity: 0.35 + 0.5 * b1,
    });
    this.socket.setAttribute('opacity', String(clamp(c.detach) * 0.6));

    // Rings: outward when expanding, inward when contracting.
    this.ringPhase += dt * (0.45 + c.pulseRate * 0.35);
    const dir = clamp((c.ringDir + 1) / 2);
    for (let i = 0; i < 2; i++) {
      const u = fract(this.ringPhase + i / 2);
      const rr = lerp(r * (4.2 - u * 3.2), r * (1 + u * 3.2), dir);
      const op = lerp(u, 1 - u, dir) * clamp(c.rings) * 0.75;
      setAttrs(this.rings[i], { cx: jx, cy: jy, r: rr, opacity: op, stroke: col });
    }

    setAttrs(this.cracks, { opacity: clamp(c.crack), transform: tf(jx, jy, 0, size) });
    this.crackLight.setAttribute('stroke', hot);
  }
}
