import { describe, expect, it } from 'vitest';
import { ACTION_NAMES } from '../src/scene/actions';
import { BACKGROUND_NAMES } from '../src/scene/backgrounds';
import { CAMERA_MODES } from '../src/scene/CameraController';
import { creatureKeys, normalizeCreatures, splitScene, validateScene } from '../src/scene/normalize';
import { PRESETS, STORIES } from '../src/scenes/examples';

const names = { actions: ACTION_NAMES, backgrounds: BACKGROUND_NAMES, cameras: [...CAMERA_MODES] };

describe('scene spec', () => {
  it('splits top-level fields onto the main character', () => {
    const s = splitScene({
      character: 'humi',
      pose: 'standing',
      expression: 'curious',
      core: { state: 'glowing', intensity: 0.8 },
      orbit: [{ type: 'question', behavior: 'orbit' }],
      action: 'follow_light',
      background: 'dawn',
    });
    expect(s.chars).toHaveLength(1);
    expect(s.chars[0]).toMatchObject({ id: 'humi', expression: 'curious', action: 'follow_light' });
    expect(s.background).toBe('dawn');
  });

  it('a patch without character fields leaves characters alone', () => {
    expect(splitScene({ background: 'night' }).chars).toHaveLength(0);
    expect(splitScene({ character: 'none', expression: 'sad' }).chars).toHaveLength(0);
  });

  it('cast members get ids', () => {
    const s = splitScene({ cast: [{ x: 100 }, { id: 'friend' }] });
    expect(s.chars.map((c) => c.id)).toEqual(['humi2', 'friend']);
  });

  it('creature keys are stable per kind occurrence', () => {
    expect(creatureKeys(normalizeCreatures(['fear', 'joy', { kind: 'fear', balance: -1 }]))).toEqual(['fear#0', 'joy#0', 'fear#1']);
  });

  it('flags unknown names', () => {
    const w = validateScene(
      { expression: 'grumpy', orbit: [{ type: 'banana' }], creatures: ['dragon'], params: { nose: 1 } as never },
      names,
    );
    expect(w.join('\n')).toMatch(/grumpy/);
    expect(w.join('\n')).toMatch(/banana/);
    expect(w.join('\n')).toMatch(/dragon/);
    expect(w.join('\n')).toMatch(/nose/);
  });

  it('every bundled preset and story is valid', () => {
    for (const [name, spec] of Object.entries({ ...PRESETS, ...STORIES })) {
      expect(validateScene(spec, names), name).toEqual([]);
    }
  });
});
