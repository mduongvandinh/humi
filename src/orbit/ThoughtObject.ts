import { hash1 } from '../engine/math';
import { DefsBank, svg } from '../engine/svg';
import { createThoughtShape, type ThoughtShape } from './thoughtShapes';

export const BEHAVIORS = [
  'orbit',
  'bounce',
  'float',
  'swarm',
  'appear',
  'disappear',
  'collide',
  'connect',
  'multiply',
  'transform',
  'enter',
  'leave',
] as const;
export type Behavior = (typeof BEHAVIORS)[number];

export interface OrbitItemSpec {
  type: string;
  behavior?: Behavior;
  text?: string;
  /** Target type for `transform`. */
  into?: string;
  color?: string;
  /** Particle flavour: joy, love, sad, anger, calm. */
  emotion?: string;
  /** Max copies for `multiply`. */
  count?: number;
  speed?: number;
  /** Lifecycle behaviours repeat by default; false plays them once. */
  loop?: boolean;
}

export const DEFAULT_INTO: Record<string, string> = {
  question: 'idea',
  idea: 'star',
  fear: 'star',
  doubt: 'idea',
  worry: 'particle',
  word: 'number',
  number: 'shape',
  memory: 'star',
};

/** One thing orbiting HUMI's head. Behaviour logic lives in ThoughtOrbit. */
export class ThoughtObject {
  readonly el: SVGGElement;
  shape!: ThoughtShape;
  type: string;
  readonly baseType: string;
  readonly seed: number;
  angle: number;
  lane: number;
  laneY: number;
  speed: number;

  /** Time alive. */
  age = 0;
  /** Time since the current behaviour started (reset on change). */
  bAge = 0;
  activeBehavior: Behavior | null = null;
  birth = 0;
  dying = false;
  dieT = 0;
  children: ThoughtObject[] = [];
  nextSpawn = 0.6;
  lastCycle = -1;
  partner: ThoughtObject | null = null;
  pairSide = 0;
  pairIndex = 0;

  x = 0;
  y = 0;
  depth = 1;

  constructor(
    readonly spec: OrbitItemSpec,
    readonly key: string,
    index: number,
    total: number,
    seed: number,
    private readonly defs: DefsBank,
    readonly isClone = false,
  ) {
    this.seed = seed;
    this.type = spec.type;
    this.baseType = spec.type;
    this.el = svg('g', { class: 'thought-object' });
    const h1 = hash1(seed * 1.31);
    const h2 = hash1(seed * 2.77);
    const h3 = hash1(seed * 5.13);
    this.angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(total, 1) + (h1 - 0.5) * 0.4;
    this.lane = 0.86 + h2 * 0.28;
    this.laneY = (h3 - 0.5) * 18;
    this.speed = (0.55 + h1 * 0.3) * (spec.speed ?? 1);
    this.setType(spec.type);
  }

  setType(type: string): void {
    this.type = type;
    this.shape?.el.remove();
    this.shape = createThoughtShape(type, {
      defs: this.defs,
      seed: this.seed,
      text: type === this.baseType ? this.spec.text : undefined,
      color: type === this.baseType ? this.spec.color : undefined,
      emotion: this.spec.emotion,
    });
    this.el.appendChild(this.shape.el);
  }

  kill(): void {
    this.dying = true;
    for (const c of this.children) c.kill();
  }
}
