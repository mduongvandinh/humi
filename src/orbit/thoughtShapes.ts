import { hash1, r2 } from '../engine/math';
import { ACCENT, FONT, INK, WHITE } from '../engine/palette';
import { DefsBank, svg, tf } from '../engine/svg';
import { MentalCreature } from '../creatures/MentalCreature';
import { CREATURES } from '../creatures/creatures';

/** Glyph thought types. Any mental creature kind is also a valid thought type. */
export const GLYPH_TYPES = ['question', 'idea', 'memory', 'shape', 'word', 'number', 'star', 'particle'] as const;
export const THOUGHT_TYPES: string[] = [...GLYPH_TYPES, 'fear', 'doubt', 'worry', 'anger', 'joy', 'ego'];

export interface ThoughtShape {
  el: SVGGElement;
  update(t: number, dt: number): void;
}

export interface ShapeOpts {
  defs: DefsBank;
  seed: number;
  text?: string;
  color?: string;
  emotion?: string;
}

const WORDS = ['why?', 'maybe', 'what if', 'home', 'love', 'later', 'enough', 'me'];
const NUMBERS = ['7', '42', '3', '1', '0', '99', 'π', '∞'];
const STROKE = { stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' };

function star(points: number, outer: number, inner: number): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${r2(Math.cos(a) * r)},${r2(Math.sin(a) * r)}`;
  }
  return d + 'Z';
}

export function createThoughtShape(type: string, o: ShapeOpts): ThoughtShape {
  const el = svg('g', { class: `thought thought-${type}` });
  const inner = svg('g', {}, el);
  const h = hash1(o.seed * 9.1);
  const ph = h * 10;

  // Creature thoughts: a tiny Fear or Doubt circling the head.
  if (!(GLYPH_TYPES as readonly string[]).includes(type) && CREATURES[type]) {
    const c = new MentalCreature(inner, type, { defs: o.defs, seed: o.seed, balance: -0.2 });
    inner.setAttribute('transform', 'scale(0.5)');
    return { el, update: (_t, dt) => c.update(dt) };
  }

  switch (type) {
    case 'question': {
      svg('circle', { r: 13, fill: WHITE, ...STROKE }, inner);
      const c = o.color ?? ACCENT.violet;
      svg('path', { d: 'M-4.2,-4.5C-4.2,-10 5,-10 5,-4.8C5,-1.4 0.4,-1.2 0.4,2.6', fill: 'none', stroke: c, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, inner);
      svg('circle', { cx: 0.4, cy: 7, r: 1.9, fill: c }, inner);
      return { el, update: (t) => inner.setAttribute('transform', `rotate(${r2(Math.sin(t * 2 + ph) * 9)})`) };
    }
    case 'idea': {
      svg('circle', { r: 26, fill: o.defs.glow(o.color ?? ACCENT.sun) }, inner);
      const s = svg('path', { d: 'M0,-13Q2.2,-2.2 13,0Q2.2,2.2 0,13Q-2.2,2.2 -13,0Q-2.2,-2.2 0,-13Z', fill: o.color ?? ACCENT.sun, stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, inner);
      return {
        el,
        update: (t) => s.setAttribute('transform', `rotate(${r2(t * 25 + ph * 30)}) scale(${r2(1 + Math.sin(t * 5 + ph) * 0.1)})`),
      };
    }
    case 'memory': {
      svg('circle', { r: 14.5, fill: o.color ?? ACCENT.sky, 'fill-opacity': 0.28, stroke: '#5FB1E8', 'stroke-width': 2 }, inner);
      const mini = svg('g', { opacity: 0.75 }, inner);
      svg('circle', { cx: 0, cy: -3.5, r: 4.2, fill: '#4D98D6' }, mini);
      svg('ellipse', { cx: 0, cy: 5, rx: 4.4, ry: 5, fill: '#4D98D6' }, mini);
      svg('path', { d: 'M-8.5,-7A10,10 0 0 1 -1,-11.5', fill: 'none', stroke: WHITE, 'stroke-width': 2.2, 'stroke-linecap': 'round' }, inner);
      return { el, update: (t) => mini.setAttribute('transform', tf(Math.sin(t * 1.3 + ph) * 1.5, Math.cos(t * 1.1 + ph) * 1)) };
    }
    case 'shape': {
      const colors = [ACCENT.teal, ACCENT.coral, ACCENT.violet, ACCENT.sun];
      const fill = o.color ?? colors[Math.floor(h * 4) % 4];
      const kind = Math.floor(hash1(o.seed * 3.3) * 4);
      if (kind === 0) svg('path', { d: 'M0,-12L11,8L-11,8Z', fill, ...STROKE }, inner);
      else if (kind === 1) svg('rect', { x: -9, y: -9, width: 18, height: 18, rx: 3, fill, ...STROKE }, inner);
      else if (kind === 2) svg('circle', { r: 10, fill, ...STROKE }, inner);
      else svg('path', { d: star(3, 12, 6), fill, ...STROKE }, inner);
      const dir = h > 0.5 ? 1 : -1;
      return { el, update: (t) => inner.setAttribute('transform', `rotate(${r2(t * 50 * dir + ph * 20)})`) };
    }
    case 'word': {
      const text = o.text ?? WORDS[Math.floor(h * WORDS.length)];
      const w = text.length * 7.4 + 16;
      svg('rect', { x: -w / 2, y: -11, width: w, height: 22, rx: 11, fill: WHITE, ...STROKE }, inner);
      const tx = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5, fill: o.color ?? INK, class: 'thought-text', 'font-family': FONT, 'font-size': 12.5, 'font-weight': 800 }, inner);
      tx.textContent = text;
      return { el, update: (t) => inner.setAttribute('transform', `rotate(${r2(Math.sin(t * 1.5 + ph) * 5)})`) };
    }
    case 'number': {
      const text = o.text ?? NUMBERS[Math.floor(h * NUMBERS.length)];
      svg('circle', { r: 12.5, fill: WHITE, ...STROKE }, inner);
      const tx = svg('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5, fill: o.color ?? ACCENT.violet, class: 'thought-text', 'font-family': FONT, 'font-size': text.length > 2 ? 10 : 13, 'font-weight': 900 }, inner);
      tx.textContent = text;
      return { el, update: (t) => inner.setAttribute('transform', `rotate(${r2(Math.sin(t * 1.7 + ph) * 12)})`) };
    }
    case 'star': {
      svg('circle', { r: 20, fill: o.defs.glow(o.color ?? ACCENT.gold) }, inner);
      const s = svg('path', { d: star(5, 12, 5.4), fill: o.color ?? ACCENT.gold, stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, inner);
      return { el, update: (t) => s.setAttribute('transform', `rotate(${r2(t * 30 + ph * 40)}) scale(${r2(1 + Math.sin(t * 4 + ph) * 0.12)})`) };
    }
    case 'particle':
    default: {
      const emotion = o.emotion ?? ['joy', 'love', 'sad', 'anger', 'calm'][Math.floor(h * 5)];
      const map: Record<string, { color: string; d: string }> = {
        love: { color: ACCENT.pink, d: 'M0,5C-7,0 -7,-6 -3.5,-6C-1.5,-6 0,-4.5 0,-3C0,-4.5 1.5,-6 3.5,-6C7,-6 7,0 0,5Z' },
        sad: { color: ACCENT.sky, d: 'M0,-7C3,-2 5,1 5,3.5A5,5 0 0 1 -5,3.5C-5,1 -3,-2 0,-7Z' },
        joy: { color: ACCENT.sun, d: 'M0,-5A5,5 0 1 1 0,5A5,5 0 1 1 0,-5Z' },
        anger: { color: ACCENT.ember, d: 'M0,-6L4.5,0L0,6L-4.5,0Z' },
        calm: { color: ACCENT.teal, d: 'M0,-4.5A4.5,4.5 0 1 1 0,4.5A4.5,4.5 0 1 1 0,-4.5Z' },
      };
      const m = map[emotion] ?? map.joy;
      const color = o.color ?? m.color;
      svg('circle', { r: 13, fill: o.defs.glow(color) }, inner);
      const p = svg('path', { d: m.d, fill: color, stroke: INK, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, inner);
      return { el, update: (t) => p.setAttribute('transform', `scale(${r2(1 + Math.sin(t * 3 + ph) * 0.12)})`) };
    }
  }
}
