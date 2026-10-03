import type { Scene } from './Scene';
import type { SceneSpec, TimelineEntry } from './types';

/**
 * Plays time-keyed patches against a scene. Each entry is just a partial
 * SceneSpec plus `at`; between entries the springs do the in-betweening.
 */
export class SceneTimeline {
  t = 0;
  readonly duration: number;
  readonly loop: boolean;
  private idx = 0;
  private entries: TimelineEntry[];
  private base: SceneSpec;

  constructor(spec: SceneSpec) {
    const { timeline = [], ...base } = spec;
    this.base = base;
    this.entries = [...timeline].sort((a, b) => a.at - b.at);
    const last = this.entries.length ? this.entries[this.entries.length - 1].at : 0;
    this.duration = spec.duration ?? last + 3;
    this.loop = spec.loop ?? true;
  }

  get progress(): number {
    return this.duration ? Math.min(1, this.t / this.duration) : 0;
  }

  update(dt: number, scene: Scene): void {
    this.t += dt;
    while (this.idx < this.entries.length && this.entries[this.idx].at <= this.t) {
      const { at: _at, ...patch } = this.entries[this.idx++];
      scene.apply(patch);
    }
    if (this.loop && this.t >= this.duration) {
      this.t = 0;
      this.idx = 0;
      scene.apply({ caption: null, ...this.base });
    }
  }
}
