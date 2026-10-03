// Mental creatures are small living representations of human mechanisms.
// None of them is a villain: each has a helpful and a harmful expression,
// and `balance` (−1 harmful … +1 helpful) blends between the two looks.

export interface CreatureLook {
  hue: number;
  sat: number;
  light: number;
  alpha: number;
  size: number;
  spike: number;
  spikeCount: number;
  fuzz: number;
  squashY: number;
  eyeScale: number;
  eyeSpacing: number;
  eyeTilt: number;
  eyeLid: number;
  eyeSmile: number;
  eyeAsym: number;
  mouthCurve: number;
  mouthOpen: number;
  mouthWidth: number;
  motionAmp: number;
  motionSpeed: number;
  aura: number;
}

export type CreatureMotion = 'tremble' | 'pace' | 'tilt' | 'bounce' | 'float' | 'hop' | 'vibrate' | 'inflate';
export type CreatureFeature = 'shiver' | 'spiral' | 'hook' | 'sparkles' | 'inner' | 'confetti' | 'steam' | 'crown';

export interface CreatureDef {
  label: string;
  motion: CreatureMotion;
  feature: CreatureFeature;
  helpful: CreatureLook;
  /** Overrides applied at balance = −1. */
  harmful: Partial<CreatureLook>;
  roles: { helpful: string; harmful: string };
}

const base: CreatureLook = {
  hue: 0, sat: 50, light: 70, alpha: 1, size: 1, spike: 0, spikeCount: 6, fuzz: 0.005, squashY: 1,
  eyeScale: 1, eyeSpacing: 7, eyeTilt: 0, eyeLid: 0, eyeSmile: 0, eyeAsym: 0,
  mouthCurve: 0, mouthOpen: 0, mouthWidth: 3.5, motionAmp: 0.6, motionSpeed: 1, aura: 0,
};

const look = (o: Partial<CreatureLook>): CreatureLook => ({ ...base, ...o });

export const CREATURES: Record<string, CreatureDef> = {
  fear: {
    label: 'Fear',
    motion: 'tremble',
    feature: 'shiver',
    helpful: look({ hue: 245, sat: 38, light: 66, size: 0.95, fuzz: 0.025, squashY: 1.05, eyeScale: 1.25, eyeTilt: -0.2, mouthCurve: -0.2, mouthOpen: 0.2, mouthWidth: 3 }),
    harmful: { light: 30, sat: 40, size: 1.6, fuzz: 0.13, spike: 0.12, eyeScale: 1.55, mouthOpen: 0.5, motionAmp: 1.3, aura: 0.75 },
    roles: {
      helpful: 'Notices real danger and gets you ready to protect yourself.',
      harmful: 'Sounds the alarm when nothing is wrong — and freezes you.',
    },
  },
  worry: {
    label: 'Worry',
    motion: 'pace',
    feature: 'spiral',
    helpful: look({ hue: 210, sat: 28, light: 76, size: 0.9, eyeTilt: -0.35, eyeLid: 0.1, mouthCurve: -0.3 }),
    harmful: { light: 52, sat: 32, size: 1.35, eyeTilt: -0.55, motionAmp: 1.3, motionSpeed: 1.7, aura: 0.45 },
    roles: {
      helpful: 'Thinks ahead so you can prepare for what might happen.',
      harmful: "Loops the same 'what if…' forever, without ever acting.",
    },
  },
  doubt: {
    label: 'Doubt',
    motion: 'tilt',
    feature: 'hook',
    helpful: look({ hue: 272, sat: 24, light: 74, size: 0.9, squashY: 1.15, eyeAsym: 0.5, eyeLid: 0.15, mouthCurve: -0.05, mouthWidth: 3 }),
    harmful: { light: 45, sat: 28, size: 1.35, eyeAsym: 0.9, eyeLid: 0.35, mouthCurve: -0.45, motionAmp: 1.1, aura: 0.45 },
    roles: {
      helpful: "Asks 'are you sure?' and catches mistakes before they happen.",
      harmful: 'Questions everything until you cannot move at all.',
    },
  },
  idea: {
    label: 'Idea',
    motion: 'bounce',
    feature: 'sparkles',
    helpful: look({ hue: 46, sat: 98, light: 64, size: 0.95, spike: 0.28, spikeCount: 5, fuzz: 0, eyeScale: 1.1, eyeSmile: 0.6, mouthCurve: 0.9, mouthOpen: 0.3, mouthWidth: 4, motionAmp: 1, aura: 0.3 }),
    harmful: { hue: 30, light: 58, size: 1.3, spike: 0.45, eyeSmile: 0, eyeScale: 1.35, mouthOpen: 0.6, motionSpeed: 2.2, motionAmp: 1.4, aura: 0.5 },
    roles: {
      helpful: 'Connects things that were never connected before.',
      harmful: 'Too many ideas at once — nothing ever gets finished.',
    },
  },
  memory: {
    label: 'Memory',
    motion: 'float',
    feature: 'inner',
    helpful: look({ hue: 200, sat: 80, light: 80, alpha: 0.8, eyeScale: 0.9, eyeLid: 0.35, eyeSmile: 0.4, mouthCurve: 0.4, mouthWidth: 3, fuzz: 0.01 }),
    harmful: { hue: 215, sat: 30, light: 50, alpha: 0.9, size: 1.4, eyeSmile: 0, eyeLid: 0.5, mouthCurve: -0.3, motionAmp: 0.9, aura: 0.5 },
    roles: {
      helpful: 'Keeps what you have learned and the people you love.',
      harmful: 'Replays old pain as if it were happening right now.',
    },
  },
  joy: {
    label: 'Joy',
    motion: 'hop',
    feature: 'confetti',
    helpful: look({ hue: 22, sat: 95, light: 68, size: 0.95, fuzz: 0, squashY: 0.95, eyeSpacing: 8, eyeSmile: 1, mouthCurve: 1, mouthOpen: 0.6, mouthWidth: 4.5, motionAmp: 1 }),
    harmful: { hue: 330, light: 60, size: 1.3, spike: 0.12, eyeScale: 1.3, eyeSmile: 0.7, motionSpeed: 1.8, motionAmp: 1.4, aura: 0.4 },
    roles: {
      helpful: 'Shows you what matters and pulls you toward it.',
      harmful: 'Chases the next high and ignores the cost.',
    },
  },
  anger: {
    label: 'Anger',
    motion: 'vibrate',
    feature: 'steam',
    helpful: look({ hue: 6, sat: 80, light: 64, size: 0.95, spike: 0.05, squashY: 0.85, eyeScale: 0.95, eyeTilt: 0.4, eyeLid: 0.4, mouthCurve: -0.4, mouthWidth: 4, motionAmp: 0.5 }),
    harmful: { light: 45, sat: 90, size: 1.5, spike: 0.3, spikeCount: 7, fuzz: 0.06, eyeTilt: 0.6, eyeLid: 0.5, mouthCurve: -0.8, mouthOpen: 0.4, motionAmp: 1.4, aura: 0.7 },
    roles: {
      helpful: "Defends your boundaries and says 'this is not fair'.",
      harmful: 'Burns bridges and hurts the people around you.',
    },
  },
  ego: {
    label: 'Ego',
    motion: 'inflate',
    feature: 'crown',
    helpful: look({ hue: 270, sat: 55, light: 72, squashY: 1.2, eyeScale: 0.95, eyeLid: 0.45, eyeSmile: 0.3, mouthCurve: 0.5, mouthWidth: 4, motionAmp: 0.5, fuzz: 0 }),
    harmful: { hue: 285, sat: 70, light: 56, size: 1.75, squashY: 1.3, eyeLid: 0.65, eyeSmile: 0, mouthCurve: 0.2, motionAmp: 1.2, aura: 0.6 },
    roles: {
      helpful: 'Gives you a sense of self that is worth standing up for.',
      harmful: 'Needs to be right, first and admired — always.',
    },
  },
};

export const CREATURE_KINDS = Object.keys(CREATURES);

/** Blend helpful ↔ harmful look for a balance in [−1, 1]. */
export function creatureLook(kind: string, balance: number): CreatureLook {
  const def = CREATURES[kind] ?? CREATURES.fear;
  const u = Math.max(0, Math.min(1, (balance + 1) / 2));
  const out = { ...def.helpful };
  for (const k in def.harmful) {
    const key = k as keyof CreatureLook;
    const harm = def.harmful[key] as number;
    out[key] = harm * (1 - u) + def.helpful[key] * u;
  }
  return out;
}
