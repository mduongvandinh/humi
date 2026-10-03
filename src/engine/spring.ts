// Damped springs drive every state change in the universe. A spring never
// "jumps" — it chases its target, which is what gives HUMI its soft, slightly
// late, slightly overshooting motion. Integration uses fixed sub-steps so the
// result depends only on the sequence of dt values (deterministic).

export interface SpringCfg {
  /** Stiffness. Higher = snappier. */
  k: number;
  /** Damping ratio. 1 = no overshoot, < 1 = playful overshoot. */
  zeta: number;
}

const SUBSTEP = 1 / 240;

function integrate(
  value: number,
  vel: number,
  target: number,
  cfg: SpringCfg,
  h: number,
): [number, number] {
  const c = 2 * cfg.zeta * Math.sqrt(cfg.k);
  const a = cfg.k * (target - value) - c * vel;
  const v = vel + a * h;
  return [value + v * h, v];
}

function forEachSubstep(dt: number, fn: (h: number) => void): void {
  let rem = dt;
  while (rem > 1e-9) {
    const h = rem < SUBSTEP ? rem : SUBSTEP;
    rem -= h;
    fn(h);
  }
}

export class Spring {
  value: number;
  vel = 0;
  target: number;
  constructor(
    initial: number,
    public cfg: SpringCfg,
  ) {
    this.value = initial;
    this.target = initial;
  }
  step(dt: number, target = this.target): number {
    this.target = target;
    forEachSubstep(dt, (h) => {
      [this.value, this.vel] = integrate(this.value, this.vel, this.target, this.cfg, h);
    });
    return this.value;
  }
  snap(v = this.target): void {
    this.value = v;
    this.target = v;
    this.vel = 0;
  }
}

export class Spring2D {
  x: Spring;
  y: Spring;
  constructor(x: number, y: number, cfg: SpringCfg) {
    this.x = new Spring(x, cfg);
    this.y = new Spring(y, cfg);
  }
  step(tx: number, ty: number, dt: number): [number, number] {
    return [this.x.step(dt, tx), this.y.step(dt, ty)];
  }
  snap(x: number, y: number): void {
    this.x.snap(x);
    this.y.snap(y);
  }
  kick(vx: number, vy: number): void {
    this.x.vel += vx;
    this.y.vel += vy;
  }
}

/** A bag of named springs sharing one step() call. */
export class SpringBank<K extends string> {
  value: Record<K, number>;
  target: Record<K, number>;
  private vel: Record<K, number>;
  private readonly keys: K[];
  private readonly cfg: Record<K, SpringCfg>;

  constructor(initial: Record<K, number>, cfgFor: (key: K) => SpringCfg) {
    this.keys = Object.keys(initial) as K[];
    this.value = { ...initial };
    this.target = { ...initial };
    this.vel = {} as Record<K, number>;
    this.cfg = {} as Record<K, SpringCfg>;
    for (const k of this.keys) {
      this.vel[k] = 0;
      this.cfg[k] = cfgFor(k);
    }
  }

  setTarget(patch: Partial<Record<K, number>>): void {
    for (const k in patch) {
      const v = patch[k];
      if (v !== undefined && k in this.target) this.target[k] = v;
    }
  }

  kick(key: K, velocity: number): void {
    this.vel[key] += velocity;
  }

  snap(): void {
    for (const k of this.keys) {
      this.value[k] = this.target[k];
      this.vel[k] = 0;
    }
  }

  step(dt: number): void {
    if (dt <= 0) return;
    forEachSubstep(dt, (h) => {
      for (const k of this.keys) {
        [this.value[k], this.vel[k]] = integrate(this.value[k], this.vel[k], this.target[k], this.cfg[k], h);
      }
    });
  }
}
