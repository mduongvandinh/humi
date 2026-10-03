// Tiny SVG DOM helpers. Components create their nodes once and then only
// mutate attributes each frame — no re-mounting, no virtual DOM.

export const SVG_NS = 'http://www.w3.org/2000/svg';

export type Attrs = Record<string, string | number | null | undefined>;

const num = (v: number): string => String(Math.round(v * 100) / 100);

export function setAttrs(e: Element, attrs: Attrs): void {
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null) e.removeAttribute(k);
    else e.setAttribute(k, typeof v === 'number' ? num(v) : v);
  }
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element | null,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  setAttrs(e, attrs);
  if (parent) parent.appendChild(e);
  return e;
}

/** SVG transform string: translate → rotate (radians) → scale. */
export function tf(x: number, y: number, rot = 0, sx = 1, sy = sx): string {
  let s = `translate(${num(x)} ${num(y)})`;
  if (rot) s += ` rotate(${num((rot * 180) / Math.PI)})`;
  if (sx !== 1 || sy !== 1) s += ` scale(${num(sx)} ${num(sy)})`;
  return s;
}

let counter = 0;
export const uid = (prefix: string): string => `${prefix}-${++counter}`;

/**
 * Per-scene gradient cache. Scenes never share ids, so several stages can
 * live on the same page (see the model sheet).
 */
export class DefsBank {
  private cache = new Map<string, string>();
  constructor(readonly el: SVGDefsElement) {}

  /** Soft radial glow: color at the centre fading to transparent. */
  glow(color: string): string {
    const key = `glow:${color}`;
    let ref = this.cache.get(key);
    if (!ref) {
      const id = uid('glow');
      const g = svg('radialGradient', { id }, this.el);
      svg('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0.85 }, g);
      svg('stop', { offset: '45%', 'stop-color': color, 'stop-opacity': 0.3 }, g);
      svg('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }, g);
      ref = `url(#${id})`;
      this.cache.set(key, ref);
    }
    return ref;
  }

  /** Soft body shading: light top-left to a darker rim. */
  shade(fill: string, shade: string): string {
    const key = `shade:${fill}:${shade}`;
    let ref = this.cache.get(key);
    if (!ref) {
      const id = uid('shade');
      const g = svg('radialGradient', { id, cx: '38%', cy: '30%', r: '78%' }, this.el);
      svg('stop', { offset: '0%', 'stop-color': '#ffffff' }, g);
      svg('stop', { offset: '35%', 'stop-color': fill }, g);
      svg('stop', { offset: '100%', 'stop-color': shade }, g);
      ref = `url(#${id})`;
      this.cache.set(key, ref);
    }
    return ref;
  }
}
