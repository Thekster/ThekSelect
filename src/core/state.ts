import { ThekSelectState } from './types.js';

export type StateListener<T> = (state: T) => void;

export class StateManager<T extends object> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  getState(): T {
    return { ...this.state };
  }

  setState(newState: Partial<T>): void {
    const oldState = this.state;
    this.state = { ...this.state, ...newState };

    // Simple check if state changed (shallow)
    const hasChanged = Object.keys(newState).some(
      (key) => (newState as any)[key] !== (oldState as any)[key]
    );

    if (hasChanged) {
      this.notify();
    }
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }
}
