import { ThekSelectEvent } from './types.js';

export class ThekSelectEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: ThekSelectEvent, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: ThekSelectEvent, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.listeners.delete(event);
    }
  }

  emit(event: ThekSelectEvent, data: any): void {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event)!.forEach((listener) => listener(data));
  }
}
