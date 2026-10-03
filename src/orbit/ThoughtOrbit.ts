import {
  bump,
  clamp,
  easeInCubic,
  easeOutBack,
  easeOutCubic,
  fbm,
  fract,
  hash1,
  lerp,
  noise1,
  rotate,
  smoothstep,
  type Pt,
} from '../engine/math';
import { ACCENT } from '../engine/palette';
import { DefsBank, setAttrs, svg, tf } from '../engine/svg';
import { DEFAULT_INTO, ThoughtObject, type Behavior, type OrbitItemSpec } from './ThoughtObject';

export interface OrbitHost {
  /** Head centre and Core position, in the host's local space. */
  head(): Pt;
  core(): Pt;
  emit(event: 'bonk' | 'absorb' | 'release', strength: number): void;
}

interface Placement {
  x: number;
  y: number;
  depth: number;
  s: number;
  op: number;
}

interface Burst {
  el: SVGGElement;
  x: number;
  y: number;
  age: number;
}

const PERIOD: Partial<Record<Behavior, number>> = {
  appear: 4,
  disappear: 4,
  collide: 3.2,
  multiply: 7,
  transform: 4.2,
  enter: 4.6,
  leave: 5.2,
};

export function normalizeOrbitItem(item: OrbitItemSpec | string): OrbitItemSpec {
  return typeof item === 'string' ? { type: item, behavior: 'orbit' } : { behavior: 'orbit', ...item };
}

/**
 * An invisible tilted ellipse around the head. Objects behind the head are
 * drawn in `back` (occluded by HUMI), objects in front in `front`. Every
 * behaviour is a pure function of the object's behaviour-time, so the whole
 * system can be scrubbed and replayed deterministically.
 */
export class ThoughtOrbit {
  rx = 112;
  ry = 26;
  tilt = -0.06;
  lift = 54;
  speedMul = 1;
  behaviorOverride: Behavior | null = null;
  showGuide = false;

  readonly objects: ThoughtObject[] = [];
  private roots: ThoughtObject[] = [];
  private bursts: Burst[] = [];
  private linkPool: SVGPathElement[] = [];
  private guide: SVGEllipseElement;
  private seedCounter = 0;
  private t = 0;

  constructor(
    readonly back: SVGGElement,
    readonly front: SVGGElement,
    private readonly backLinks: SVGGElement,
    private readonly frontLinks: SVGGElement,
    private readonly host: OrbitHost,
    private readonly defs: DefsBank,
    private readonly seed: number,
  ) {
    this.guide = svg(
      'ellipse',
      { class: 'orbit-guide', fill: 'none', stroke: ACCENT.violet, 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0 },
      backLinks,
    );
  }

  /** Replace the orbit contents. Unchanged items keep their motion. */
  setItems(items: Array<OrbitItemSpec | string>): void {
    const specs = items.map(normalizeOrbitItem);
    const next: ThoughtObject[] = [];
    specs.forEach((spec, i) => {
      const key = JSON.stringify(spec);
      const existing = this.roots[i];
      if (existing && existing.key === key && !existing.dying) {
        next.push(existing);
        return;
      }
      existing?.kill();
      const obj = this.spawn(spec, key, i, specs.length, false);
      next.push(obj);
    });
    for (let i = specs.length; i < this.roots.length; i++) this.roots[i].kill();
    this.roots = next;
  }

  /** Swap every object of one type into another with a pop (e.g. ? → idea). */
  morphAll(from: string, to: string): void {
    for (const o of this.objects) {
      if (o.type === from && !o.dying) {
        o.setType(to);
        o.birth = 0.2;
      }
    }
  }

  restoreTypes(): void {
    for (const o of this.objects) if (o.type !== o.baseType) {
      o.setType(o.baseType);
      o.birth = 0.2;
    }
  }

  private spawn(spec: OrbitItemSpec, key: string, i: number, total: number, clone: boolean): ThoughtObject {
    const obj = new ThoughtObject(spec, key, i, total, this.seed * 31 + ++this.seedCounter * 7.3, this.defs, clone);
    this.front.appendChild(obj.el);
    this.objects.push(obj);
    return obj;
  }

  get center(): Pt {
    const [hx, hy] = this.host.head();
    return [hx, hy - this.lift];
  }

  private orbitPos(o: ThoughtObject, angle: number): Placement {
    const [cx, cy] = this.center;
    const ex = Math.cos(angle) * this.rx * o.lane;
    const ey = Math.sin(angle) * this.ry * o.lane + o.laneY;
    const [x, y] = rotate(ex, ey, 0, 0, this.tilt);
    return { x: cx + x, y: cy + y, depth: Math.sin(angle), s: 1, op: 1 };
  }

  update(dt: number): void {
    this.t += dt;
    const head = this.host.head();
    const core = this.host.core();

    // Pair up colliders (in order). A lone collider bonks the head instead.
    const colliders = this.objects.filter((o) => !o.dying && this.behaviorOf(o) === 'collide');
    colliders.forEach((o, i) => {
      const mate = i % 2 === 0 ? colliders[i + 1] : colliders[i - 1];
      o.partner = mate ?? null;
      o.pairSide = i % 2 === 0 ? -1 : 1;
      o.pairIndex = Math.floor(i / 2);
    });

    for (const o of this.objects) {
      o.age += dt;
      const b = this.behaviorOf(o);
      if (b !== o.activeBehavior) {
        o.activeBehavior = b;
        o.bAge = 0;
        o.lastCycle = -1;
      } else {
        o.bAge += dt;
      }
      o.birth = Math.min(1, o.birth + dt / 0.5);
      if (!(b === 'collide' && o.partner)) o.angle += dt * o.speed * this.speedMul * (b === 'swarm' ? 3.2 : 1);
      if (o.dying) o.dieT = Math.min(1, o.dieT + dt / 0.35);

      const p = this.place(o, b, head, core, dt);
      p.s *= easeOutBack(o.birth) * (1 - o.dieT);
      p.s *= 0.84 + 0.16 * p.depth;
      p.op *= 0.72 + 0.28 * (p.depth + 1) * 0.5;
      o.x = p.x;
      o.y = p.y;
      o.depth = p.depth;
      const layer = p.depth >= 0 ? this.front : this.back;
      if (o.el.parentNode !== layer) layer.appendChild(o.el);
      setAttrs(o.el, { transform: tf(p.x, p.y, 0, Math.max(0, p.s)), opacity: clamp(p.op) });
      o.shape.update(o.age, dt);
    }

    // Remove the dead.
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      if (o.dying && o.dieT >= 1) {
        o.el.remove();
        this.objects.splice(i, 1);
      }
    }

    this.updateLinks(core);
    this.updateBursts(dt);

    const [cx, cy] = this.center;
    setAttrs(this.guide, {
      cx,
      cy,
      rx: this.rx,
      ry: this.ry,
      transform: `rotate(${((this.tilt * 180) / Math.PI).toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})`,
      opacity: this.showGuide ? 0.5 : 0,
    });
  }

  private behaviorOf(o: ThoughtObject): Behavior {
    if (!o.isClone && this.behaviorOverride) return this.behaviorOverride;
    return o.spec.behavior ?? 'orbit';
  }

  /** Behaviour time within its cycle, honouring loop: false. */
  private cycle(o: ThoughtObject, b: Behavior): { u: number; n: number } {
    const P = PERIOD[b] ?? 4;
    const loop = o.spec.loop ?? true;
    const tt = loop ? o.bAge : Math.min(o.bAge, P * 0.999);
    return { u: fract(tt / P), n: Math.floor(tt / P) };
  }

  private once(o: ThoughtObject, n: number): boolean {
    if (o.lastCycle === n) return false;
    o.lastCycle = n;
    return true;
  }

  private place(o: ThoughtObject, b: Behavior, head: Pt, core: Pt, dt: number): Placement {
    const base = this.orbitPos(o, o.angle);
    switch (b) {
      case 'orbit':
      case 'connect':
        return base;

      case 'bounce': {
        const k = Math.abs(Math.sin(o.age * 4.5 + o.seed * 6));
        return { ...base, y: base.y - k * 16, s: 1 + (k - 0.5) * 0.12 };
      }

      case 'float': {
        const [cx, cy] = this.center;
        const d = fbm(o.age * 0.2 + o.seed, o.seed + 8);
        return {
          x: cx + fbm(o.age * 0.18, o.seed) * this.rx * 0.95,
          y: cy + 8 + fbm(o.age * 0.15, o.seed + 4) * 45,
          depth: d >= 0 ? Math.max(d, 0.2) : Math.min(d, -0.2),
          s: 1,
          op: 1,
        };
      }

      case 'swarm': {
        o.lane = lerp(o.lane, 0.72 + noise1(o.age * 3, o.seed) * 0.12, Math.min(1, dt * 4));
        const p = this.orbitPos(o, o.angle);
        return { ...p, y: p.y + noise1(o.age * 9, o.seed + 2) * 4, s: 0.85 };
      }

      case 'appear': {
        const { u } = this.cycle(o, b);
        const loop = o.spec.loop ?? true;
        const P = PERIOD.appear!;
        const tt = u * P;
        let s = tt < 0.55 ? easeOutBack(tt / 0.55) : 1;
        if (loop && tt > P - 0.4) s *= 1 - (tt - (P - 0.4)) / 0.4;
        return { ...base, s };
      }

      case 'disappear': {
        const { u, n } = this.cycle(o, b);
        const tt = u * PERIOD.disappear!;
        if (tt < 0.35) return { ...base, s: easeOutBack(tt / 0.35) };
        if (tt < 2.2) return base;
        if (tt < 2.7) {
          if (this.once(o, n)) this.burst(base.x, base.y, '#B9B2D9');
          const k = (tt - 2.2) / 0.5;
          return { ...base, s: 1 + 0.35 * k, op: 1 - k };
        }
        return { ...base, op: 0 };
      }

      case 'collide':
        return this.collide(o, head);

      case 'multiply':
        this.multiply(o);
        return base;

      case 'transform': {
        const { u } = this.cycle(o, b);
        const into = o.spec.into ?? DEFAULT_INTO[o.baseType] ?? 'idea';
        const want = u < 0.5 ? o.baseType : into;
        if (o.type !== want) {
          o.setType(want);
          this.burst(base.x, base.y, ACCENT.sun);
        }
        const dip = Math.max(bump((u - 0.42) / 0.16), bump((u - 0.92) / 0.16), bump((u + 0.08) / 0.16));
        return { ...base, s: 1 - 0.85 * dip };
      }

      case 'enter': {
        const { u, n } = this.cycle(o, b);
        if (u < 0.15) return { ...base, s: easeOutBack(u / 0.15) };
        const k = clamp((u - 0.15) / 0.55);
        if (k < 1) {
          const sp = this.orbitPos(o, o.angle + k * 2.5);
          const e = easeInCubic(k);
          return {
            x: lerp(sp.x, core[0], e),
            y: lerp(sp.y, core[1], e),
            depth: 1,
            s: lerp(1, 0.25, k),
            op: 1 - smoothstep(0.8, 1, k),
          };
        }
        if (this.once(o, n)) this.host.emit('absorb', 1);
        return { x: core[0], y: core[1], depth: 1, s: 0, op: 0 };
      }

      case 'leave': {
        const { u, n } = this.cycle(o, b);
        const side = hash1(o.seed * 4.4) > 0.5 ? 1 : -1;
        if (u < 0.02 && this.once(o, n)) this.host.emit('release', 0.6);
        const out: Pt = [head[0] + side * 34, head[1] - 72];
        if (u < 0.25) {
          const k = easeOutCubic(u / 0.25);
          return { x: lerp(core[0], out[0], k), y: lerp(core[1], out[1], k), depth: 1, s: lerp(0.3, 1, k), op: 1 };
        }
        const k = (u - 0.25) / 0.75;
        return {
          x: out[0] + side * k * 230 + Math.sin(k * 6 + o.seed) * 8,
          y: out[1] - k * 170,
          depth: 1,
          s: 1 - k * 0.3,
          op: 1 - smoothstep(0.55, 1, k),
        };
      }
    }
    return base;
  }

  private collide(o: ThoughtObject, head: Pt): Placement {
    const P = PERIOD.collide!;
    const mate = o.partner;
    if (mate) {
      // Both objects share the leader's clock so they meet exactly.
      const leader = o.pairSide < 0 ? o : mate;
      const tt = leader.bAge;
      const u = fract(tt / P);
      const n = Math.floor(tt / P);
      const meet = Math.PI / 2 + leader.pairIndex * 0.9;
      let spread: number;
      if (u < 0.45) spread = lerp(1.5, 0.13, easeInCubic(u / 0.45));
      else if (u < 0.55) spread = 0.13;
      else spread = lerp(0.13, 1.5, easeOutCubic((u - 0.55) / 0.45));
      o.angle = meet + o.pairSide * spread;
      const p = this.orbitPos(o, o.angle);
      if (u >= 0.45 && o === leader && this.once(o, n)) {
        const q = this.orbitPos(mate, meet - o.pairSide * 0.13);
        this.burst((p.x + q.x) / 2, (p.y + q.y) / 2, ACCENT.coral);
      }
      return { ...p, s: 1 - bump((u - 0.42) / 0.16) * 0.28 };
    }
    // Lone collider: fly into the top of the head, bonk, bounce back.
    const u = fract(o.bAge / 3);
    const n = Math.floor(o.bAge / 3);
    const orbitP = this.orbitPos(o, o.angle);
    const target: Pt = [head[0] + 6, head[1] - 52];
    if (u < 0.35) return orbitP;
    if (u < 0.5) {
      const k = easeInCubic((u - 0.35) / 0.15);
      return { x: lerp(orbitP.x, target[0], k), y: lerp(orbitP.y, target[1], k), depth: 1, s: 1, op: 1 };
    }
    if (this.once(o, n)) {
      this.host.emit('bonk', 1);
      this.burst(target[0], target[1] + 4, ACCENT.coral);
    }
    const k = clamp((u - 0.5) / 0.3);
    return {
      x: lerp(target[0], orbitP.x, easeOutCubic(k)),
      y: lerp(target[1], orbitP.y, easeOutCubic(k)) - Math.sin(Math.PI * k) * 40,
      depth: 1,
      s: 1 - bump(k / 0.2) * 0.25,
      op: 1,
    };
  }

  private multiply(o: ThoughtObject): void {
    if (o.isClone || o.dying) return;
    const { u, n } = this.cycle(o, 'multiply');
    const P = PERIOD.multiply!;
    if (n !== o.lastCycle) {
      o.lastCycle = n;
      for (const c of o.children) c.kill();
      o.children = [];
      o.nextSpawn = 0.6;
    }
    const tt = u * P;
    const max = o.spec.count ?? 5;
    if (tt >= o.nextSpawn && o.children.length < max && tt < P - 1) {
      o.nextSpawn += 0.7;
      const spec: OrbitItemSpec = { ...o.spec, behavior: 'orbit' };
      const c = this.spawn(spec, 'clone', 0, 1, true);
      c.angle = o.angle - 0.1;
      c.lane = o.lane + (hash1(c.seed) - 0.5) * 0.3;
      c.laneY = o.laneY + (hash1(c.seed * 2) - 0.5) * 22;
      c.speed = o.speed * (0.8 + hash1(c.seed * 3) * 0.5);
      o.children.push(c);
    }
  }

  private updateLinks(core: Pt): void {
    const nodes = this.objects.filter((o) => !o.dying && this.behaviorOf(o) === 'connect');
    const pairs: Array<[Placement, Placement]> = [];
    const asP = (o: ThoughtObject): Placement => ({ x: o.x, y: o.y, depth: o.depth, s: 1, op: o.birth });
    if (nodes.length === 1) pairs.push([asP(nodes[0]), { x: core[0], y: core[1], depth: 1, s: 1, op: 1 }]);
    for (let i = 0; i < nodes.length - 1; i++) pairs.push([asP(nodes[i]), asP(nodes[i + 1])]);
    if (nodes.length >= 3) pairs.push([asP(nodes[nodes.length - 1]), asP(nodes[0])]);

    while (this.linkPool.length < pairs.length) {
      this.linkPool.push(
        svg('path', { class: 'orbit-link', fill: 'none', stroke: '#9C8CFF', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-dasharray': '1 5' }),
      );
    }
    this.linkPool.forEach((l, i) => {
      const pair = pairs[i];
      if (!pair) {
        l.remove();
        return;
      }
      const [a, b] = pair;
      const layer = a.depth >= 0 && b.depth >= 0 ? this.frontLinks : this.backLinks;
      if (l.parentNode !== layer) layer.appendChild(l);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 + 10;
      const pulse = 0.45 + 0.35 * Math.sin(this.t * 3 + i);
      setAttrs(l, {
        d: `M${a.x.toFixed(1)},${a.y.toFixed(1)}Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
        opacity: pulse * Math.min(a.op, b.op),
        'stroke-dashoffset': (-this.t * 14).toFixed(1),
      });
    });
  }

  /** A small radial pop of lines — collisions, transformations, puffs. */
  burst(x: number, y: number, color: string): void {
    const el = svg('g', { transform: tf(x, y) }, this.front);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      svg('line', { x1: Math.cos(a) * 6, y1: Math.sin(a) * 6, x2: Math.cos(a) * 12, y2: Math.sin(a) * 12, stroke: color, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, el);
    }
    this.bursts.push({ el, x, y, age: 0 });
  }

  private updateBursts(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const k = b.age / 0.45;
      if (k >= 1) {
        b.el.remove();
        this.bursts.splice(i, 1);
        continue;
      }
      b.el.setAttribute('transform', tf(b.x, b.y, 0, 0.6 + easeOutCubic(k) * 1.1));
      b.el.setAttribute('opacity', (1 - k).toFixed(2));
    }
  }

  clear(): void {
    for (const o of this.objects) o.el.remove();
    this.objects.length = 0;
    this.roots = [];
  }
}
