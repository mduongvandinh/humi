import { hash1, r2 } from '../engine/math';
import { ACCENT, FONT } from '../engine/palette';
import { Spring } from '../engine/spring';
import { DefsBank, setAttrs, svg, uid } from '../engine/svg';

export interface CamView {
  x: number;
  y: number;
  zoom: number;
}

type Updater = (t: number) => void;

interface BgDef {
  label: string;
  dark: boolean;
  build(g: SVGGElement, defs: DefsBank, W: number, H: number): Updater | void;
}

// Background gradients live in a <defs> inside the background's own group,
// so they are removed together with it on a cross-fade.
const localDefs = (g: SVGGElement): SVGDefsElement =>
  (g.querySelector(':scope > defs') as SVGDefsElement | null) ?? svg('defs', {}, g);

function linear(host: SVGGElement, stops: Array<[number, string]>, vertical = true): string {
  const id = uid('bg');
  const g = svg('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 }, localDefs(host));
  for (const [o, c] of stops) svg('stop', { offset: `${o}%`, 'stop-color': c }, g);
  return `url(#${id})`;
}

function radial(host: SVGGElement, stops: Array<[number, string, number?]>, cx = '50%', cy = '50%', r = '75%'): string {
  const id = uid('bg');
  const g = svg('radialGradient', { id, cx, cy, r }, localDefs(host));
  for (const [o, c, op] of stops) svg('stop', { offset: `${o}%`, 'stop-color': c, 'stop-opacity': op ?? 1 }, g);
  return `url(#${id})`;
}

export const BACKGROUNDS: Record<string, BgDef> = {
  paper: {
    label: 'Paper',
    dark: false,
    build(g, _defs, W, H) {
      svg('rect', { width: W, height: H, fill: '#F7F3EC' }, g);
      const pid = uid('dots');
      const pat = svg('pattern', { id: pid, width: 28, height: 28, patternUnits: 'userSpaceOnUse' }, localDefs(g));
      svg('circle', { cx: 14, cy: 14, r: 1.3, fill: '#E2D9CB' }, pat);
      svg('rect', { width: W, height: H, fill: `url(#${pid})` }, g);
      svg('rect', { width: W, height: H, fill: radial(g, [[60, '#F7F3EC', 0], [100, '#E9E1D3', 0.9]]) }, g);
    },
  },
  studio: {
    label: 'Studio',
    dark: false,
    build(g, _defs, W, H) {
      svg('rect', { width: W, height: H, fill: linear(g, [[0, '#F6F3FC'], [100, '#ECE7F6']]) }, g);
    },
  },
  dawn: {
    label: 'Dawn',
    dark: false,
    build(g, defs, W, H) {
      svg('rect', { width: W, height: H, fill: linear(g, [[0, '#E4DCFF'], [55, '#FBE3EA'], [100, '#FFE8D6']]) }, g);
      svg('circle', { cx: W * 0.74, cy: H * 0.36, r: 180, fill: defs.glow('#FFD9A8') }, g);
      svg('circle', { cx: W * 0.74, cy: H * 0.36, r: 54, fill: '#FFF1DC' }, g);
      const clouds = [0, 1, 2].map((i) =>
        svg('ellipse', { cx: 0, cy: 0, rx: 90 + i * 30, ry: 18 + i * 4, fill: '#FFFFFF', opacity: 0.55 }, g),
      );
      return (t) =>
        clouds.forEach((c, i) => {
          const x = ((t * (6 + i * 3) + i * 500) % (W + 400)) - 200;
          setAttrs(c, { cx: x, cy: 120 + i * 70 });
        });
    },
  },
  night: {
    label: 'Night',
    dark: true,
    build(g, _defs, W, H) {
      svg('rect', { width: W, height: H, fill: linear(g, [[0, '#121430'], [100, '#2C2552']]) }, g);
      const stars = Array.from({ length: 70 }, (_, i) =>
        svg('circle', { cx: hash1(i * 3.1) * W, cy: hash1(i * 7.7) * H * 0.85, r: 0.6 + hash1(i * 1.3) * 1.6, fill: '#FFFFFF' }, g),
      );
      return (t) =>
        stars.forEach((s, i) => {
          const tw = 0.5 + 0.5 * Math.sin(t * (0.6 + hash1(i) * 1.6) + i);
          s.setAttribute('opacity', String(r2(0.35 + 0.65 * tw)));
        });
    },
  },
  void: {
    label: 'Inner void',
    dark: true,
    build(g, _defs, W, H) {
      svg('rect', { width: W, height: H, fill: radial(g, [[0, '#2E2650'], [100, '#0D0A1A']], '50%', '55%', '70%') }, g);
      const dust = Array.from({ length: 26 }, (_, i) =>
        svg('circle', { r: 1 + hash1(i * 5.3) * 2, fill: '#B8A9FF', opacity: 0.25 + hash1(i * 2.2) * 0.35 }, g),
      );
      return (t) =>
        dust.forEach((d, i) => {
          const x = (hash1(i * 3.7) * W + t * (4 + hash1(i) * 8)) % W;
          const y = (hash1(i * 9.1) * H - t * (3 + hash1(i * 2) * 6) + H * 10) % H;
          setAttrs(d, { cx: x, cy: y });
        });
    },
  },
  mind: {
    label: 'Inside the mind',
    dark: false,
    build(g, _defs, W, H) {
      svg('rect', { width: W, height: H, fill: radial(g, [[0, '#F4EFFF'], [100, '#DCD2FA']], '50%', '45%', '80%') }, g);
      const rings = [140, 230, 330, 450].map((r, i) =>
        svg('circle', { cx: W / 2, cy: H * 0.42, r, fill: 'none', stroke: ACCENT.violet, 'stroke-width': 1.4, 'stroke-dasharray': `${4 + i * 2} ${10 + i * 4}`, opacity: 0.22 }, g),
      );
      return (t) =>
        rings.forEach((c, i) => c.setAttribute('transform', `rotate(${r2(t * (i % 2 ? -4 : 3) * (1 + i * 0.3))} ${W / 2} ${H * 0.42})`));
    },
  },
  blueprint: {
    label: 'Blueprint',
    dark: true,
    build(g, _defs, W, H) {
      svg('rect', { width: W, height: H, fill: '#1E4C88' }, g);
      const pid = uid('grid');
      const pat = svg('pattern', { id: pid, width: 40, height: 40, patternUnits: 'userSpaceOnUse' }, localDefs(g));
      svg('path', { d: 'M40,0L0,0L0,40', fill: 'none', stroke: '#2F66AA', 'stroke-width': 1 }, pat);
      svg('rect', { width: W, height: H, fill: `url(#${pid})` }, g);
      const label = svg('text', { x: 32, y: H - 30, fill: '#9FC2EE', 'font-size': 14, 'font-weight': 700, 'letter-spacing': 2, class: 'thought-text', 'font-family': FONT }, g);
      label.textContent = 'HUMAN WIKI · FIG. 1';
    },
  },
  none: { label: 'Transparent', dark: false, build() {} },
};

export const BACKGROUND_NAMES = Object.keys(BACKGROUNDS);

interface Layer {
  name: string;
  g: SVGGElement;
  fade: Spring;
  update?: Updater;
}

/** Background with cross-fades and a whisper of camera parallax. */
export class BackgroundLayer {
  private layers: Layer[] = [];
  private t = 0;
  name = '';

  constructor(
    private readonly root: SVGGElement,
    private readonly defs: DefsBank,
    private readonly W: number,
    private readonly H: number,
  ) {}

  get dark(): boolean {
    return BACKGROUNDS[this.name]?.dark ?? false;
  }

  reset(): void {
    this.t = 0;
  }

  set(name: string, instant = false): void {
    if (!BACKGROUNDS[name] || name === this.name) return;
    this.name = name;
    const g = svg('g', { class: `bg bg-${name}` }, this.root);
    const update = BACKGROUNDS[name].build(g, this.defs, this.W, this.H) ?? undefined;
    const fade = new Spring(instant ? 1 : 0, { k: 30, zeta: 1 });
    fade.target = 1;
    for (const l of this.layers) l.fade.target = 0;
    this.layers.push({ name, g, fade, update });
    if (instant) {
      for (const l of this.layers.slice(0, -1)) l.g.remove();
      this.layers = this.layers.slice(-1);
    }
  }

  update(dt: number, cam: CamView): void {
    this.t += dt;
    const px = -(cam.x - this.W / 2) * 0.04;
    const py = -(cam.y - this.H / 2) * 0.04;
    const s = 1 + (cam.zoom - 1) * 0.04;
    const tr = `translate(${r2(this.W / 2 + px)} ${r2(this.H / 2 + py)}) scale(${r2(s)}) translate(${-this.W / 2} ${-this.H / 2})`;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i];
      l.fade.step(dt);
      l.update?.(this.t);
      setAttrs(l.g, { opacity: Math.max(0, Math.min(1, l.fade.value)), transform: tr });
      if (l.fade.target === 0 && l.fade.value < 0.01) {
        l.g.remove();
        this.layers.splice(i, 1);
      }
    }
  }
}
