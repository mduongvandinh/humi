// Pure spec handling: split a scene spec into per-character patches and
// validate names. No DOM access, so it runs in tests and tooling.

import { CORE_STATES } from '../humi/coreStates';
import { EXPRESSIONS } from '../humi/expressions';
import { isParamKey } from '../humi/params';
import { POSES } from '../humi/poses';
import { CREATURES } from '../creatures/creatures';
import { BEHAVIORS } from '../orbit/ThoughtObject';
import { THOUGHT_TYPES } from '../orbit/thoughtShapes';
import type { CharacterSpec, CoreSpec, CreatureSpec, SceneSpec } from './types';

export const MAIN_ID = 'humi';

const CHAR_KEYS = ['x', 'y', 'size', 'tint', 'seed', 'pose', 'expression', 'core', 'orbit', 'action', 'params', 'look'] as const;

export interface SplitScene {
  chars: Array<CharacterSpec & { id: string }>;
  creatures?: CreatureSpec[];
  background?: string;
  camera?: SceneSpec['camera'];
  caption?: string | null;
  speed?: number;
}

export function splitScene(spec: SceneSpec): SplitScene {
  const out: SplitScene = { chars: [] };
  if (spec.character !== 'none') {
    const main: CharacterSpec & { id: string } = { id: MAIN_ID };
    let any = spec.character === 'humi';
    for (const k of CHAR_KEYS) {
      if (spec[k] !== undefined) {
        (main as unknown as Record<string, unknown>)[k] = spec[k];
        any = true;
      }
    }
    if (any) out.chars.push(main);
  }
  spec.cast?.forEach((c, i) => out.chars.push({ ...c, id: c.id ?? `humi${i + 2}` }));
  if (spec.creatures) out.creatures = normalizeCreatures(spec.creatures);
  if (spec.background !== undefined) out.background = spec.background;
  if (spec.camera !== undefined) out.camera = spec.camera;
  if (spec.caption !== undefined) out.caption = spec.caption;
  if (spec.speed !== undefined) out.speed = spec.speed;
  return out;
}

export function normalizeCore(core: CoreSpec | string): CoreSpec {
  return typeof core === 'string' ? { state: core } : core;
}

export function normalizeCreatures(list: Array<CreatureSpec | string>): CreatureSpec[] {
  return list.map((c) => (typeof c === 'string' ? { kind: c } : c));
}

/** Stable identity for diffing creature lists: kind + occurrence index. */
export function creatureKeys(list: CreatureSpec[]): string[] {
  const seen: Record<string, number> = {};
  return list.map((c) => {
    const n = (seen[c.kind] = (seen[c.kind] ?? -1) + 1);
    return `${c.kind}#${n}`;
  });
}

export interface NameLists {
  actions: string[];
  backgrounds: string[];
  cameras: string[];
}

/** Human-readable warnings for unknown names. Empty array = valid. */
export function validateScene(spec: SceneSpec, names: NameLists): string[] {
  const w: string[] = [];
  const check = (kind: string, value: string | undefined | null, known: Record<string, unknown> | string[]) => {
    if (value === undefined || value === null) return;
    const ok = Array.isArray(known) ? known.includes(value) : value in known;
    if (!ok) w.push(`Unknown ${kind} "${value}"`);
  };
  const checkChar = (c: CharacterSpec, who: string) => {
    check(`expression (${who})`, c.expression, EXPRESSIONS);
    check(`pose (${who})`, c.pose, POSES);
    if (c.core !== undefined) check(`core state (${who})`, normalizeCore(c.core).state, CORE_STATES);
    check(`action (${who})`, c.action, names.actions);
    c.orbit?.forEach((o) => {
      const item = typeof o === 'string' ? { type: o } : o;
      check(`orbit type (${who})`, item.type, THOUGHT_TYPES);
      if ('behavior' in item) check(`orbit behavior (${who})`, item.behavior, [...BEHAVIORS]);
    });
    if (c.params) for (const k of Object.keys(c.params)) if (!isParamKey(k)) w.push(`Unknown param "${k}" (${who})`);
  };
  checkChar(spec, MAIN_ID);
  spec.cast?.forEach((c, i) => checkChar(c, c.id ?? `cast[${i}]`));
  if (spec.creatures) for (const c of normalizeCreatures(spec.creatures)) check('creature', c.kind, CREATURES);
  check('background', spec.background, names.backgrounds);
  if (spec.camera !== undefined) {
    check('camera mode', typeof spec.camera === 'string' ? spec.camera : spec.camera.mode, names.cameras);
  }
  spec.timeline?.forEach((e, i) => {
    for (const msg of validateScene(e, names)) w.push(`timeline[${i}] @${e.at}s: ${msg}`);
  });
  return w;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) + 1;
}
