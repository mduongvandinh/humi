import { bump, clamp, fbm, fract, noise1, rng, rotate, TAU, type Pt } from '../engine/math';
import { Emitter } from '../engine/events';
import { INK, TINTS } from '../engine/palette';
import { Spring, Spring2D, SpringBank } from '../engine/spring';
import { DefsBank, setAttrs, svg, tf } from '../engine/svg';
import { ThoughtOrbit } from '../orbit/ThoughtOrbit';
import type { CoreParams } from './coreStates';
import { EXPRESSIONS } from './expressions';
import { HumiBody } from './HumiBody';
import { HumiCore } from './HumiCore';
import { HumiHead } from './HumiHead';
import { HumiLimb } from './HumiLimb';
import { PARAM_DEFAULTS, springFor, type HumiParams, type ParamKey, type ParamPatch } from './params';
import { POSES } from './poses';
import { DIM, type Rig } from './rig';

export interface CharacterOptions {
  defs: DefsBank;
  id?: string;
  /** Home position in world space (feet). */
  x?: number;
  y?: number;
  size?: number;
  seed?: number;
  tint?: string;
}

/** What an action (or a timeline) can impose on a character for one frame. */
export interface ActionOutput {
  params?: ParamPatch;
  pose?: string;
  expression?: string;
  core?: Partial<CoreParams>;
  /** World point to look at, or null to look where the expression says. */
  lookAt?: Pt | null;
  /** World x to stand at. */
  moveTo?: number;
}

export type AnchorName = 'head' | 'core' | 'handL' | 'handR' | 'shoulderL' | 'shoulderR' | 'feet' | 'orbit';

/**
 * HUMI. Owns its SVG nodes and updates them every frame from:
 *   target  = defaults ⊕ pose ⊕ expression ⊕ overrides ⊕ action
 *   current = springs chasing target (staggered per body part)
 *   final   = current + pose cycles + idle life (breath, wobble, blinks)
 */
export class HumiCharacter {
  readonly el: SVGGElement;
  readonly id: string;
  readonly seed: number;
  readonly params: SpringBank<ParamKey>;
  readonly core: HumiCore;
  readonly orbit: ThoughtOrbit;
  readonly events = new Emitter<{ bonk: number; absorb: number; release: number }>();

  homeX: number;
  homeY: number;
  size: number;
  expression = 'neutral';
  pose = 'standing';
  overrides: ParamPatch = {};
  lookAt: Pt | null = null;

  rig!: Rig;
  current: HumiParams = { ...PARAM_DEFAULTS };
  breath = 0;

  private shadow: SVGEllipseElement;
  private legsLayer: SVGGElement;
  private armsBack: SVGGElement;
  private armsFront: SVGGElement;
  private body: HumiBody;
  private head: HumiHead;
  private arms: HumiLimb[];
  private legs: HumiLimb[];
  private poseWeights = new Map<string, Spring>();
  private headLag = new Spring2D(0, 0, { k: 170, zeta: 0.42 });
  private handLag = [new Spring2D(0, 0, { k: 120, zeta: 0.5 }), new Spring2D(0, 0, { k: 120, zeta: 0.5 })];
  private time = 0;
  private breathPhase = 0;
  private blinkAge = -1;
  private blinkTimer = 1.2;
  private rand: () => number;
  private needsSnap = true;

  constructor(parent: SVGGElement, o: CharacterOptions) {
    this.id = o.id ?? 'humi';
    this.seed = o.seed ?? 1;
    this.homeX = o.x ?? 640;
    this.homeY = o.y ?? 560;
    this.size = o.size ?? 1.6;
    this.rand = rng(this.seed);
    const tint = TINTS[o.tint ?? 'pearl'] ?? TINTS.pearl;
    const shade = o.defs.shade(tint.fill, tint.shade);

    this.el = svg('g', { class: 'humi', 'data-id': this.id }, parent);
    this.shadow = svg('ellipse', { class: 'humi-shadow', fill: INK, opacity: 0.13, rx: 44, ry: 7 }, this.el);
    const haloLayer = svg('g', { class: 'humi-core' }, this.el);
    const orbitBack = svg('g', { class: 'orbit-back' }, this.el);
    const backLinks = svg('g', { class: 'orbit-links' }, this.el);
    this.legsLayer = svg('g', { class: 'humi-legs' }, this.el);
    this.armsBack = svg('g', { class: 'humi-arms-back' }, this.el);
    this.body = new HumiBody(this.el, shade, this.seed);
    // The inner light is clipped to the body so it never muddies the outline.
    const clipId = `${this.body.id}-clip`;
    svg('use', { href: `#${this.body.id}` }, svg('clipPath', { id: clipId }, svg('defs', {}, this.el)));
    const coreLayer = svg('g', { 'clip-path': `url(#${clipId})` }, this.el);
    this.el.appendChild(this.body.outline);
    const ringLayer = svg('g', { class: 'humi-core' }, this.el);
    this.head = new HumiHead(this.el, shade, this.seed);
    this.armsFront = svg('g', { class: 'humi-arms-front' }, this.el);
    const frontLinks = svg('g', { class: 'orbit-links' }, this.el);
    const orbitFront = svg('g', { class: 'orbit-front' }, this.el);

    this.legs = [0, 1].map(() => {
      const l = new HumiLimb('leg', tint.fill);
      this.legsLayer.appendChild(l.el);
      return l;
    });
    this.arms = [0, 1].map(() => {
      const a = new HumiLimb('arm', tint.fill);
      this.armsBack.appendChild(a.el);
      return a;
    });

    this.core = new HumiCore({ halo: haloLayer, inner: coreLayer, rings: ringLayer }, this.seed);
    this.params = new SpringBank<ParamKey>({ ...PARAM_DEFAULTS }, springFor);
    this.orbit = new ThoughtOrbit(
      orbitBack,
      orbitFront,
      backLinks,
      frontLinks,
      {
        head: () => this.rig?.head ?? [0, -140],
        core: () => this.rig?.core ?? [0, -70],
        emit: (ev, strength) => this.events.emit(ev, strength),
      },
      o.defs,
      this.seed,
    );

    // Secondary reactions to thoughts.
    this.events.on('bonk', () => {
      this.headLag.kick(0, 260);
      this.params.kick('squash', -1.6);
      this.blinkAge = 0;
    });
    this.events.on('absorb', (s) => this.core.flash(0.8 * s));
    this.events.on('release', (s) => this.core.flash(0.3 * s));
  }

  setExpression(name: string): void {
    this.expression = name;
  }
  setPose(name: string): void {
    this.pose = name;
  }
  setCore(state: string, intensity?: number): void {
    this.core.setState(state, intensity);
  }
  setParams(patch: ParamPatch): void {
    this.overrides = { ...patch };
  }

  /** Make the current position the new home (so finished walks don't slide back). */
  rebaseHome(): void {
    const d = this.params.value.rootX;
    this.homeX += d;
    this.params.value.rootX = 0;
    this.params.target.rootX = 0;
  }

  /** Jump straight to the current targets on the next update (no easing). */
  snap(): void {
    this.needsSnap = true;
  }

  rootWorld(p: HumiParams = this.current): Pt {
    return [this.homeX + p.rootX, this.homeY + p.rootY];
  }

  get worldX(): number {
    return this.homeX + this.current.rootX;
  }

  toWorld(pt: Pt): Pt {
    const [rx, ry] = this.rootWorld();
    return [rx + pt[0] * this.size, ry + pt[1] * this.size];
  }

  anchor(name: AnchorName): Pt {
    const r = this.rig;
    if (!r) return [this.homeX, this.homeY - 120 * this.size];
    switch (name) {
      case 'head':
        return this.toWorld(r.head);
      case 'core':
        return this.toWorld(r.core);
      case 'handL':
        return this.toWorld(r.hand[0]);
      case 'handR':
        return this.toWorld(r.hand[1]);
      case 'shoulderL':
        return this.toWorld(r.shoulder[0]);
      case 'shoulderR':
        return this.toWorld(r.shoulder[1]);
      case 'orbit':
        return this.toWorld([r.head[0], r.head[1] - this.orbit.lift]);
      case 'feet':
        return [this.worldX, this.homeY];
    }
  }

  update(dt: number, sceneTime: number, out: ActionOutput = {}): void {
    this.time += dt;
    const t = this.time;
    const poseName = POSES[out.pose ?? this.pose] ? (out.pose ?? this.pose) : 'standing';
    const exprName = EXPRESSIONS[out.expression ?? this.expression] ? (out.expression ?? this.expression) : 'neutral';

    const target: HumiParams = {
      ...PARAM_DEFAULTS,
      ...POSES[poseName].params,
      ...EXPRESSIONS[exprName].params,
      ...this.overrides,
      ...out.params,
    };
    if (out.moveTo !== undefined) target.rootX = out.moveTo - this.homeX;
    const look = out.lookAt !== undefined ? out.lookAt : this.lookAt;
    if (look && this.rig) {
      const [hx, hy] = this.toWorld(this.rig.head);
      target.lookX = clamp((look[0] - hx) / 170, -1, 1);
      target.lookY = clamp((look[1] - hy) / 150, -1, 1);
      target.headTilt += clamp((look[0] - hx) / 1400, -0.12, 0.12);
    }
    this.params.setTarget(target);

    if (!this.poseWeights.has(poseName)) this.poseWeights.set(poseName, new Spring(0, { k: 40, zeta: 1 }));
    if (this.needsSnap) {
      this.params.snap();
      this.core.snap();
      this.poseWeights.clear();
      this.poseWeights.set(poseName, new Spring(1, { k: 40, zeta: 1 }));
    } else {
      this.params.step(dt);
    }
    for (const [name, w] of this.poseWeights) {
      w.step(dt, name === poseName ? 1 : 0);
      if (name !== poseName && w.value < 0.002) this.poseWeights.delete(name);
    }

    const p: HumiParams = { ...this.params.value };
    for (const [name, w] of this.poseWeights) {
      const cycle = POSES[name]?.cycle;
      if (!cycle) continue;
      const off = cycle(t, p);
      for (const k in off) {
        const key = k as ParamKey;
        p[key] += (off[key] ?? 0) * w.value;
      }
    }
    this.breath = this.idle(p, dt, t);
    this.current = p;
    this.rig = this.computeRig(p, this.breath, dt, this.needsSnap);
    this.needsSnap = false;
    this.render(p, t, dt, sceneTime, out);
  }

  /** The "never perfectly static" layer: breath, wobble, sway, blinks, tremble. */
  private idle(p: HumiParams, dt: number, t: number): number {
    const e = p.energy;
    const s = this.seed;
    this.breathPhase += dt * TAU * p.breathRate;
    const breath = Math.sin(this.breathPhase);
    p.squash *= 1 + breath * 0.02 * p.breathDepth;
    p.lean += fbm(t * 0.3, s) * 0.03 * e;
    p.headTilt += fbm(t * 0.23, s + 5) * 0.06 * e;
    // Arms answer the breath a beat late — the cheapest follow-through there is.
    const sway = Math.sin(this.breathPhase - 0.9) * 0.03 * p.breathDepth;
    p.armLAngle += fbm(t * 0.5, s + 9) * 0.07 * e + sway;
    p.armRAngle += fbm(t * 0.5, s + 13) * 0.07 * e + sway;
    p.lookX += fbm(t * 0.6, s + 17) * 0.07;
    p.lookY += fbm(t * 0.5, s + 19) * 0.05;

    if (p.tremble > 0.001) {
      const k = p.tremble;
      p.rootX += noise1(t * 28, s + 31) * 1.6 * k;
      p.squash += noise1(t * 22, s + 37) * 0.012 * k;
      p.armLAngle += noise1(t * 25, s + 41) * 0.05 * k;
      p.armRAngle += noise1(t * 25, s + 43) * 0.05 * k;
      p.eyeScale += noise1(t * 30, s + 47) * 0.03 * k;
    }
    if (p.bounce > 0.001) {
      const ph = fract(t * 1.6);
      const h = 4 * ph * (1 - ph);
      p.rootY -= h * 18 * p.bounce;
      p.squash *= 1 - Math.pow(1 - h, 8) * 0.12 * p.bounce;
    }

    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkAge = 0;
      this.blinkTimer = this.rand() < 0.15 ? 0.32 : 1.8 + this.rand() * 3.6;
    }
    if (this.blinkAge >= 0) {
      this.blinkAge += dt;
      p.eyeOpen *= 1 - bump(this.blinkAge / 0.16);
      if (this.blinkAge > 0.16) this.blinkAge = -1;
    }
    return breath;
  }

  private computeRig(p: HumiParams, breath: number, dt: number, snap: boolean): Rig {
    const sy = Math.max(0.5, p.squash * (1 + p.stretch) * (1 - p.slump * 0.06));
    const sx = (1 / Math.sqrt(sy)) * (1 + p.puff * 0.05);
    const rx = DIM.bodyRx * sx;
    const ry = DIM.bodyRy * sy;
    const bottom = -(DIM.legLen - 5) + p.bodyDrop;
    const pivot: Pt = [0, bottom];
    const lean = p.lean;
    const cy = bottom - ry * 0.94;
    const R = (x: number, y: number): Pt => rotate(x, y, 0, bottom, lean);
    const root = this.rootWorld(p);
    const sz = this.size;
    const toW = (q: Pt): Pt => [root[0] + q[0] * sz, root[1] + q[1] * sz];
    const toL = (w: Pt): Pt => [(w[0] - root[0]) / sz, (w[1] - root[1]) / sz];

    // Head: placed on the neck, then lagged in world space so it bobbles.
    const headIdeal = R(0, cy - ry - DIM.headRy * 0.72 + p.headSink + p.slump * 7);
    const hw = toW(headIdeal);
    if (snap) this.headLag.snap(hw[0], hw[1]);
    let head = toL(this.headLag.step(hw[0], hw[1], dt));
    const lagX = head[0] - headIdeal[0];
    const lagY = head[1] - headIdeal[1];
    const lagD = Math.hypot(lagX, lagY);
    if (lagD > 10) head = [headIdeal[0] + (lagX / lagD) * 10, headIdeal[1] + (lagY / lagD) * 10];

    // Arms: noodles from shoulder to a lagged hand.
    const shoulderY = cy - ry * 0.36 - breath * 1.2 * p.breathDepth;
    const shoulder: Pt[] = [];
    const hand: Pt[] = [];
    const elbow: Pt[] = [];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const angle = (i === 0 ? p.armLAngle : p.armRAngle) - p.slump * 0.2;
      const reach = i === 0 ? p.armLReach : p.armRReach;
      const bend = i === 0 ? p.armLBend : p.armRBend;
      const S = R(side * rx * 0.72, shoulderY);
      const [dx, dy] = rotate(side * Math.sin(angle), Math.cos(angle), 0, 0, lean);
      const ideal: Pt = [S[0] + dx * DIM.armLen * reach, S[1] + dy * DIM.armLen * reach];
      const iw = toW(ideal);
      if (snap) this.handLag[i].snap(iw[0], iw[1]);
      let H = toL(this.handLag[i].step(iw[0], iw[1], dt));
      let cx = H[0] - S[0];
      let cyy = H[1] - S[1];
      let len = Math.hypot(cx, cyy) || 1;
      const maxLen = DIM.armLen * 1.35;
      if (len > maxLen) {
        H = [S[0] + (cx / len) * maxLen, S[1] + (cyy / len) * maxLen];
        cx = H[0] - S[0];
        cyy = H[1] - S[1];
        len = maxLen;
      }
      const ux = cx / len;
      const uy = cyy / len;
      const sag = bend * (Math.sqrt(Math.max(DIM.armLen ** 2 - len ** 2, 0)) * 0.38 + 4);
      const perp: Pt = [uy * side, -ux * side];
      shoulder.push(S);
      hand.push(H);
      elbow.push([(S[0] + H[0]) / 2 + perp[0] * sag * 2, (S[1] + H[1]) / 2 + perp[1] * sag * 2]);
    }

    // Legs: short and grounded; crouching splays them automatically.
    const hipY = bottom - 5;
    const hip: Pt[] = [];
    const knee: Pt[] = [];
    const foot: Pt[] = [];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const a = i === 0 ? p.legLAngle : p.legRAngle;
      const lift = i === 0 ? p.legLLift : p.legRLift;
      const H: Pt = [side * (DIM.hipX + Math.max(0, p.legSpread) * 0.3), hipY];
      let fx = Math.sin(a) * DIM.legLen;
      let fy = hipY + Math.cos(a) * DIM.legLen;
      if (fy > 0) {
        const avail = Math.max(0, -hipY);
        fx = Math.max(Math.abs(fx), Math.sqrt(Math.max(DIM.legLen ** 2 - avail ** 2, 0)));
        fy = 0;
      }
      const F: Pt = [H[0] + side * (fx + p.legSpread), fy - lift];
      const lx = F[0] - H[0];
      const ly = F[1] - H[1];
      const llen = Math.hypot(lx, ly) || 1;
      const sag = Math.sqrt(Math.max(DIM.legLen ** 2 - llen ** 2, 0)) * 0.5 + 1;
      const perp: Pt = [(ly / llen) * side, (-lx / llen) * side];
      hip.push(H);
      foot.push(F);
      knee.push([(H[0] + F[0]) / 2 + perp[0] * sag * 2, (H[1] + F[1]) / 2 + perp[1] * sag * 2]);
    }

    return {
      pivot,
      lean,
      body: { cx: 0, cy, rx, ry, puff: p.puff },
      neck: R(0, cy - ry * 0.92),
      head,
      headRot: p.headTilt + lean * 0.7 + lagX * 0.012,
      face: { x: p.lookX * 10, y: p.lookY * 6 },
      shoulder: shoulder as [Pt, Pt],
      hand: hand as [Pt, Pt],
      elbow: elbow as [Pt, Pt],
      hip: hip as [Pt, Pt],
      knee: knee as [Pt, Pt],
      foot: foot as [Pt, Pt],
      core: R(0, cy - ry * 0.1),
      breath,
    };
  }

  private render(p: HumiParams, t: number, dt: number, sceneTime: number, out: ActionOutput): void {
    const rig = this.rig;
    const [wx, wy] = this.rootWorld(p);
    this.el.setAttribute('transform', tf(wx, wy, 0, this.size));
    const air = clamp(-p.rootY / 260);
    setAttrs(this.shadow, { cx: 0, cy: -p.rootY / this.size, rx: 44 * (1 - air * 0.5), ry: 7 * (1 - air * 0.4), opacity: 0.13 * (1 - air * 0.6) });

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      this.legs[i].render(rig.hip[i], rig.knee[i], rig.foot[i], [rig.foot[i][0] + side * 5, rig.foot[i][1]]);
      const front = (i === 0 ? p.armLFront : p.armRFront) > 0.5;
      const layer = front ? this.armsFront : this.armsBack;
      if (this.arms[i].el.parentNode !== layer) layer.appendChild(this.arms[i].el);
      this.arms[i].render(rig.shoulder[i], rig.elbow[i], rig.hand[i]);
    }
    this.body.render(rig, t);
    this.head.render(rig, p, t);
    this.core.update(dt, t, { x: rig.core[0], y: rig.core[1], sceneTime, extra: out.core });
    this.orbit.update(dt);
  }

  dispose(): void {
    this.orbit.clear();
    this.el.remove();
  }
}
