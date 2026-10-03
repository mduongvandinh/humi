import { fbm, r2 } from '../engine/math';
import { Spring } from '../engine/spring';
import type { CamView } from './backgrounds';
import type { Scene } from './Scene';
import type { CameraSpec } from './types';

export const CAMERA_MODES = ['wide', 'medium', 'closeup', 'orbit', 'core', 'follow'] as const;

/**
 * Eased virtual camera. Modes frame a character (or its head, Core, orbit);
 * explicit x / y / zoom override the mode. A small hand-held drift keeps the
 * frame alive, like everything else in the universe.
 */
export class CameraController {
  private x: Spring;
  private y: Spring;
  private zoom: Spring;
  private spec: CameraSpec = { mode: 'wide' };
  private t = 0;
  private snapNext = true;
  view: CamView;

  constructor(
    private readonly world: SVGGElement,
    private readonly W: number,
    private readonly H: number,
  ) {
    this.x = new Spring(W / 2, { k: 14, zeta: 1 });
    this.y = new Spring(H / 2, { k: 14, zeta: 1 });
    this.zoom = new Spring(1, { k: 12, zeta: 1 });
    this.view = { x: W / 2, y: H / 2, zoom: 1 };
  }

  reset(): void {
    this.t = 0;
    this.snapNext = true;
  }

  set(spec: string | CameraSpec, instant = false): void {
    this.spec = typeof spec === 'string' ? { mode: spec } : { mode: 'wide', ...spec };
    this.snapNext = instant;
  }

  private target(scene: Scene): [number, number, number] {
    const s = this.spec;
    const ch = scene.characters.get(s.target ?? 'humi') ?? scene.characters.values().next().value;
    let tx = this.W / 2;
    let ty = this.H / 2;
    let z = 1;
    if (ch) {
      const sz = ch.size / 1.6;
      switch (s.mode) {
        case 'medium': {
          const c = ch.anchor('core');
          [tx, ty, z] = [c[0], c[1] - 40 * sz, 1.55 / sz];
          // Several characters and no explicit target: frame the whole group.
          if (!s.target && scene.characters.size > 1) {
            const xs = [...scene.characters.values()].map((k) => k.worldX);
            const spread = Math.max(...xs) - Math.min(...xs);
            tx = (Math.max(...xs) + Math.min(...xs)) / 2;
            z = Math.min(z, (this.W * 0.85) / (spread + 320 * sz));
          }
          break;
        }
        case 'closeup': {
          const h = ch.anchor('head');
          [tx, ty, z] = [h[0], h[1] + 4, 2.7 / sz];
          break;
        }
        case 'orbit': {
          const o = ch.anchor('orbit');
          [tx, ty, z] = [o[0], o[1] + 45 * sz, 1.5 / sz];
          break;
        }
        case 'core': {
          const c = ch.anchor('core');
          [tx, ty, z] = [c[0], c[1], 3 / sz];
          break;
        }
        case 'follow':
          [tx, ty, z] = [ch.worldX, this.H / 2 - 10, 1.2];
          break;
      }
    }
    return [s.x ?? tx, s.y ?? ty, s.zoom ?? z];
  }

  update(dt: number, scene: Scene): void {
    this.t += dt;
    const [tx, ty, tz] = this.target(scene);
    if (this.snapNext) {
      this.x.snap(tx);
      this.y.snap(ty);
      this.zoom.snap(tz);
      this.snapNext = false;
    } else {
      this.x.step(dt, tx);
      this.y.step(dt, ty);
      this.zoom.step(dt, tz);
    }
    const d = this.spec.drift ?? 0.4;
    const z = this.zoom.value * (1 + fbm(this.t * 0.1, 91) * 0.01 * d);
    const x = this.x.value + (fbm(this.t * 0.2, 71) * 6 * d) / z;
    const y = this.y.value + (fbm(this.t * 0.17, 81) * 4 * d) / z;
    this.view = { x, y, zoom: z };
    this.world.setAttribute(
      'transform',
      `translate(${this.W / 2} ${this.H / 2}) scale(${r2(z * 1000) / 1000}) translate(${r2(-x)} ${r2(-y)})`,
    );
  }
}
