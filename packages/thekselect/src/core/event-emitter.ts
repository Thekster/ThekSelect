import { ThekSelectEvent, ThekSelectEventPayloadMap, ThekSelectOption } from './types.js';

export class ThekSelectEventEmitter<T extends object = ThekSelectOption> {
  private listeners: Map<
    string,
    Set<(payload: ThekSelectEventPayloadMap<T>[ThekSelectEvent]) => void>
  > = new Map();

  on<K extends ThekSelectEvent>(
    event: K,
    callback: (payload: ThekSelectEventPayloadMap<T>[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    const cb = callback as (payload: ThekSelectEventPayloadMap<T>[ThekSelectEvent]) => void;
    set.add(cb);
    return () => this.off(event, callback);
  }

  off<K extends ThekSelectEvent>(
    event: K,
    callback: (payload: ThekSelectEventPayloadMap<T>[K]) => void
  ): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    const cb = callback as (payload: ThekSelectEventPayloadMap<T>[ThekSelectEvent]) => void;
    callbacks.delete(cb);
    if (callbacks.size === 0) {
      this.listeners.delete(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  emit<K extends ThekSelectEvent>(event: K, data: ThekSelectEventPayloadMap<T>[K]): void {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event)!.forEach((listener) => {
      listener(data);
    });
  }
}
