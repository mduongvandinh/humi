import { Clock } from '../engine/clock';
import { svg } from '../engine/svg';
import { Scene, type SceneOptions } from './Scene';
import type { SceneSpec } from './types';

/**
 * A Scene mounted in the page with a clock and a render loop.
 * For video, skip start() and call frames() — it steps fixed dt values from a
 * fresh load, so the same spec always produces the same frames.
 */
export class Stage {
  readonly svg: SVGSVGElement;
  readonly scene: Scene;
  readonly clock = new Clock();
  onFrame?: (dt: number) => void;
  private raf = 0;
  private last = 0;

  constructor(container: HTMLElement, o: SceneOptions = {}) {
    const W = o.width ?? 1280;
    const H = o.height ?? 720;
    this.svg = svg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'humi-stage',
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': 'HUMI scene',
    });
    container.appendChild(this.svg);
    this.scene = new Scene(this.svg, o);
  }

  start(): void {
    if (this.raf) return;
    this.last = 0;
    const loop = (now: number) => {
      const real = this.last ? (now - this.last) / 1000 : 0;
      this.last = now;
      this.tick(real);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Advance by a real-time duration (scaled by clock speed / pause). */
  tick(realDt: number): void {
    const dt = this.clock.tick(realDt) * this.scene.speed;
    this.scene.update(dt);
    this.onFrame?.(dt);
  }

  /** Deterministic frame generator: yields standalone SVG markup per frame. */
  *frames(spec: SceneSpec, seconds: number, fps = 30): Generator<string> {
    this.scene.load(spec);
    const dt = 1 / fps;
    const n = Math.round(seconds * fps);
    for (let i = 0; i < n; i++) {
      this.scene.update(dt);
      yield this.snapshot();
    }
  }

  snapshot(): string {
    return new XMLSerializer().serializeToString(this.svg);
  }
}
