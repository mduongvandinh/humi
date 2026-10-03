import type { ParamPatch } from '../humi/params';
import type { OrbitItemSpec } from '../orbit/ThoughtObject';

export interface CoreSpec {
  state?: string;
  intensity?: number;
}

/** 'camera' = look at the viewer, a character id, 'light', or a world point. */
export type LookSpec = string | { x: number; y: number };

export interface CharacterSpec {
  id?: string;
  /** World x of the feet (default: centre stage). */
  x?: number;
  y?: number;
  size?: number;
  tint?: string;
  seed?: number;
  pose?: string;
  expression?: string;
  core?: CoreSpec | string;
  orbit?: Array<OrbitItemSpec | string>;
  action?: string | null;
  /** Raw parameter overrides (replaces previous overrides). */
  params?: ParamPatch;
  look?: LookSpec | null;
}

export interface CreatureSpec {
  kind: string;
  /** −1 harmful … +1 helpful. */
  balance?: number;
  slot?: number;
  /** Character the creature hangs around (default: main). */
  near?: string;
}

export interface CameraSpec {
  mode?: string;
  zoom?: number;
  x?: number;
  y?: number;
  /** Character id to frame. */
  target?: string;
  /** Hand-held drift amount (0 = locked off). */
  drift?: number;
}

/**
 * The declarative scene format. Top-level character fields describe the main
 * character ("humi"); `cast` adds more. Every field is optional, and the same
 * shape is used as a patch by Scene.apply() and by timeline entries.
 */
export interface SceneSpec extends CharacterSpec {
  character?: 'humi' | 'none';
  cast?: CharacterSpec[];
  creatures?: Array<CreatureSpec | string>;
  background?: string;
  camera?: string | CameraSpec;
  caption?: string | null;
  speed?: number;
  timeline?: TimelineEntry[];
  loop?: boolean;
  duration?: number;
}

export interface TimelineEntry extends Omit<SceneSpec, 'timeline' | 'loop' | 'duration'> {
  /** Seconds from the start of the scene. */
  at: number;
}
