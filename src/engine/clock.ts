// Scene time is decoupled from wall time: speed scales it, pause freezes it,
// and step() advances exact frames. Video export just feeds fixed dt values.

export class Clock {
  speed = 1;
  paused = false;
  time = 0;
  private pending = 0;

  /** Convert a real elapsed duration into scene dt. */
  tick(realDt: number): number {
    let dt = this.paused ? 0 : Math.min(realDt, 1 / 15) * this.speed;
    if (this.pending) {
      dt += this.pending;
      this.pending = 0;
    }
    this.time += dt;
    return dt;
  }

  /** Queue an exact advance (used while paused for frame stepping). */
  step(frames = 1, fps = 60): void {
    this.pending += frames / fps;
  }
}
