import { clamp, lerp, type Pt } from '../engine/math';
import { DefsBank, svg, tf } from '../engine/svg';
import { MentalCreature } from '../creatures/MentalCreature';
import { HumiCharacter, type ActionOutput } from '../humi/HumiCharacter';
import { ACTIONS, type ActionRuntime } from './actions';
import { BackgroundLayer } from './backgrounds';
import { CameraController } from './CameraController';
import { creatureKeys, hashString, MAIN_ID, normalizeCore, splitScene } from './normalize';
import { Caption, LightOrb, SyncThreads } from './props';
import { SceneTimeline } from './SceneTimeline';
import type { CharacterSpec, CreatureSpec, LookSpec, SceneSpec } from './types';

export interface SceneOptions {
  width?: number;
  height?: number;
  groundY?: number;
}

/** Creature slots around a character, in character-local units. */
const SLOTS: Pt[] = [
  [-170, -70], [170, -70], [-205, -195], [205, -195],
  [-115, -300], [115, -300], [-265, -15], [265, -15],
];

interface CreatureEntry {
  key: string;
  spec: CreatureSpec;
  c: MentalCreature;
  slot: number;
}

interface ActionEntry {
  name: string;
  rt: ActionRuntime;
  t: number;
}

/**
 * Turns a declarative SceneSpec into a living, animated SVG scene.
 * load() resets; apply() patches (anything omitted is left as is, and every
 * change eases in through springs).
 */
export class Scene {
  readonly W: number;
  readonly H: number;
  readonly groundY: number;
  readonly defs: DefsBank;
  readonly world: SVGGElement;
  readonly camera: CameraController;
  readonly background: BackgroundLayer;
  readonly light: LightOrb;
  readonly characters = new Map<string, HumiCharacter>();
  time = 0;
  timeline: SceneTimeline | null = null;
  speed = 1;

  private charLayer: SVGGElement;
  private creatureLayer: SVGGElement;
  private threadLayer: SVGGElement;
  private threads: SyncThreads;
  private caption: Caption;
  private actions = new Map<string, ActionEntry>();
  private looks = new Map<string, LookSpec | null>();
  private creatures: CreatureEntry[] = [];
  private leaving: MentalCreature[] = [];

  constructor(
    readonly svgEl: SVGSVGElement,
    o: SceneOptions = {},
  ) {
    this.W = o.width ?? 1280;
    this.H = o.height ?? 720;
    this.groundY = o.groundY ?? 560;
    this.defs = new DefsBank(svg('defs', {}, svgEl));
    const bgRoot = svg('g', { class: 'scene-bg' }, svgEl);
    this.world = svg('g', { class: 'scene-world' }, svgEl);
    this.creatureLayer = svg('g', { class: 'scene-creatures' }, this.world);
    this.threadLayer = svg('g', { class: 'scene-threads' }, this.world);
    this.charLayer = svg('g', { class: 'scene-characters' }, this.world);
    const propLayer = svg('g', { class: 'scene-props' }, this.world);
    const ui = svg('g', { class: 'scene-ui' }, svgEl);
    this.background = new BackgroundLayer(bgRoot, this.defs, this.W, this.H);
    this.camera = new CameraController(this.world, this.W, this.H);
    this.light = new LightOrb(propLayer, this.defs);
    this.threads = new SyncThreads(this.threadLayer);
    this.caption = new Caption(ui, this.W, this.H);
  }

  get main(): HumiCharacter | undefined {
    return this.characters.get(MAIN_ID) ?? this.characters.values().next().value;
  }

  /** Reset and build a scene from scratch (no easing from the old state). */
  load(spec: SceneSpec): void {
    this.clear();
    this.background.set(spec.background ?? 'paper', true);
    this.camera.set(spec.camera ?? 'wide', true);
    this.apply({ character: 'humi', ...spec, timeline: undefined }, true);
    this.timeline = spec.timeline?.length ? new SceneTimeline(spec) : null;
    this.update(0);
  }

  /** Patch the live scene. Only the fields present change. */
  apply(spec: SceneSpec, instant = false): void {
    const parts = splitScene(spec);
    parts.chars.forEach((cs, i) => this.applyCharacter(cs, i, parts.chars.length, instant));
    if (parts.creatures) this.setCreatures(parts.creatures, instant);
    if (parts.background !== undefined) this.background.set(parts.background, instant);
    if (parts.camera !== undefined) this.camera.set(parts.camera, instant);
    if (parts.caption !== undefined) this.caption.set(parts.caption);
    if (parts.speed !== undefined) this.speed = parts.speed;
  }

  private applyCharacter(cs: CharacterSpec & { id: string }, index: number, total: number, instant: boolean): void {
    let ch = this.characters.get(cs.id);
    const created = !ch;
    if (!ch) {
      const defaultX = total > 1 ? this.W / 2 + (index - (total - 1) / 2) * 300 : this.W / 2;
      ch = new HumiCharacter(this.charLayer, {
        defs: this.defs,
        id: cs.id,
        x: cs.x ?? defaultX,
        y: cs.y ?? this.groundY,
        size: cs.size ?? 1.6,
        seed: cs.seed ?? hashString(cs.id),
        tint: cs.tint,
      });
      this.characters.set(cs.id, ch);
    }
    if (cs.x !== undefined) ch.homeX = cs.x;
    if (cs.y !== undefined) ch.homeY = cs.y;
    if (cs.size !== undefined) ch.size = cs.size;
    if (cs.pose !== undefined) ch.setPose(cs.pose);
    if (cs.expression !== undefined) ch.setExpression(cs.expression);
    if (cs.core !== undefined) {
      const c = normalizeCore(cs.core);
      ch.setCore(c.state ?? ch.core.state, c.intensity ?? ch.core.intensity);
    }
    if (cs.orbit !== undefined) ch.orbit.setItems(cs.orbit);
    if (cs.params !== undefined) ch.setParams(cs.params);
    if (cs.look !== undefined) this.looks.set(cs.id, cs.look);
    if (cs.action !== undefined) this.setAction(ch, cs.action);
    if (created || instant) ch.snap();
  }

  setAction(ch: HumiCharacter, name: string | null): void {
    const cur = this.actions.get(ch.id);
    const next = name && ACTIONS[name] && name !== 'none' ? name : null;
    if (cur && cur.name === next) return;
    if (cur) {
      cur.rt.stop?.({ scene: this, char: ch });
      ch.rebaseHome();
    }
    this.actions.delete(ch.id);
    if (next) this.actions.set(ch.id, { name: next, rt: ACTIONS[next].create(ch), t: 0 });
  }

  private setCreatures(list: CreatureSpec[], instant: boolean): void {
    const keys = creatureKeys(list);
    const next: CreatureEntry[] = [];
    const used = new Set<number>();
    list.forEach((spec, i) => {
      const existing = this.creatures.find((e) => e.key === keys[i]);
      if (existing) {
        existing.spec = spec;
        existing.c.setBalance(spec.balance ?? 0);
        if (instant) existing.c.snapBalance(spec.balance ?? 0);
        next.push(existing);
        used.add(existing.slot);
      }
    });
    list.forEach((spec, i) => {
      if (next.some((e) => e.key === keys[i])) return;
      let slot = spec.slot ?? 0;
      if (spec.slot === undefined) while (used.has(slot)) slot++;
      used.add(slot);
      const c = new MentalCreature(this.creatureLayer, spec.kind, {
        defs: this.defs,
        seed: hashString(keys[i]),
        balance: spec.balance ?? 0,
      });
      next.push({ key: keys[i], spec, c, slot });
    });
    for (const e of this.creatures) {
      if (!next.includes(e)) {
        e.c.exit();
        this.leaving.push(e.c);
      }
    }
    this.creatures = next;
  }

  private resolveLook(ch: HumiCharacter): Pt | null | undefined {
    const look = this.looks.get(ch.id);
    if (look === undefined || look === null) return undefined;
    if (typeof look === 'object') return [look.x, look.y];
    if (look === 'camera') return ch.anchor('head');
    if (look === 'light') return this.light.position;
    const other = this.characters.get(look);
    return other ? other.anchor('head') : undefined;
  }

  update(dt: number): void {
    this.time += dt;
    this.timeline?.update(dt, this);

    for (const ch of this.characters.values()) {
      const a = this.actions.get(ch.id);
      let out: ActionOutput = {};
      if (a) {
        a.t += dt;
        out = a.rt.update({ scene: this, char: ch, dt, t: a.t }) ?? {};
      }
      if (out.lookAt === undefined) {
        const lk = this.resolveLook(ch);
        if (lk !== undefined) out = { ...out, lookAt: lk };
      }
      ch.update(dt, this.time, out);
    }

    this.updateCreatures(dt);
    this.light.update(dt);
    this.threads.update(dt, [...this.characters.values()]);
    this.camera.update(dt, this);
    this.background.update(dt, this.camera.view);
    this.caption.update(dt);
  }

  private updateCreatures(dt: number): void {
    const cols = Math.min(4, this.creatures.length);
    for (const [index, e] of this.creatures.entries()) {
      const host = this.characters.get(e.spec.near ?? MAIN_ID) ?? this.main;
      const slot = SLOTS[e.slot % SLOTS.length];
      const ring = Math.floor(e.slot / SLOTS.length);
      let x: number;
      let y: number;
      let scale = 1.15;
      let headPt: Pt;
      if (host) {
        const sz = host.size;
        scale = sz * 0.9;
        const head = host.anchor('head');
        // Harmful creatures creep in close to the head, "whispering".
        const harm = clamp((1 - e.c.currentBalance) / 2);
        const side = slot[0] < 0 ? -1 : 1;
        const sx = host.worldX + slot[0] * sz * (1 + ring * 0.25);
        const sy = host.homeY + slot[1] * sz;
        const wx = head[0] + side * 105 * sz;
        const wy = head[1] - 25 * sz;
        x = lerp(sx, wx, harm * 0.45);
        y = lerp(sy, wy, harm * 0.45);
        headPt = head;
      } else {
        // No character: lay creatures out in a centred grid that fills the stage.
        const rows = Math.ceil(this.creatures.length / cols);
        const colW = this.W / cols;
        const rowH = Math.min(this.H / rows, colW * 1.1);
        x = this.W / 2 + ((index % cols) - (cols - 1) / 2) * colW;
        y = this.H / 2 + 12 + (Math.floor(index / cols) - (rows - 1) / 2) * rowH;
        scale = Math.max(0.8, Math.min(3.5, Math.min(colW, rowH) / 135));
        headPt = [this.W / 2, this.H / 2];
      }
      e.c.el.setAttribute('transform', tf(x, y, 0, scale));
      const d = Math.hypot(headPt[0] - x, headPt[1] - y) || 1;
      e.c.look = host ? [(headPt[0] - x) / d, (headPt[1] - y) / d] : [0, 0];
      e.c.update(dt);
    }
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const c = this.leaving[i];
      c.update(dt);
      if (c.done) {
        c.el.remove();
        this.leaving.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const [id, a] of this.actions) {
      const ch = this.characters.get(id);
      if (ch) a.rt.stop?.({ scene: this, char: ch });
    }
    this.actions.clear();
    for (const ch of this.characters.values()) ch.dispose();
    this.characters.clear();
    this.looks.clear();
    for (const e of this.creatures) e.c.el.remove();
    for (const c of this.leaving) c.el.remove();
    this.creatures = [];
    this.leaving = [];
    this.caption.reset();
    this.camera.reset();
    this.background.reset();
    this.light.reset();
    this.threads.reset();
    this.timeline = null;
    this.time = 0;
    this.speed = 1;
  }
}
