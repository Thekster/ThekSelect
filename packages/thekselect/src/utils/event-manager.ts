type EventCallback = (e: unknown) => void;

class GlobalEventManager {
  private static instance: GlobalEventManager;
  private resizeListeners: Set<EventCallback> = new Set();
  private scrollListeners: Set<EventCallback> = new Set();
  private clickListeners: Set<EventCallback> = new Set();
  private attached = false;

  // Stable bound references required for removeEventListener to match addEventListener.
  private readonly boundResize = (e: Event) => this.notify(this.resizeListeners, e);
  private readonly boundScroll = (e: Event) => this.notify(this.scrollListeners, e);
  private readonly boundClick = (e: Event) => this.notify(this.clickListeners, e);

  private constructor() {}

  public static getInstance(): GlobalEventManager {
    if (!GlobalEventManager.instance) {
      GlobalEventManager.instance = new GlobalEventManager();
    }
    return GlobalEventManager.instance;
  }

  private attach(): void {
    if (this.attached || typeof window === 'undefined') return;
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('scroll', this.boundScroll, true);
    document.addEventListener('click', this.boundClick);
    this.attached = true;
  }

  private detachIfEmpty(): void {
    if (!this.attached || typeof window === 'undefined') return;
    if (
      this.resizeListeners.size === 0 &&
      this.scrollListeners.size === 0 &&
      this.clickListeners.size === 0
    ) {
      window.removeEventListener('resize', this.boundResize);
      window.removeEventListener('scroll', this.boundScroll, true);
      document.removeEventListener('click', this.boundClick);
      this.attached = false;
    }
  }

  private notify(listeners: Set<EventCallback>, event: unknown): void {
    listeners.forEach((callback) => callback(event));
  }

  public onResize(callback: EventCallback): () => void {
    this.attach();
    this.resizeListeners.add(callback);
    return () => {
      this.resizeListeners.delete(callback);
      this.detachIfEmpty();
    };
  }

  public onScroll(callback: EventCallback): () => void {
    this.attach();
    this.scrollListeners.add(callback);
    return () => {
      this.scrollListeners.delete(callback);
      this.detachIfEmpty();
    };
  }

  public onClick(callback: EventCallback): () => void {
    this.attach();
    this.clickListeners.add(callback);
    return () => {
      this.clickListeners.delete(callback);
      this.detachIfEmpty();
    };
  }
}

export const globalEventManager = GlobalEventManager.getInstance();
