/**
 * Event Bus decoupling UI simulator and external agent stream
 */
export class SuperpowersEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    return () => {
      const set = this.listeners.get(eventName);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(eventName);
        }
      }
    };
  }

  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${eventName}:`, err);
        }
      });
    }
    // Also dispatch native CustomEvent on window for external listeners
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
      } catch (err) {
        console.error(`[EventBus] Error dispatching CustomEvent for ${eventName}:`, err);
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const eventBus = new SuperpowersEventBus();
if (typeof window !== 'undefined') {
  window.SuperpowersEventBus = eventBus;
}
