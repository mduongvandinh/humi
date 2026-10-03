import './playground.css';
import {
  ACTIONS,
  BACKGROUNDS,
  BEHAVIORS,
  CAMERA_MODES,
  CORE_STATES,
  CREATURES,
  EXPRESSIONS,
  PARAM_DEFAULTS,
  PARAM_KEYS,
  PARAM_RANGES,
  POSES,
  Stage,
  THOUGHT_TYPES,
  validateScene,
  type Behavior,
  type CreatureSpec,
  type OrbitItemSpec,
  type ParamPatch,
  type SceneSpec,
} from '../index';
import { normalizeCore, normalizeCreatures } from '../scene/normalize';
import { normalizeOrbitItem } from '../orbit/ThoughtOrbit';
import { PRESETS, STORIES } from '../scenes/examples';

// ---------- tiny DOM helper ----------
type Props = Record<string, unknown>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: Array<Node | string>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else if (v !== undefined && v !== null && v !== false) (e as unknown as Record<string, unknown>)[k] = v;
  }
  e.append(...kids);
  return e;
}
const options = (names: string[], labels?: Record<string, { label: string }>) =>
  names.map((n) => h('option', { value: n }, labels?.[n]?.label ?? n));

const NAME_LISTS = {
  actions: Object.keys(ACTIONS),
  backgrounds: Object.keys(BACKGROUNDS),
  cameras: [...CAMERA_MODES],
};

// ---------- state ----------
let spec: SceneSpec = structuredClone(PRESETS.Curious);
let storyName: string | null = null;

const app = document.getElementById('app')!;
const panel = h('aside', { class: 'panel' });
const stageWrap = h('div', { class: 'stage-wrap' });
const progress = h('div', { class: 'progress' }, h('div'));
const jsonArea = h('textarea', { spellcheck: false });
const warnings = h('div', { class: 'warnings' });
const main = h(
  'main',
  { class: 'main' },
  stageWrap,
  progress,
  h(
    'section',
    { class: 'json' },
    h(
      'div',
      { class: 'row' },
      h('strong', {}, 'Scene JSON'),
      h('span', { class: 'note', style: 'flex:1' }, 'Edit and apply — the same format drives stories and video.'),
      h('button', { onclick: () => applyJson() }, 'Apply JSON'),
      h('button', { onclick: () => navigator.clipboard?.writeText(jsonArea.value) }, 'Copy'),
    ),
    jsonArea,
    warnings,
  ),
);
app.append(h('div', { class: 'app' }, panel, main));

const stage = new Stage(stageWrap);
stage.scene.load(spec);
stage.start();
stage.onFrame = () => {
  const tl = stage.scene.timeline;
  (progress.firstChild as HTMLElement).style.width = tl ? `${(tl.progress * 100).toFixed(1)}%` : '0';
};

/** Patch the live scene and mirror the change into the editable spec. */
function patch(p: SceneSpec): void {
  Object.assign(spec, p);
  for (const k of Object.keys(p) as Array<keyof SceneSpec>) if (p[k] === undefined) delete spec[k];
  stage.scene.apply(p);
  refreshJson();
}

function refreshJson(): void {
  if (document.activeElement !== jsonArea) jsonArea.value = JSON.stringify(spec, null, 2);
  const w = validateScene(spec, NAME_LISTS);
  warnings.textContent = w.join('\n');
}

function load(s: SceneSpec, story: string | null = null): void {
  spec = structuredClone(s);
  storyName = story;
  stage.scene.load(spec);
  buildPanel();
  refreshJson();
}

function applyJson(): void {
  try {
    const parsed = JSON.parse(jsonArea.value) as SceneSpec;
    const w = validateScene(parsed, NAME_LISTS);
    load(parsed, parsed.timeline?.length ? 'custom' : null);
    warnings.textContent = w.join('\n');
  } catch (err) {
    warnings.textContent = `JSON error: ${(err as Error).message}`;
  }
}

// ---------- panel ----------
function select(value: string, names: string[], onchange: (v: string) => void, labels?: Record<string, { label: string }>) {
  const s = h('select', { onchange: () => onchange(s.value) }, ...options(names, labels));
  s.value = value;
  return s;
}

function slider(value: number, min: number, max: number, step: number, oninput: (v: number) => void) {
  const out = h('output', {}, value.toFixed(2));
  const r = h('input', {
    type: 'range', min, max, step, value,
    oninput: () => {
      out.textContent = Number(r.value).toFixed(2);
      oninput(Number(r.value));
    },
  });
  return [r, out] as const;
}

const row = (label: string, ...kids: Node[]) => h('div', { class: 'row' }, h('label', {}, label), ...kids);
const section = (title: string, ...kids: Node[]) => h('section', {}, h('h2', {}, title), ...kids);

function buildPanel(): void {
  panel.replaceChildren(
    h(
      'header',
      {},
      h('h1', {}, 'HUMI'),
      h('p', {}, 'Visual language & animation engine — playground'),
      h('a', { href: './sheet.html' }, 'Open the model sheet →'),
    ),
    presetsSection(),
    characterSection(),
    coreSection(),
    orbitSection(),
    creaturesSection(),
    sceneSection(),
    paramsSection(),
  );
}

function presetsSection(): HTMLElement {
  const btn = (name: string, s: SceneSpec, story: boolean) =>
    h('button', { class: storyName === name ? 'on' : '', onclick: () => load(s, story ? name : null) }, name);
  return section(
    'Presets & stories',
    h('div', { class: 'chips' }, ...Object.entries(PRESETS).map(([n, s]) => btn(n, s, false))),
    h('p', { class: 'note' }, 'Stories are timelines (looping):'),
    h('div', { class: 'chips' }, ...Object.entries(STORIES).map(([n, s]) => btn(n, s, true))),
  );
}

function characterSection(): HTMLElement {
  const actionNote = h('p', { class: 'note' }, ACTIONS[spec.action ?? 'none']?.description ?? '');
  return section(
    'Character',
    row('Emotion', select(spec.expression ?? 'neutral', Object.keys(EXPRESSIONS), (v) => patch({ expression: v }), EXPRESSIONS)),
    row('Pose', select(spec.pose ?? 'standing', Object.keys(POSES), (v) => patch({ pose: v }), POSES)),
    row(
      'Action',
      select(spec.action ?? 'none', Object.keys(ACTIONS), (v) => {
        patch({ action: v === 'none' ? null : v });
        actionNote.textContent = ACTIONS[v].description;
      }, ACTIONS),
    ),
    actionNote,
  );
}

function coreSection(): HTMLElement {
  const core = normalizeCore(spec.core ?? 'calm');
  const state = core.state ?? 'calm';
  const intensity = core.intensity ?? 1;
  const meaning = h('p', { class: 'note' }, CORE_STATES[state]?.meaning ?? '');
  const cur = { state, intensity };
  const [range, out] = slider(intensity, 0, 1.5, 0.05, (v) => {
    cur.intensity = v;
    patch({ core: { ...cur } });
  });
  return section(
    'Human Core',
    row('State', select(state, Object.keys(CORE_STATES), (v) => {
      cur.state = v;
      meaning.textContent = CORE_STATES[v].meaning;
      patch({ core: { ...cur } });
    }, CORE_STATES)),
    row('Intensity', range, out),
    meaning,
  );
}

function orbitSection(): HTMLElement {
  const items: OrbitItemSpec[] = (spec.orbit ?? []).map(normalizeOrbitItem);
  const list = h('div');
  const commit = () => patch({ orbit: items.map((i) => ({ ...i })) });
  const render = () => {
    list.replaceChildren(
      ...items.map((it, idx) => {
        const kids: Node[] = [
          select(it.type, THOUGHT_TYPES, (v) => {
            it.type = v;
            commit();
            render();
          }),
          select(it.behavior ?? 'orbit', [...BEHAVIORS], (v) => {
            it.behavior = v as Behavior;
            commit();
          }),
        ];
        if (it.type === 'word' || it.type === 'number') {
          const input = h('input', {
            type: 'text', value: it.text ?? '', placeholder: 'text', style: 'width:60px;flex:none',
            onchange: () => {
              it.text = input.value || undefined;
              commit();
            },
          });
          kids.push(input);
        }
        kids.push(h('button', { class: 'icon', title: 'Remove', onclick: () => { items.splice(idx, 1); commit(); render(); } }, '×'));
        return h('div', { class: 'row' }, ...kids);
      }),
    );
  };
  render();
  return section(
    'Thought orbit',
    list,
    h(
      'div',
      { class: 'chips' },
      h('button', { onclick: () => { items.push({ type: 'question', behavior: 'orbit' }); commit(); render(); } }, '+ Add thought'),
      h('button', { onclick: () => { items.length = 0; commit(); render(); } }, 'Clear'),
    ),
  );
}

function creaturesSection(): HTMLElement {
  const list: CreatureSpec[] = normalizeCreatures(spec.creatures ?? []);
  const rows = h('div');
  const chips = h('div', { class: 'chips' });
  const commit = () => patch({ creatures: list.map((c) => ({ ...c })) });
  const render = () => {
    chips.replaceChildren(
      ...Object.entries(CREATURES).map(([kind, def]) => {
        const on = list.some((c) => c.kind === kind);
        return h('button', {
          class: on ? 'on' : '',
          onclick: () => {
            const i = list.findIndex((c) => c.kind === kind);
            if (i >= 0) list.splice(i, 1);
            else list.push({ kind, balance: 0 });
            commit();
            render();
          },
        }, def.label);
      }),
    );
    rows.replaceChildren(
      ...list.map((c) => {
        const def = CREATURES[c.kind];
        const note = h('p', { class: 'note' });
        const describe = (b: number) => {
          note.textContent = b >= 0 ? `Helpful: ${def.roles.helpful}` : `Harmful: ${def.roles.harmful}`;
        };
        describe(c.balance ?? 0);
        const [r, out] = slider(c.balance ?? 0, -1, 1, 0.05, (v) => {
          c.balance = v;
          describe(v);
          commit();
        });
        return h('div', { class: 'creature-row' }, row(def?.label ?? c.kind, h('span', { class: 'note' }, 'harm'), r, h('span', { class: 'note' }, 'help'), out), note);
      }),
    );
  };
  render();
  return section('Mental creatures', chips, rows);
}

function sceneSection(): HTMLElement {
  const camMode = typeof spec.camera === 'string' ? spec.camera : spec.camera?.mode ?? 'wide';
  const [speed, speedOut] = slider(stage.clock.speed, 0, 3, 0.05, (v) => (stage.clock.speed = v));
  const pause = h('button', {
    class: stage.clock.paused ? 'on' : '',
    onclick: () => {
      stage.clock.paused = !stage.clock.paused;
      pause.className = stage.clock.paused ? 'on' : '';
    },
  }, 'Pause');
  const toggle = (label: string, get: () => boolean, set: (v: boolean) => void) => {
    const b: HTMLButtonElement = h('button', { class: get() ? 'on' : '', onclick: () => { set(!get()); b.className = get() ? 'on' : ''; } }, label);
    return b;
  };
  return section(
    'Scene',
    row('Background', select(spec.background ?? 'paper', Object.keys(BACKGROUNDS), (v) => patch({ background: v }), BACKGROUNDS)),
    row('Camera', select(camMode, [...CAMERA_MODES], (v) => patch({ camera: v }))),
    row('Speed', speed, speedOut),
    h(
      'div',
      { class: 'chips' },
      pause,
      h('button', { onclick: () => stage.clock.step(1) }, 'Step frame'),
      toggle('Silhouette', () => stage.svg.classList.contains('silhouette'), (v) => stage.svg.classList.toggle('silhouette', v)),
      toggle('Orbit guide', () => stage.scene.main?.orbit.showGuide ?? false, (v) => {
        for (const c of stage.scene.characters.values()) c.orbit.showGuide = v;
      }),
      h('button', { onclick: downloadFrame }, 'Save SVG frame'),
    ),
    h('p', { class: 'note' }, 'Space = pause · → = step one frame'),
  );
}

function paramsSection(): HTMLElement {
  const params: ParamPatch = { ...(spec.params ?? {}) };
  const body = h('div');
  const groups: Array<[string, (k: string) => boolean]> = [
    ['Eyes & gaze', (k) => k.startsWith('eye') || k.startsWith('look')],
    ['Mouth & face', (k) => k.startsWith('mouth') || k === 'blush' || k.startsWith('head')],
    ['Body', (k) => ['squash', 'stretch', 'lean', 'bodyDrop', 'slump', 'puff'].includes(k)],
    ['Arms', (k) => k.startsWith('arm')],
    ['Legs', (k) => k.startsWith('leg')],
    ['Life', (k) => ['breathRate', 'breathDepth', 'energy', 'tremble', 'bounce'].includes(k)],
  ];
  for (const [title, test] of groups) {
    body.append(h('div', { class: 'group' }, title));
    for (const key of PARAM_KEYS.filter(test)) {
      const [min, max] = PARAM_RANGES[key];
      const [r, out] = slider(params[key] ?? PARAM_DEFAULTS[key], min, max, (max - min) / 200, (v) => {
        params[key] = v;
        patch({ params: { ...params } });
      });
      body.append(row(key, r, out));
    }
  }
  return h(
    'section',
    {},
    h(
      'details',
      {},
      h('summary', {}, 'Fine-tune raw parameters'),
      h('p', { class: 'note' }, 'Overrides win over emotion and pose. Everything HUMI does is these numbers.'),
      h('button', { onclick: () => { patch({ params: undefined }); stage.scene.main?.setParams({}); buildPanel(); } }, 'Reset overrides'),
      body,
    ),
  );
}

function downloadFrame(): void {
  const blob = new Blob([stage.snapshot()], { type: 'image/svg+xml' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `humi-frame-${Date.now()}.svg` });
  a.click();
  URL.revokeObjectURL(a.href);
}

window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    stage.clock.paused = !stage.clock.paused;
    buildPanel();
  } else if (e.code === 'ArrowRight') {
    stage.clock.step(1);
  }
});

buildPanel();
refreshJson();

// Expose for console experiments and automated checks.
(window as unknown as Record<string, unknown>).humi = { stage, load, PRESETS, STORIES };
