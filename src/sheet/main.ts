// The model sheet: the HUMI visual language on one page, rendered live by
// the engine itself (so the sheet can never drift from the code).
import '../playground/playground.css';
import './sheet.css';
import {
  BEHAVIORS,
  CORE_STATES,
  CREATURES,
  EXPRESSIONS,
  POSES,
  Stage,
  THOUGHT_TYPES,
  type SceneSpec,
} from '../index';

interface Cell {
  stage: Stage;
  visible: boolean;
}

const cells: Cell[] = [];
const root = document.getElementById('sheet')!;

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const cell = cells.find((c) => c.stage.svg === e.target);
    if (cell) cell.visible = e.isIntersecting;
  }
});

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function section(title: string, intro: string): HTMLElement {
  const s = el('section', 'sheet-section');
  s.append(el('h2', '', title), el('p', 'intro', intro));
  const grid = el('div', 'grid');
  s.append(grid);
  root.append(s);
  return grid;
}

function cell(grid: HTMLElement, label: string, sub: string, spec: SceneSpec, size: [number, number] = [320, 320]): Stage {
  const fig = el('figure');
  const holder = el('div', 'cell');
  fig.append(holder);
  const cap = el('figcaption');
  cap.append(el('strong', '', label));
  if (sub) cap.append(el('span', '', sub));
  fig.append(cap);
  grid.append(fig);
  const stage = new Stage(holder, { width: size[0], height: size[1], groundY: size[1] - 34 });
  stage.scene.load({ background: 'studio', size: 1.05, ...spec });
  io.observe(stage.svg);
  cells.push({ stage, visible: false });
  return stage;
}

// ---------- header ----------
const head = el('header', 'sheet-head');
head.append(
  el('h1', '', 'HUMI — model sheet'),
  el(
    'p',
    '',
    'A tiny, soft, abstract humanoid representing every human being. Pale non-skin body, oversized round head, bean body, noodle limbs, two dot eyes, one line mouth, a glowing Core. No nose, no fingers, no hair, no gender, no age.',
  ),
);
const back = el('a', '', '← Playground');
back.href = './index.html';
head.append(back);
root.append(head);

// ---------- identity ----------
const id = section('Identity', 'Recognisable from silhouette alone. Every HUMI has a seeded, slightly different organic outline — same species, different person.');
cell(id, 'HUMI', 'pearl (default)', { expression: 'happy' });
cell(id, 'Silhouette', 'the readability test', { expression: 'neutral', pose: 'waving' }).svg.classList.add('silhouette');
for (const [tint, seed] of [['mint', 11], ['sky', 23], ['butter', 37], ['lilac', 51]] as const) {
  cell(id, tint, `seed ${seed}`, { expression: 'neutral', tint, seed });
}

// ---------- expressions ----------
const ex = section('Expressions', 'Feelings come from eye spacing, scale, direction, a curve of the mouth, and how the body holds itself — not from a facial rig.');
for (const [name, def] of Object.entries(EXPRESSIONS)) {
  cell(ex, def.label, name, { expression: name, camera: { mode: 'medium', zoom: 1.45 } });
}

// ---------- poses ----------
const po = section('Poses', 'Poses own the noodle limbs. Cyclic poses (walking, waving, dancing) cross-fade, so changes never pop.');
for (const [name, def] of Object.entries(POSES)) {
  cell(po, def.label, name, { pose: name, expression: name === 'hiding_eyes' ? 'shy' : 'neutral' });
}

// ---------- core ----------
const co = section('The Human Core', 'The light in the chest is the internal state of the person — the strongest recurring metaphor of the universe.');
for (const [name, def] of Object.entries(CORE_STATES)) {
  cell(co, def.label, def.meaning, { core: { state: name, intensity: 1 }, background: 'void', camera: { mode: 'core', zoom: 3.2 } });
}

// ---------- creatures ----------
const cr = section('Mental creatures', 'Not villains: useful human mechanisms. Each one has a helpful and a harmful form; balance blends between them.');
for (const [kind, def] of Object.entries(CREATURES)) {
  cell(cr, `${def.label} · helpful`, def.roles.helpful, { character: 'none', creatures: [{ kind, balance: 1 }] }, [240, 240]);
  cell(cr, `${def.label} · harmful`, def.roles.harmful, { character: 'none', creatures: [{ kind, balance: -1 }], background: 'paper' }, [240, 240]);
}

// ---------- orbit ----------
const ob = section('Thought orbit — objects', 'Thoughts orbit an invisible ring around the head: behind the head they are occluded, in front they pass over.');
for (const type of THOUGHT_TYPES) {
  cell(ob, type, '', { expression: 'curious', orbit: [{ type }, { type }, { type }], camera: { mode: 'orbit', zoom: 0.95 } }, [280, 240]);
}
const bh = section('Thought orbit — behaviours', 'Every behaviour is a pure function of time, so scenes replay identically.');
const demo: Record<string, string[]> = {
  collide: ['word', 'memory'],
  connect: ['idea', 'star', 'shape'],
  transform: ['question'],
  multiply: ['question'],
  enter: ['particle', 'idea'],
  leave: ['memory', 'word'],
};
for (const b of BEHAVIORS) {
  const types = demo[b] ?? ['question', 'idea', 'star'];
  cell(bh, b, '', { expression: 'curious', orbit: types.map((type) => ({ type, behavior: b })), camera: { mode: 'orbit', zoom: 0.95 } }, [280, 240]);
}

// ---------- one loop for all cells ----------
const sheet = { paused: false };
(window as unknown as Record<string, unknown>).sheet = sheet;
let last = 0;
function frame(now: number) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 15) : 0;
  last = now;
  if (!sheet.paused) for (const c of cells) if (c.visible) c.stage.tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
