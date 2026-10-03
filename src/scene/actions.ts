// Actions are small reusable behaviours ("follow_light", "let_go"...). Each
// frame an action returns an ActionOutput that temporarily overrides pose,
// expression, params, gaze, position or Core — it never owns rendering.

import { clamp, fract, rng, type Pt } from '../engine/math';
import type { ActionOutput, HumiCharacter } from '../humi/HumiCharacter';
import type { ParamPatch } from '../humi/params';
import type { Scene } from './Scene';

export interface ActionCtx {
  scene: Scene;
  char: HumiCharacter;
  dt: number;
  /** Seconds since this action started. */
  t: number;
}

export interface ActionRuntime {
  update(ctx: ActionCtx): ActionOutput | void;
  stop?(ctx: { scene: Scene; char: HumiCharacter }): void;
}

export interface ActionDef {
  label: string;
  description: string;
  create(char: HumiCharacter): ActionRuntime;
}

const WALK_SPEED = 95;

const toward = (cur: number, goal: number, step: number): number =>
  Math.abs(goal - cur) <= step ? goal : cur + Math.sign(goal - cur) * step;

/** A walker that moves at a constant speed and reports whether it moved. */
function walker(start: number) {
  let x = start;
  return {
    get x() {
      return x;
    },
    step(goal: number, dt: number): boolean {
      const nx = toward(x, goal, WALK_SPEED * dt);
      const moved = Math.abs(nx - x) > 1e-6;
      x = nx;
      return moved;
    },
  };
}

export const ACTIONS: Record<string, ActionDef> = {
  none: { label: 'None', description: 'Just be.', create: () => ({ update: () => ({}) }) },

  follow_light: {
    label: 'Follow the light',
    description: 'A light drifts by; HUMI looks, walks after it and reaches. The Core brightens as it gets close.',
    create(char) {
      const w = walker(char.worldX);
      let goal = char.worldX;
      return {
        update({ scene, char, t, dt }) {
          const lx = char.homeX + Math.sin(t * 0.33) * 300 + Math.sin(t * 0.81 + 1) * 70;
          const ly = scene.groundY - 290 + Math.sin(t * 0.52) * 80 + Math.sin(t * 1.3) * 18;
          scene.light.claim(lx, ly);
          const head = char.anchor('head');
          const dist = Math.hypot(lx - head[0], ly - head[1]);
          const near = clamp(1 - (dist - 110) / 260);
          if (Math.abs(lx - w.x) > 120) goal = clamp(lx - Math.sign(lx - w.x) * 70, 140, scene.W - 140);
          const moving = w.step(goal, dt);
          const side = lx >= w.x ? 1 : -1;
          const params: ParamPatch = {};
          if (!moving) {
            const S = char.anchor(side > 0 ? 'shoulderR' : 'shoulderL');
            const ang = Math.atan2(side * (lx - S[0]), ly - S[1]);
            if (side > 0) Object.assign(params, { armRAngle: ang, armRReach: 1.15, armRBend: 0.1 });
            else Object.assign(params, { armLAngle: ang, armLReach: 1.15, armLBend: 0.1 });
            params.lean = side * 0.06;
            params.stretch = 0.04 + near * 0.05;
          }
          return {
            pose: moving ? 'walking' : 'standing',
            expression: near > 0.45 ? 'happy' : 'curious',
            moveTo: w.x,
            lookAt: [lx, ly],
            params,
            core: { brightness: near * 0.4, glow: near * 0.8, size: near * 0.15 },
          };
        },
      };
    },
  },

  wander: {
    label: 'Wander',
    description: 'Strolls to random spots, pauses, looks around.',
    create(char) {
      const w = walker(char.worldX);
      const r = rng(char.seed * 7 + 3);
      let goal: number | null = null;
      let wait = 1;
      return {
        update({ scene, char, dt }) {
          if (goal === null) {
            wait -= dt;
            if (wait <= 0) goal = clamp(char.homeX + (r() * 2 - 1) * 320, 140, scene.W - 140);
          }
          const moving = goal !== null && w.step(goal, dt);
          if (goal !== null && !moving) {
            goal = null;
            wait = 1.5 + r() * 3;
          }
          const dir = goal !== null ? Math.sign(goal - w.x) : 0;
          return { pose: moving ? 'walking' : undefined, moveTo: w.x, params: moving ? { lookX: dir * 0.6 } : {} };
        },
      };
    },
  },

  walk_across: {
    label: 'Walk across',
    description: 'Walks from one side of the stage to the other and back.',
    create(char) {
      const w = walker(char.worldX);
      let dir = 1;
      let pause = 0;
      return {
        update({ char, dt }) {
          const goal = char.homeX + dir * 360;
          if (pause > 0) {
            pause -= dt;
            return { moveTo: w.x, params: { lookX: -dir * 0.5 } };
          }
          if (!w.step(goal, dt)) {
            dir = -dir;
            pause = 1.2;
          }
          return { pose: 'walking', moveTo: w.x, params: { lookX: dir * 0.6 } };
        },
      };
    },
  },

  jump_for_joy: {
    label: 'Jump for joy',
    description: 'Little celebratory jumps with a glowing Core.',
    create: () => ({
      update: () => ({ pose: 'jumping', expression: 'joyful', params: { bounce: 0 }, core: { brightness: 0.3, glow: 0.5 } }),
    }),
  },

  dance: {
    label: 'Dance',
    description: 'A happy, wobbly dance.',
    create: () => ({ update: () => ({ pose: 'dancing', expression: 'joyful', params: { bounce: 0 } }) }),
  },

  think: {
    label: 'Think',
    description: 'Hand to chin; thoughts orbit faster.',
    create: () => ({
      update({ char }) {
        char.orbit.speedMul = 1.7;
        return { pose: 'thinking', expression: 'thinking' };
      },
      stop({ char }) {
        char.orbit.speedMul = 1;
      },
    }),
  },

  get_idea: {
    label: 'Get an idea',
    description: 'Thinks… questions become ideas, the Core flashes, HUMI celebrates. Loops every 7 s.',
    create() {
      let phase = -1;
      return {
        update({ char, t }) {
          const u = fract(t / 7) * 7;
          if (u < 3) {
            if (phase !== 0) {
              char.orbit.restoreTypes();
              phase = 0;
            }
            char.orbit.speedMul = 1.8;
            return { pose: 'thinking', expression: 'thinking' };
          }
          if (phase !== 1) {
            phase = 1;
            char.orbit.morphAll('question', 'idea');
            char.orbit.morphAll('doubt', 'idea');
            char.core.flash(1.2);
          }
          char.orbit.speedMul = 1;
          if (u < 3.7) return { pose: 'standing', expression: 'surprised', core: { brightness: 0.4 } };
          return { pose: 'arms_up', expression: 'joyful', params: { bounce: 0.3 }, core: { brightness: 0.35, glow: 0.6 } };
        },
        stop({ char }) {
          char.orbit.restoreTypes();
          char.orbit.speedMul = 1;
        },
      };
    },
  },

  let_go: {
    label: 'Let go',
    description: 'Thoughts rise out of the Core and drift away. Relief.',
    create: () => ({
      update({ char }) {
        char.orbit.behaviorOverride = 'leave';
        return {
          expression: 'calm',
          params: { armLAngle: 0.75, armRAngle: 0.75, armLBend: -0.4, armRBend: -0.4 },
          core: { brightness: 0.2, glow: 0.2 },
        };
      },
      stop({ char }) {
        char.orbit.behaviorOverride = null;
      },
    }),
  },

  absorb: {
    label: 'Absorb',
    description: 'Thoughts spiral into the Core; each arrival makes it flash.',
    create: () => ({
      update({ char }) {
        char.orbit.behaviorOverride = 'enter';
        return { pose: 'hands_on_core', expression: 'calm' };
      },
      stop({ char }) {
        char.orbit.behaviorOverride = null;
      },
    }),
  },

  breathe: {
    label: 'Breathe deeply',
    description: 'Meditation. Slow deep breaths; the Core glows with each inhale.',
    create: () => ({
      update({ char }) {
        const b = (char.breath + 1) / 2;
        return {
          pose: 'meditating',
          expression: 'calm',
          params: { eyeOpen: 0.08, eyeSmile: 0.6, breathRate: 0.1, breathDepth: 2.6 },
          core: { glow: b * 0.5, brightness: b * 0.2 },
        };
      },
    }),
  },

  shiver: {
    label: 'Shiver',
    description: 'Cold or scared: hugs itself and trembles.',
    create: () => ({
      update: () => ({ pose: 'hug_self', expression: 'afraid', params: { tremble: 1 }, core: { jitter: 0.5, flicker: 0.3 } }),
    }),
  },

  sigh: {
    label: 'Sigh',
    description: 'A big inhale, then everything lets down.',
    create: () => ({
      update({ t }) {
        const u = fract(t / 5) * 5;
        if (u < 1.8) return { params: { stretch: 0.08, headSink: -3, eyeLid: 0.2, breathDepth: 0 } };
        if (u < 3.4) return { expression: 'sad', params: { slump: 0.75, eyeOpen: 0.12, eyeSmile: 0.2, stretch: -0.06, mouthOpen: 0.25, breathDepth: 0 } };
        return { expression: 'calm' };
      },
    }),
  },

  wave_hello: {
    label: 'Wave hello',
    description: 'Waves at the viewer.',
    create: () => ({ update: () => ({ pose: 'waving', expression: 'happy', params: { lookX: 0, lookY: 0.1 } }) }),
  },

  look_around: {
    label: 'Look around',
    description: 'Curiously glances in different directions.',
    create: () => ({
      update({ char, t }) {
        const spots: Pt[] = [[-1, 0], [1, -0.4], [0.2, -1], [-0.8, -0.8], [0, 0.2]];
        const s = spots[Math.floor(t / 1.6) % spots.length];
        const h = char.anchor('head');
        return { expression: 'curious', lookAt: [h[0] + s[0] * 220, h[1] + s[1] * 160] };
      },
    }),
  },

  sync: {
    label: 'Synchronize',
    description: 'Moves toward the nearest other HUMI; both Cores lock to one shared beat.',
    create(char) {
      const w = walker(char.worldX);
      return {
        update({ scene, char, dt }) {
          let other: HumiCharacter | null = null;
          for (const c of scene.characters.values()) {
            if (c !== char && (!other || Math.abs(c.worldX - char.worldX) < Math.abs(other.worldX - char.worldX))) other = c;
          }
          if (!other) return { expression: 'calm', core: { sync: 1 } };
          const side = Math.sign(other.worldX - w.x) || 1;
          const moving = w.step(other.worldX - side * 230, dt);
          return {
            pose: moving ? 'walking' : 'standing',
            expression: 'loving',
            moveTo: w.x,
            lookAt: other.anchor('head'),
            params: moving ? {} : { lean: side * 0.06 },
            core: { sync: 1 },
          };
        },
      };
    },
  },
};

export const ACTION_NAMES = Object.keys(ACTIONS);
