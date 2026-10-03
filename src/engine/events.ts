export class Emitter<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Array<(payload: E[K]) => void> } = {};

  on<K extends keyof E>(type: K, fn: (payload: E[K]) => void): () => void {
    (this.handlers[type] ??= []).push(fn);
    return () => {
      this.handlers[type] = this.handlers[type]?.filter((h) => h !== fn);
    };
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    this.handlers[type]?.forEach((h) => h(payload));
  }
}
