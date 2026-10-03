# HUMI engine

The character system and procedural animation engine for the **Human Wiki**
universe. HUMI is a tiny, soft, abstract humanoid that stands for every human
being. Everything is drawn with SVG, animated in TypeScript, and uses no 3D
models and no runtime dependencies.

```bash
npm install
npm run dev        # playground: http://localhost:5173/  · model sheet: /sheet.html
npm test           # unit tests (springs, presets, scene spec validation)
npm run build      # typecheck + production build
```

- **Playground** (`index.html`): change emotion, pose, action, Core state and
  intensity, orbit objects and behaviours, mental creatures and their
  helpful/harmful balance, speed, pause or step a frame, background and camera.
  It also has a silhouette test, an orbit guide, a raw-parameter fine-tune
  panel and an editable scene JSON. Presets and looping story timelines are
  one click away.
- **Model sheet** (`sheet.html`): every expression, pose, Core state,
  creature, orbit object and behaviour, rendered live by the engine.
- **Visual rules:** [docs/VISUAL_LANGUAGE.md](docs/VISUAL_LANGUAGE.md).

## How it works

HUMI is described by **one flat vector of numbers** (`src/humi/params.ts`):
eye spacing, eye curve, mouth curve, squash, arm angles, breath rate and so on.

```
target  = defaults ⊕ pose ⊕ expression ⊕ overrides ⊕ action      (data)
current = springs chasing target, tuned per body part              (follow-through)
final   = current + pose cycles + idle life (breath, wobble, blink) (never static)
rig     = geometry from final (head/hand lag in world space)
render  = components write SVG attributes (no re-mounting)
```

Expressions, poses, Core states and creatures are just tables of numbers, so
adding a new feeling or pose needs no rendering code. The engine's update cost
is about 0.1–0.3 ms per frame, not counting browser paint.

**Deterministic.** There is no `Math.random` and no wall-clock time. Seeded
noise and fixed-substep springs mean the same scene spec and the same dt
sequence always produce identical frames, which is the basis for video export.
`Stage.frames(spec, seconds, fps)` yields standalone SVG markup per frame, and
the playground's *Save SVG frame* downloads the current frame.

## Scene API

```json
{
  "character": "humi",
  "pose": "standing",
  "expression": "curious",
  "core": { "state": "glowing", "intensity": 0.8 },
  "orbit": [
    { "type": "question", "behavior": "orbit" },
    { "type": "idea", "behavior": "bounce" }
  ],
  "action": "follow_light",
  "creatures": [{ "kind": "fear", "balance": -0.5 }],
  "background": "dawn",
  "camera": "medium"
}
```

- Top-level character fields describe the main HUMI. `cast: [{ id, x, tint, … }]`
  adds more characters with the same fields.
- `look`: `"camera"`, a character id, `"light"`, or `{ x, y }`.
- `params`: raw parameter overrides, for example `{ "eyeScale": 1.4 }`.
- `timeline: [{ at: 2.5, caption: "…", expression: "sad", … }]`. Each entry is
  a partial spec applied at that time, and springs fill in the motion between
  entries. `duration` and `loop` control playback.
- `Scene.load(spec)` resets the scene. `Scene.apply(patch)` changes only the
  fields given, and the change eases in.
- `validateScene(spec, names)` returns readable warnings for unknown names.
  The playground shows them under the JSON editor.

| Field | Values |
|---|---|
| expression | neutral, happy, joyful, curious, surprised, sad, afraid, angry, worried, thinking, calm, sleepy, proud, shy, confused, determined, loving, overwhelmed |
| pose | standing, waving, thinking, arms_up, hug_self, hands_on_core, pointing, presenting, reaching, shrug, slumped, sitting, meditating, hiding_eyes, walking, jumping, dancing |
| core.state | calm, glowing, dim, pulsing, unstable, cracked, expanding, contracting, synchronized, disconnected |
| orbit type | question, idea, memory, shape, word, number, star, particle, fear, doubt, worry, anger, joy, ego |
| orbit behavior | orbit, bounce, float, swarm, appear, disappear, collide, connect, multiply, transform, enter, leave |
| creatures | fear, worry, doubt, idea, memory, joy, anger, ego |
| action | follow_light, wander, walk_across, jump_for_joy, dance, think, get_idea, let_go, absorb, breathe, shiver, sigh, wave_hello, look_around, sync |
| background | paper, studio, dawn, night, void, mind, blueprint, none |
| camera | wide, medium, closeup, orbit, core, follow, or `{ mode, zoom, x, y, target, drift }` |

## Architecture

```
src/
  engine/     math (seeded noise), springs, SVG helpers, organic shapes, clock, palette
  humi/       HumiCharacter (composition, idle life, rig), HumiHead, HumiBody,
              HumiEyes, HumiMouth, HumiLimb, HumiCore
              params.ts · expressions.ts · poses.ts · coreStates.ts   ← data tables
  orbit/      ThoughtOrbit (behaviours, links, bursts), ThoughtObject, thoughtShapes
  creatures/  MentalCreature (procedural blob, motion, features), creatures.ts (data)
  scene/      Scene, SceneTimeline, CameraController, actions, backgrounds, props,
              Stage (DOM + clock + loop), normalize (pure spec handling), types
  scenes/     examples.ts: presets and story timelines
  playground/ demo UI · sheet/ model sheet
```

**Extending:**

- New expression or pose: add a row to `expressions.ts` or `poses.ts`. For a
  looping motion, add a `cycle(t)` that returns additive offsets.
- New Core state: add an entry to `CORE_STATES`.
- New creature: add a `CreatureDef` (a helpful look, harmful overrides, a
  motion, a feature and role text).
- New thought object: add a case to `createThoughtShape`.
- New behaviour: add a case to `ThoughtOrbit.place`. It must be a pure function
  of behaviour time, so it stays deterministic.
- New action: add an `ActionDef`. Each frame it returns overrides for pose,
  expression, params, gaze, position or Core.
