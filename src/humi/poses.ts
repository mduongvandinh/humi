// Poses own the limbs and the body's placement. A pose may also define a
// `cycle`: additive offsets as a function of time (walking, waving...).
// Cycles cross-fade when the pose changes, so nothing ever pops.

import { bump, clamp, easeInOutSine, fract, TAU } from '../engine/math';
import type { HumiParams, ParamPatch } from './params';

export interface PoseDef {
  label: string;
  params: ParamPatch;
  cycle?: (t: number, p: HumiParams) => ParamPatch;
}

const walkCycle = (t: number): ParamPatch => {
  const w = t * TAU * 1.1;
  const s = Math.sin(w);
  return {
    legLLift: Math.max(0, s) * 9,
    legRLift: Math.max(0, -s) * 9,
    armLAngle: s * 0.32,
    armRAngle: -s * 0.32,
    rootY: -Math.abs(Math.cos(w)) * 4,
    lean: s * 0.04,
    squash: Math.abs(Math.cos(w)) * 0.025,
  };
};

const jumpCycle = (t: number): ParamPatch => {
  const u = fract(t / 1.25);
  const out: ParamPatch = {};
  // anticipation
  const crouch = u < 0.2 ? easeInOutSine(u / 0.2) : u < 0.26 ? 1 - (u - 0.2) / 0.06 : 0;
  out.squash = -0.16 * crouch;
  out.bodyDrop = 7 * crouch;
  out.armLAngle = -0.25 * crouch;
  out.armRAngle = -0.25 * crouch;
  // flight
  if (u >= 0.24 && u < 0.78) {
    const a = (u - 0.24) / 0.54;
    out.rootY = -4 * a * (1 - a) * 78;
    out.stretch = 0.12 * Math.abs(1 - 2 * a);
    const up = Math.sin(Math.PI * a);
    out.armLAngle = 1.9 * up;
    out.armRAngle = 1.9 * up;
    out.legLLift = 7 * up;
    out.legRLift = 7 * up;
  }
  // landing
  const land = bump((u - 0.78) / 0.18);
  if (land > 0) {
    out.squash = -0.15 * land;
    out.bodyDrop = 5 * land;
  }
  return out;
};

export const POSES: Record<string, PoseDef> = {
  standing: { label: 'Standing', params: {} },
  waving: {
    label: 'Waving',
    params: { armRAngle: 2.2, armRReach: 0.95, armRBend: -0.35, lean: 0.03 },
    cycle: (t) => ({
      armRAngle: Math.sin(t * TAU * 1.6) * 0.32,
      armRBend: Math.sin(t * TAU * 1.6 - 1) * 0.35,
    }),
  },
  thinking: {
    label: 'Thinking (hand to chin)',
    params: {
      armRAngle: -2.45, armRReach: 0.72, armRBend: 0.35, armRFront: 1,
      armLAngle: -1.15, armLReach: 0.62, armLBend: 0.3, armLFront: 1,
    },
    cycle: (t) => ({ armRBend: Math.sin(t * TAU * 0.4) * 0.1 }),
  },
  arms_up: {
    label: 'Arms up',
    params: { armLAngle: 2.35, armRAngle: 2.35, armLReach: 1.08, armRReach: 1.08, armLBend: 0.15, armRBend: 0.15, stretch: 0.05 },
    cycle: (t) => ({ armLAngle: Math.sin(t * 6) * 0.12, armRAngle: Math.sin(t * 6 + 1.3) * 0.12 }),
  },
  hug_self: {
    label: 'Hugging self',
    params: {
      armLAngle: -1.5, armRAngle: -1.5, armLReach: 0.68, armRReach: 0.68,
      armLBend: 0.35, armRBend: 0.35, armLFront: 1, armRFront: 1, stretch: -0.03,
    },
  },
  hands_on_core: {
    label: 'Hands on Core',
    params: {
      armLAngle: -1.05, armRAngle: -1.05, armLReach: 0.62, armRReach: 0.62,
      armLBend: 0.3, armRBend: 0.3, armLFront: 1, armRFront: 1,
    },
  },
  pointing: {
    label: 'Pointing',
    params: { armRAngle: 1.65, armRReach: 1.12, armRBend: 0.05, lean: 0.04 },
  },
  presenting: {
    label: 'Presenting',
    params: { armRAngle: 1.25, armRReach: 0.95, armRBend: -0.6, lean: 0.03 },
    cycle: (t) => ({ armRAngle: Math.sin(t * TAU * 0.5) * 0.06 }),
  },
  reaching: {
    label: 'Reaching',
    params: {
      armRAngle: 2.3, armRReach: 1.18, armRBend: 0.1,
      armLAngle: 2.0, armLReach: 1.05, armLBend: 0.2, lean: 0.06, stretch: 0.07,
    },
    cycle: (t) => ({ armRAngle: Math.sin(t * TAU * 0.7) * 0.08, stretch: Math.sin(t * TAU * 0.7) * 0.02 }),
  },
  shrug: {
    label: 'Shrug',
    params: {
      armLAngle: 1.3, armRAngle: 1.3, armLReach: 0.75, armRReach: 0.75,
      armLBend: -0.9, armRBend: -0.9,
    },
    cycle: (t) => {
      const b = bump(fract(t / 2.4) / 0.35);
      return { headSink: 5 * b, armLAngle: 0.25 * b, armRAngle: 0.25 * b };
    },
  },
  slumped: {
    label: 'Slumped',
    params: { armLAngle: 0.08, armRAngle: 0.08, armLReach: 1.06, armRReach: 1.06, armLBend: 0.15, armRBend: 0.15, bodyDrop: 3 },
  },
  sitting: {
    label: 'Sitting',
    params: {
      bodyDrop: 19, legLAngle: 1.35, legRAngle: 1.35, legSpread: 2,
      armLAngle: 0.55, armRAngle: 0.55, armLReach: 0.8, armRReach: 0.8,
    },
  },
  meditating: {
    label: 'Meditating',
    params: {
      bodyDrop: 19, legLAngle: 1.5, legRAngle: 1.5, legSpread: 4,
      armLAngle: 0.95, armRAngle: 0.95, armLReach: 0.72, armRReach: 0.72, armLBend: -0.5, armRBend: -0.5,
    },
    cycle: (t) => ({ rootY: -(Math.sin(t * 0.7) + 1) * 5 }),
  },
  hiding_eyes: {
    label: 'Hiding eyes',
    params: {
      armLAngle: -2.72, armRAngle: -2.72, armLReach: 1.02, armRReach: 1.02,
      armLBend: 0.3, armRBend: 0.3, armLFront: 1, armRFront: 1, stretch: -0.04, headSink: 4,
    },
  },
  walking: { label: 'Walking', params: { armLBend: 0.35, armRBend: 0.35 }, cycle: walkCycle },
  jumping: { label: 'Jumping', params: {}, cycle: jumpCycle },
  dancing: {
    label: 'Dancing',
    params: { armLAngle: 1.4, armRAngle: 1.4, armLBend: -0.3, armRBend: -0.3 },
    cycle: (t) => {
      const w = t * TAU * 0.9;
      return {
        armLAngle: Math.sin(w) * 0.9,
        armRAngle: -Math.sin(w) * 0.9,
        lean: Math.sin(w) * 0.09,
        rootY: -Math.abs(Math.sin(w * 2)) * 7,
        legLLift: clamp(Math.sin(w)) * 6,
        legRLift: clamp(-Math.sin(w)) * 6,
        headTilt: Math.sin(w + 0.6) * 0.08,
      };
    },
  },
};

export const POSE_NAMES = Object.keys(POSES);
