// Expressions are face + posture only (eyes, mouth, head, body shape, life).
// No complex facial rig: every feeling is spacing, scale, direction and
// curvature of a few dots and one line, plus how the body holds itself.

import type { ParamPatch } from './params';

export interface ExpressionDef {
  label: string;
  params: ParamPatch;
}

export const EXPRESSIONS: Record<string, ExpressionDef> = {
  neutral: { label: 'Neutral', params: { mouthCurve: 0.12 } },
  happy: {
    label: 'Happy',
    params: { eyeSmile: 0.85, mouthCurve: 0.9, mouthWidth: 8.5, blush: 0.5, squash: 1.03, energy: 1.2 },
  },
  joyful: {
    label: 'Joyful',
    params: {
      eyeSmile: 1, eyeSpacing: 16, mouthCurve: 1, mouthOpen: 0.75, mouthWidth: 9.5,
      blush: 0.7, squash: 1.06, energy: 1.6, bounce: 0.55,
    },
  },
  curious: {
    label: 'Curious',
    params: {
      eyeScale: 1.18, eyeScaleY: 1.1, eyeAsym: 0.25, eyeSparkle: 1, mouthCurve: 0.15,
      mouthWidth: 4, mouthOpen: 0.2, headTilt: 0.18, energy: 1.1,
    },
  },
  surprised: {
    label: 'Surprised',
    params: {
      eyeScale: 1.35, eyeScaleY: 1.2, eyeSpacing: 16, eyeSparkle: 1, mouthWidth: 4.5,
      mouthOpen: 1, mouthCurve: 0, squash: 1.1, headSink: -6, blush: 0.15,
    },
  },
  sad: {
    label: 'Sad',
    params: {
      eyeTilt: -0.35, eyeLid: 0.35, eyeY: 5, eyeScale: 0.95, eyeSparkle: 0.9, mouthCurve: -0.7,
      squash: 0.93, slump: 0.7, headTilt: -0.08, breathRate: 0.18, energy: 0.5, blush: 0,
    },
  },
  afraid: {
    label: 'Afraid',
    params: {
      eyeScale: 1.3, eyeScaleY: 1.15, eyeSpacing: 13, eyeTilt: -0.25, eyeSparkle: 0.3,
      mouthCurve: -0.4, mouthWidth: 5.5, mouthOpen: 0.35, squash: 0.9, headSink: 6,
      tremble: 0.8, breathRate: 0.7, blush: 0,
    },
  },
  angry: {
    label: 'Angry',
    params: {
      eyeTilt: 0.62, eyeLid: 0.58, eyeSpacing: 13, eyeScale: 1.05, eyeSparkle: 0.2,
      mouthCurve: -0.75, mouthWidth: 8, headSink: 3, squash: 0.96, puff: 0.3, tremble: 0.25,
      breathRate: 0.55, energy: 1.2, blush: 0,
    },
  },
  worried: {
    label: 'Worried',
    params: {
      eyeTilt: -0.4, eyeLid: 0.15, eyeScale: 1.05, mouthCurve: -0.25, mouthSkew: 0.3,
      mouthWidth: 5.5, squash: 0.97, slump: 0.25, breathRate: 0.45, tremble: 0.15,
    },
  },
  thinking: {
    label: 'Thinking',
    params: {
      lookX: 0.5, lookY: -0.6, eyeLid: 0.2, eyeAsym: -0.2, mouthCurve: -0.05,
      mouthWidth: 4.5, mouthSkew: 0.5, headTilt: -0.12,
    },
  },
  calm: {
    label: 'Calm',
    params: {
      eyeLid: 0.45, eyeSmile: 0.3, mouthCurve: 0.35, blush: 0.3,
      breathRate: 0.16, breathDepth: 1.6, energy: 0.6,
    },
  },
  sleepy: {
    label: 'Sleepy',
    params: {
      eyeLid: 0.82, eyeY: 4, eyeSparkle: 0, mouthCurve: 0.05, mouthOpen: 0.12, squash: 0.95,
      slump: 0.4, headTilt: 0.15, breathRate: 0.14, breathDepth: 1.8, energy: 0.35,
    },
  },
  proud: {
    label: 'Proud',
    params: {
      eyeLid: 0.4, eyeSmile: 0.4, mouthCurve: 0.6, mouthSkew: 0.35, puff: 0.8,
      squash: 1.05, headTilt: -0.06, lookY: -0.2,
    },
  },
  shy: {
    label: 'Shy',
    params: {
      eyeSmile: 0.5, lookX: -0.5, lookY: 0.4, mouthCurve: 0.3, mouthWidth: 4.5,
      blush: 1, headSink: 5, headTilt: 0.15, squash: 0.97,
    },
  },
  confused: {
    label: 'Confused',
    params: { eyeAsym: 0.5, eyeTilt: -0.1, mouthCurve: -0.15, mouthSkew: -0.6, mouthWidth: 5.5, headTilt: 0.25 },
  },
  determined: {
    label: 'Determined',
    params: { eyeTilt: 0.25, eyeLid: 0.3, mouthCurve: -0.1, mouthWidth: 7.5, squash: 1.04, puff: 0.3, energy: 1.3 },
  },
  loving: {
    label: 'Loving',
    params: {
      eyeSmile: 0.9, eyeSparkle: 1, blush: 1, mouthCurve: 0.7, energy: 0.9,
      breathDepth: 1.3, headTilt: 0.1,
    },
  },
  overwhelmed: {
    label: 'Overwhelmed',
    params: {
      eyeScale: 1.2, eyeOpen: 0.9, eyeTilt: -0.3, eyeAsym: 0.2, mouthCurve: -0.5,
      mouthOpen: 0.3, mouthSkew: 0.4, tremble: 0.5, squash: 0.92, slump: 0.3,
      breathRate: 0.8, energy: 1.6,
    },
  },
};

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);
