// The Human Core: a small light in HUMI's chest showing the person's
// internal state. Like the face, it is just numbers; states are presets.

import { lerp } from '../engine/math';

export interface CoreParams {
  hue: number;
  sat: number;
  light: number;
  brightness: number; // 0..1
  size: number; // 1 = normal
  glow: number; // halo strength
  pulseRate: number; // Hz
  pulseDepth: number;
  jitter: number; // positional instability
  flicker: number; // brightness instability
  crack: number; // visible fractures
  rings: number; // emitted pulse rings
  ringDir: number; // + outward (expanding) / − inward (contracting)
  detach: number; // pulled away from its socket (disconnected)
  sync: number; // phase-locked to the shared scene rhythm
}

export type CoreKey = keyof CoreParams;

export const CORE_DEFAULT: CoreParams = {
  hue: 168, sat: 70, light: 62, brightness: 0.65, size: 1, glow: 0.5,
  pulseRate: 0.28, pulseDepth: 0.15, jitter: 0, flicker: 0, crack: 0,
  rings: 0, ringDir: 1, detach: 0, sync: 0,
};

export interface CoreStateDef {
  label: string;
  meaning: string;
  params: Partial<CoreParams>;
}

export const CORE_STATES: Record<string, CoreStateDef> = {
  calm: { label: 'Calm', meaning: 'At rest. Steady, slow light in time with breathing.', params: {} },
  glowing: {
    label: 'Glowing', meaning: 'Fulfilled, inspired, alive.',
    params: { hue: 44, sat: 95, light: 62, brightness: 1, size: 1.12, glow: 1, pulseRate: 0.5, pulseDepth: 0.2, rings: 0.25 },
  },
  dim: {
    label: 'Dim', meaning: 'Tired, low, depleted. Still there.',
    params: { hue: 232, sat: 18, light: 55, brightness: 0.2, size: 0.85, glow: 0.1, pulseRate: 0.14, pulseDepth: 0.1 },
  },
  pulsing: {
    label: 'Pulsing', meaning: 'Aroused, alert, heart racing — excitement or alarm.',
    params: { hue: 8, sat: 90, light: 64, brightness: 0.9, size: 1.05, glow: 0.8, pulseRate: 1.3, pulseDepth: 0.8, rings: 0.55 },
  },
  unstable: {
    label: 'Unstable', meaning: 'Overloaded. Too many signals at once.',
    params: { hue: 292, sat: 75, light: 64, brightness: 0.75, glow: 0.6, pulseRate: 2.2, pulseDepth: 0.5, jitter: 0.85, flicker: 0.7 },
  },
  cracked: {
    label: 'Cracked', meaning: 'Hurt. Something broke — and light still gets through.',
    params: { hue: 200, sat: 45, light: 60, brightness: 0.45, glow: 0.3, pulseRate: 0.2, crack: 1, flicker: 0.25 },
  },
  expanding: {
    label: 'Expanding', meaning: 'Opening up: awe, love, growth.',
    params: { hue: 50, sat: 95, light: 66, brightness: 0.95, size: 1.75, glow: 1.4, pulseRate: 0.35, pulseDepth: 0.25, rings: 0.85, ringDir: 1 },
  },
  contracting: {
    label: 'Contracting', meaning: 'Closing in: shame, fear, self-protection.',
    params: { hue: 222, sat: 40, light: 58, brightness: 0.4, size: 0.55, glow: 0.15, pulseRate: 0.6, pulseDepth: 0.3, rings: 0.6, ringDir: -1 },
  },
  synchronized: {
    label: 'Synchronized', meaning: 'In tune with others. Every synced Core shares one beat.',
    params: { hue: 186, sat: 85, light: 62, brightness: 0.88, size: 1.08, glow: 0.85, pulseRate: 0.8, pulseDepth: 0.45, rings: 0.5, sync: 1 },
  },
  disconnected: {
    label: 'Disconnected', meaning: 'Numb or isolated. The light has drifted from its place.',
    params: { hue: 225, sat: 12, light: 60, brightness: 0.25, glow: 0.05, pulseRate: 0.1, flicker: 0.2, detach: 1 },
  },
};

export const CORE_STATE_NAMES = Object.keys(CORE_STATES);

/** Target Core parameters for a state at a given intensity (0..1). */
export function coreTarget(state: string, intensity = 1): CoreParams {
  const def = CORE_STATES[state] ?? CORE_STATES.calm;
  const s: CoreParams = { ...CORE_DEFAULT, ...def.params };
  const i = Math.max(0, Math.min(1.5, intensity));
  return {
    ...s,
    brightness: s.brightness * (0.35 + 0.65 * i),
    size: lerp(1, s.size, i),
    glow: s.glow * i,
    pulseDepth: s.pulseDepth * i,
    jitter: s.jitter * i,
    flicker: s.flicker * i,
    crack: s.crack * Math.min(1, i * 1.2),
    rings: s.rings * i,
    detach: s.detach * Math.min(1, i * 1.2),
  };
}
