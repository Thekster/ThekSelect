export type StateListener<T> = (state: Readonly<T>) => void;

export class StateManager<T extends object> {
  private state: T;
  private listeners: Set<StateListener<T>> = new Set();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  getState(): Readonly<T> {
    return Object.freeze({ ...this.state });
  }

  setState(newState: Partial<T>): void {
    const oldState = this.state;
    this.state = { ...this.state, ...newState };

    const hasChanged = Object.keys(newState).some((key) => {
      const val = (newState as Record<string, unknown>)[key];
      const oldVal = (oldState as Record<string, unknown>)[key];
      if (Array.isArray(val) && Array.isArray(oldVal)) {
        return val.length !== oldVal.length || val.some((item, index) => item !== oldVal[index]);
      }
      return val !== oldVal;
    });

    if (hasChanged) {
      this.notify();
    }
  }

  subscribe(listener: StateListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Force all subscribers to re-run regardless of state changes. Used when config mutates. */
  forceNotify(): void {
    this.notify();
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }
}
