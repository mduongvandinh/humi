// Colour tokens for the HUMI universe. HUMI's body is deliberately a pale,
// non-skin colour (pearl lilac by default) so it never reads as any
// particular ethnicity, age or gender. Ink is a warm near-black violet.

export const INK = '#2A2440';
export const INK_SOFT = '#5B5475';
export const WHITE = '#FFFFFF';
export const BLUSH = '#FF8FA8';

export interface Tint {
  fill: string;
  shade: string;
}

export const TINTS: Record<string, Tint> = {
  pearl: { fill: '#F2EFFC', shade: '#CFC6EE' },
  mint: { fill: '#E5F6F0', shade: '#B4DFD0' },
  sky: { fill: '#E6F0FD', shade: '#B6CEF0' },
  butter: { fill: '#FBF4DC', shade: '#E6D6A2' },
  lilac: { fill: '#EDE4FB', shade: '#C7B5EE' },
};

/** Accent colours shared by thought objects, creatures and backgrounds. */
export const ACCENT = {
  violet: '#7C6BF0',
  sun: '#FFC94D',
  gold: '#FFD166',
  sky: '#7CC7FF',
  teal: '#4FD1B5',
  coral: '#FF7A6B',
  pink: '#FF8FB8',
  ember: '#FF6A3D',
  slate: '#8A87A6',
};

/** Rounded UI font for words in scenes (falls back gracefully when offline). */
export const FONT = "Nunito, ui-rounded, 'Segoe UI', system-ui, sans-serif";
