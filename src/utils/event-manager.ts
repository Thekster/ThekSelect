type EventCallback = (e: unknown) => void;

class GlobalEventManager {
  private static instance: GlobalEventManager;
  private resizeListeners: Set<EventCallback> = new Set();
  private scrollListeners: Set<EventCallback> = new Set();
  private clickListeners: Set<EventCallback> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', (e) => this.notify(this.resizeListeners, e));
      window.addEventListener('scroll', (e) => this.notify(this.scrollListeners, e), true);
      document.addEventListener('click', (e) => this.notify(this.clickListeners, e));
    }
  }

  public static getInstance(): GlobalEventManager {
    if (!GlobalEventManager.instance) {
      GlobalEventManager.instance = new GlobalEventManager();
    }
    return GlobalEventManager.instance;
  }

  private notify(listeners: Set<EventCallback>, event: unknown): void {
    listeners.forEach((callback) => callback(event));
  }

  public onResize(callback: EventCallback): () => void {
    this.resizeListeners.add(callback);
    return () => this.resizeListeners.delete(callback);
  }

  public onScroll(callback: EventCallback): () => void {
    this.scrollListeners.add(callback);
    return () => this.scrollListeners.delete(callback);
  }

  public onClick(callback: EventCallback): () => void {
    this.clickListeners.add(callback);
    return () => this.clickListeners.delete(callback);
  }
}

export const globalEventManager = GlobalEventManager.getInstance();
