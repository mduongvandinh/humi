# HUMI — Visual Language

HUMI is the main character of the Human Wiki universe: a tiny, soft, abstract
humanoid that stands for **every** human being. It is not a realistic person
and not an animal. This document lists the rules the engine follows, so new
scenes, characters and creatures stay consistent with it.

The live reference is the model sheet (`sheet.html`), which the engine renders
itself, so the two cannot drift apart.

---

## 1. Anatomy

| Part | Rule | Engine |
|---|---|---|
| Head | Oversized, slightly wider than tall (50 × 45 units), and the largest shape. It overlaps the top of the body by about a quarter of its height. | `HumiHead`, `DIM.headRx/headRy` |
| Body | A bean/drop: narrower at the shoulders, fuller at the base, slightly flat underneath (37 × 44). | `HumiBody` |
| Arms | Noodles: one soft curve with a round mitten end. No elbows or fingers. | `HumiLimb('arm')` |
| Legs | Short (22), thick, grounded, with a small outward foot nub. Crouching splays them on its own. | `HumiLimb('leg')` |
| Eyes | Two dark dots, each with a small white sparkle. | `HumiEyes` / `eyePath()` |
| Mouth | One soft line that can curve and open. | `HumiMouth` / `mouthPath()` |
| Core | A small glowing orb in the chest. | `HumiCore` |
| Never | No nose, ears, hair, eyebrows, lashes, lips, clothes, fingers, toes, skin tones or gendered markers. | — |

**Imperfection.** Every outline is a ring of points with a little seeded
irregularity (each HUMI is a different person) and a very slow drift (it is
alive). Shapes are never perfect circles.

**Silhouette test.** HUMI must stay recognisable as a black shape: big round
head, bean body, four noodles. Use *Silhouette* in the playground to check any
new pose.

## 2. Colour

- **Body:** pale and deliberately *not* a skin colour, so HUMI never reads as
  any ethnicity. Default `pearl` (#F2EFFC). Other tints for telling characters
  apart: `mint`, `sky`, `butter`, `lilac`.
- **Ink:** warm near-black violet `#2A2440`, about 3.2 units wide on HUMI and
  2 on small objects.
- **Accents** (`ACCENT` in `palette.ts`): violet = questions, sun/gold =
  ideas and stars, sky = memory, teal = calm, coral/ember = friction and anger,
  pink = love.
- **Blush:** a soft pink that only appears with warm feelings or shyness. It is
  never on by default at full strength.

## 3. Expressions: minimal face, expressive body

Faces have no rig. Every feeling is built from these, in this order of
importance:

1. **Eye shape:** scale, `eyeSmile` (dot → happy crescent), `eyeLid` (a flat
   top edge), `eyeTilt` (slants that flat edge: positive = anger, negative =
   worry or sadness), `eyeAsym` (doubt, confusion).
2. **Eye spacing and direction:** close-set eyes = tension; looking away = shy
   or avoiding; looking up = thinking.
3. **Mouth curve:** −1 frown to +1 smile, plus `mouthOpen` and `mouthSkew`.
4. **Posture:** `squash`, `slump`, `puff`, `headSink`, `headTilt`.
5. **Life:** `breathRate`, `energy`, `tremble`, `bounce`.
6. **Core and orbit**, which carry the inner state (see below).

There are 18 named expressions in `src/humi/expressions.ts`. They are only
rows of numbers. To add a feeling, add a row; don't add rendering code.

## 4. The Human Core

The strongest recurring metaphor: **the light in the chest is the person's
inner state.**

| State | Meaning | Visual signature |
|---|---|---|
| calm | at rest | soft teal, slow pulse in time with breathing |
| glowing | fulfilled, inspired | gold, warm halo that spills past the body |
| dim | tired, depleted | grey-blue, small, almost no glow |
| pulsing | alert or excited, heart racing | coral, strong fast beat, rings |
| unstable | overloaded | violet, jitter, flicker, irregular rhythm |
| cracked | hurt | fracture lines with light leaking through |
| expanding | awe, love, growth | large gold orb, outward rings |
| contracting | shame, fear, self-protection | small, inward rings |
| synchronized | in tune with others | cyan; every synced Core shares one beat, and glowing threads join them |
| disconnected | numb, isolated | grey, drifted out of a dashed "socket" |

Rules:

- `intensity` (0–1.5) scales a state, so a state can be shown faintly.
- The inner light is clipped to the body, so the outline always stays crisp.
  Only strong states leak a halo outside the body.
- Flashes (`core.flash()`) mark moments of realisation: a thought arriving or
  an idea clicking.

## 5. Thought orbit

An invisible, slightly tilted ring around and above the head. Objects behind
the head are hidden by HUMI; objects in front pass over it.

**Objects:** question (violet ? on a white token), idea (a gold four-point
spark with a glow), memory (a translucent bubble with a tiny remembered HUMI
inside), shape, word (white pill), number (white token), star, particle (joy,
love, sad, anger or calm), and mini mental creatures (fear, doubt, worry,
anger, joy, ego).

**Behaviours:** `orbit`, `bounce`, `float`, `swarm` (anxious, tight and fast),
`appear`, `disappear`, `collide` (pairs meet and spark; a single collider
bonks the head), `connect` (dotted links, forming a constellation from three),
`multiply`, `transform` (? → idea and similar), `enter` (spirals into the Core,
which flashes), `leave` (rises out of the Core and drifts away).

## 6. Mental creatures

Small living blobs that stand for human *mechanisms*: Fear, Worry, Doubt,
Idea, Memory, Joy, Anger and Ego. **They are never villains.** Each one has a
helpful form and a harmful form, and `balance` (−1 … +1) moves smoothly
between them:

- **Helpful:** small, light, soft-edged, calm, with a friendly face. It stays
  at a respectful distance.
- **Harmful:** bigger, darker, spikier or fuzzier, with a shadow aura and
  faster motion. It creeps close to HUMI's head, as if whispering.

Each creature has a signature motion and one small feature: Fear trembles
(shiver marks), Worry paces (a scribble spiral), Doubt tilts (a question-hook
curl), Idea bounces (sparkles), Memory floats (an inner remembered figure),
Joy hops (confetti), Anger vibrates (steam puffs), Ego inflates (a small
crown). Every creature has helpful and harmful role text in `creatures.ts`,
ready for captions.

## 7. Motion

- **Never perfectly still.** Breathing, a low-frequency wobble, eye
  micro-movements and blinks (sometimes double blinks) always run.
- **Staggered settling.** The face reacts first, the body follows, and the
  noodle arms arrive last with a little overshoot. These spring speeds are
  set per body-part group in `params.ts`.
- **Secondary motion.** The head and hands lag behind the body in world space,
  so jumps make the head bobble and the arms trail. Arms answer the breath a
  beat late.
- **Squash and stretch** preserve volume and are anchored at the feet.
- **No linear tweens or snapping.** Every change is a spring. Pose cycles
  (walking, waving) cross-fade.
- **Playful, slightly imperfect.** Wobble comes from noise, not from sine
  waves at a single frequency.
