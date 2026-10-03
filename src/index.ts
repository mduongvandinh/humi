// Public API of the HUMI engine.
export { Stage } from './scene/Stage';
export { Scene, type SceneOptions } from './scene/Scene';
export { SceneTimeline } from './scene/SceneTimeline';
export { CameraController, CAMERA_MODES } from './scene/CameraController';
export { ACTIONS, ACTION_NAMES, type ActionDef, type ActionCtx, type ActionRuntime } from './scene/actions';
export { BACKGROUNDS, BACKGROUND_NAMES } from './scene/backgrounds';
export { splitScene, validateScene } from './scene/normalize';
export type * from './scene/types';

export { HumiCharacter, type ActionOutput, type AnchorName } from './humi/HumiCharacter';
export { HumiHead } from './humi/HumiHead';
export { HumiBody } from './humi/HumiBody';
export { HumiEyes, EyePair, eyePath } from './humi/HumiEyes';
export { HumiMouth, mouthPath } from './humi/HumiMouth';
export { HumiCore } from './humi/HumiCore';
export { HumiLimb } from './humi/HumiLimb';
export { EXPRESSIONS, EXPRESSION_NAMES } from './humi/expressions';
export { POSES, POSE_NAMES } from './humi/poses';
export { CORE_STATES, CORE_STATE_NAMES, coreTarget } from './humi/coreStates';
export { PARAM_DEFAULTS, PARAM_RANGES, PARAM_KEYS, type HumiParams, type ParamPatch } from './humi/params';

export { ThoughtOrbit } from './orbit/ThoughtOrbit';
export { ThoughtObject, BEHAVIORS, type Behavior, type OrbitItemSpec } from './orbit/ThoughtObject';
export { THOUGHT_TYPES } from './orbit/thoughtShapes';

export { MentalCreature } from './creatures/MentalCreature';
export { CREATURES, CREATURE_KINDS, creatureLook } from './creatures/creatures';

export { Clock } from './engine/clock';
export { TINTS, INK } from './engine/palette';
