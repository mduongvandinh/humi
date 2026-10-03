// HUMI is fully described by one flat vector of numbers. Expressions, poses
// and actions are just partial vectors; transitions are springs chasing the
// merged target. Adding a new feeling never needs new rendering code — only
// a new row of numbers.

import type { SpringCfg } from '../engine/spring';

export const PARAM_DEFAULTS = {
  // Eyes — the main emotional instrument
  eyeSpacing: 15, // half distance between eyes
  eyeScale: 1,
  eyeScaleY: 1,
  eyeY: 2,
  eyeOpen: 1, // 0 closed
  eyeSmile: 0, // 0 dot … 1 happy crescent
  eyeLid: 0, // flattens the top (tired, sad, angry)
  eyeTilt: 0, // + inner corners down (anger), − inner corners up (worry, sadness)
  eyeSparkle: 0.7,
  eyeAsym: 0, // − left eye bigger, + right eye bigger (doubt, confusion)
  lookX: 0,
  lookY: 0,
  // Mouth — a single soft line
  mouthWidth: 6.5,
  mouthCurve: 0.3, // −1 frown … 1 smile
  mouthOpen: 0,
  mouthY: 16,
  mouthSkew: 0,
  blush: 0.25,
  // Head
  headTilt: 0,
  headSink: 0, // + pulls the head down into the body (shy, afraid)
  // Body
  squash: 1, // expression squash (volume-preserving)
  stretch: 0, // pose stretch, multiplies squash
  lean: 0,
  bodyDrop: 0, // crouch / sit
  slump: 0,
  puff: 0, // chest out (pride, ego)
  // Arms (L = screen left). Angle from straight down, + = outward/up.
  armLAngle: 0.32,
  armLReach: 1,
  armLBend: 0.5,
  armLFront: 0,
  armRAngle: 0.32,
  armRReach: 1,
  armRBend: 0.5,
  armRFront: 0,
  // Legs
  legLAngle: 0.1,
  legRAngle: 0.1,
  legLLift: 0,
  legRLift: 0,
  legSpread: 0,
  // Life
  breathRate: 0.28, // Hz
  breathDepth: 1,
  energy: 1, // idle motion amplitude
  tremble: 0,
  bounce: 0,
  // Root motion (world px, relative to home position)
  rootX: 0,
  rootY: 0,
};

export type ParamKey = keyof typeof PARAM_DEFAULTS;
export type HumiParams = Record<ParamKey, number>;
export type ParamPatch = Partial<HumiParams>;

export const PARAM_KEYS = Object.keys(PARAM_DEFAULTS) as ParamKey[];

/** Useful range of each parameter (playground sliders, validation, docs). */
export const PARAM_RANGES: Record<ParamKey, [number, number]> = {
  eyeSpacing: [8, 24],
  eyeScale: [0.5, 1.8],
  eyeScaleY: [0.5, 1.6],
  eyeY: [-8, 10],
  eyeOpen: [0, 1],
  eyeSmile: [0, 1],
  eyeLid: [0, 1],
  eyeTilt: [-0.7, 0.7],
  eyeSparkle: [0, 1],
  eyeAsym: [-1, 1],
  lookX: [-1, 1],
  lookY: [-1, 1],
  mouthWidth: [2, 14],
  mouthCurve: [-1, 1],
  mouthOpen: [0, 1],
  mouthY: [10, 24],
  mouthSkew: [-1, 1],
  blush: [0, 1],
  headTilt: [-0.5, 0.5],
  headSink: [-12, 14],
  squash: [0.7, 1.3],
  stretch: [-0.3, 0.3],
  lean: [-0.4, 0.4],
  bodyDrop: [0, 30],
  slump: [0, 1],
  puff: [0, 1],
  armLAngle: [-3.1, 3.1],
  armLReach: [0.4, 1.3],
  armLBend: [-1.2, 1.2],
  armLFront: [0, 1],
  armRAngle: [-3.1, 3.1],
  armRReach: [0.4, 1.3],
  armRBend: [-1.2, 1.2],
  armRFront: [0, 1],
  legLAngle: [-0.6, 1.6],
  legRAngle: [-0.6, 1.6],
  legLLift: [0, 20],
  legRLift: [0, 20],
  legSpread: [-6, 12],
  breathRate: [0.05, 1.2],
  breathDepth: [0, 3],
  energy: [0, 2],
  tremble: [0, 1],
  bounce: [0, 1],
  rootX: [-600, 600],
  rootY: [-200, 50],
};

// Different body parts settle at different speeds: the face reacts first,
// the body follows, the noodle arms arrive last with a little overshoot.
// That staggering *is* the follow-through animators draw by hand.
const FACE: SpringCfg = { k: 260, zeta: 0.8 };
const LOOK: SpringCfg = { k: 170, zeta: 0.85 };
const HEAD: SpringCfg = { k: 110, zeta: 0.55 };
const BODY: SpringCfg = { k: 140, zeta: 0.5 };
const ARMS: SpringCfg = { k: 70, zeta: 0.48 };
const LEGS: SpringCfg = { k: 160, zeta: 0.7 };
const LIFE: SpringCfg = { k: 30, zeta: 1 };
const ROOT: SpringCfg = { k: 18, zeta: 1 };

export function springFor(key: ParamKey): SpringCfg {
  if (key.startsWith('look')) return LOOK;
  if (key.startsWith('eye') || key.startsWith('mouth') || key === 'blush') return FACE;
  if (key.startsWith('head')) return HEAD;
  if (key.startsWith('arm')) return ARMS;
  if (key.startsWith('leg')) return LEGS;
  if (key.startsWith('root')) return ROOT;
  if (key === 'breathRate' || key === 'breathDepth' || key === 'energy' || key === 'tremble' || key === 'bounce')
    return LIFE;
  return BODY;
}

export function isParamKey(k: string): k is ParamKey {
  return k in PARAM_DEFAULTS;
}
