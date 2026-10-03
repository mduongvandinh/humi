import { describe, expect, it } from 'vitest';
import { fbm, noise1, rng } from '../src/engine/math';
import { SpringBank } from '../src/engine/spring';
import { CORE_STATES, coreTarget } from '../src/humi/coreStates';
import { EXPRESSIONS } from '../src/humi/expressions';
import { isParamKey, PARAM_DEFAULTS, PARAM_RANGES, springFor } from '../src/humi/params';
import { POSES } from '../src/humi/poses';
import { CREATURES, creatureLook } from '../src/creatures/creatures';

describe('noise & rng', () => {
  it('noise stays in [-1, 1] and is deterministic', () => {
    for (let i = 0; i < 2000; i++) {
      const x = i * 0.137;
      const v = noise1(x, 3);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      expect(noise1(x, 3)).toBe(v);
      expect(Math.abs(fbm(x, 5))).toBeLessThanOrEqual(1);
    }
  });

  it('rng is reproducible per seed', () => {
    const a = rng(42);
    const b = rng(42);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });
});

describe('springs', () => {
  it('converge on the target', () => {
    const bank = new SpringBank({ a: 0, b: 10 }, () => ({ k: 120, zeta: 0.6 }));
    bank.setTarget({ a: 5, b: -3 });
    for (let i = 0; i < 300; i++) bank.step(1 / 60);
    expect(bank.value.a).toBeCloseTo(5, 3);
    expect(bank.value.b).toBeCloseTo(-3, 3);
  });

  it('depend only on the dt sequence (frame-exact replays)', () => {
    const run = () => {
      const bank = new SpringBank({ ...PARAM_DEFAULTS }, springFor);
      bank.setTarget(EXPRESSIONS.joyful.params);
      for (let i = 0; i < 90; i++) bank.step(1 / 30);
      return bank.value;
    };
    expect(run()).toEqual(run());
  });

  it('a 1/30 step equals two 1/60 steps', () => {
    const a = new SpringBank({ x: 0 }, () => ({ k: 80, zeta: 0.5 }));
    const b = new SpringBank({ x: 0 }, () => ({ k: 80, zeta: 0.5 }));
    a.setTarget({ x: 1 });
    b.setTarget({ x: 1 });
    for (let i = 0; i < 30; i++) a.step(1 / 30);
    for (let i = 0; i < 60; i++) b.step(1 / 60);
    expect(a.value.x).toBeCloseTo(b.value.x, 6);
  });
});

describe('presets', () => {
  it('expressions and poses only use known parameters within range', () => {
    const tables = { ...EXPRESSIONS, ...POSES };
    for (const [name, def] of Object.entries(tables)) {
      for (const [k, v] of Object.entries(def.params)) {
        expect(isParamKey(k), `${name}.${k}`).toBe(true);
        const [lo, hi] = PARAM_RANGES[k as keyof typeof PARAM_RANGES];
        expect(v, `${name}.${k}`).toBeGreaterThanOrEqual(lo);
        expect(v, `${name}.${k}`).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('pose cycles return finite numbers', () => {
    for (const [name, def] of Object.entries(POSES)) {
      if (!def.cycle) continue;
      for (let t = 0; t < 5; t += 0.05) {
        for (const v of Object.values(def.cycle(t, { ...PARAM_DEFAULTS }))) expect(Number.isFinite(v), name).toBe(true);
      }
    }
  });

  it('core intensity scales effects, 0 intensity keeps the light faint', () => {
    for (const name of Object.keys(CORE_STATES)) {
      const lo = coreTarget(name, 0);
      const hi = coreTarget(name, 1);
      expect(lo.brightness).toBeLessThanOrEqual(hi.brightness);
      expect(lo.glow).toBe(0);
      expect(lo.jitter).toBe(0);
    }
  });

  it('creatures blend from harmful (−1) to helpful (+1)', () => {
    for (const [kind, def] of Object.entries(CREATURES)) {
      expect(creatureLook(kind, 1)).toEqual(def.helpful);
      const harm = creatureLook(kind, -1);
      for (const [k, v] of Object.entries(def.harmful)) expect(harm[k as keyof typeof harm]).toBeCloseTo(v as number);
      expect(def.roles.helpful.length).toBeGreaterThan(0);
      expect(def.roles.harmful.length).toBeGreaterThan(0);
    }
  });
});
