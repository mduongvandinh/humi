import type { Pt } from '../engine/math';

/** Proportions of HUMI in local units (feet at y = 0, up is −y). */
export const DIM = {
  headRx: 50,
  headRy: 45,
  bodyRx: 37,
  bodyRy: 44,
  armLen: 52,
  armWidth: 10,
  handR: 6.2,
  legLen: 22,
  legWidth: 12.5,
  hipX: 12,
  outline: 3.2,
  coreR: 8.5,
};

/** Everything a component needs to draw one frame, in character-local space. */
export interface Rig {
  pivot: Pt;
  lean: number;
  body: { cx: number; cy: number; rx: number; ry: number; puff: number };
  neck: Pt;
  head: Pt;
  headRot: number;
  face: { x: number; y: number };
  /** index 0 = screen-left, 1 = screen-right */
  shoulder: [Pt, Pt];
  hand: [Pt, Pt];
  elbow: [Pt, Pt];
  hip: [Pt, Pt];
  knee: [Pt, Pt];
  foot: [Pt, Pt];
  core: Pt;
  breath: number;
}
