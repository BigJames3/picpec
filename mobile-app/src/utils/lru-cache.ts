/**
 * LRU Cache — Memory-safe for low-end devices
 *
 * Max 20 entries. Evicts least-recently-used when full.
 * Used for preloaded URL tracking (HEAD requests, thumbnails).
 */
const MAX_SIZE = 20;

class LRUCache<K, V> {
  private map = new Map<K, { value: V; at: number }>();

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    entry.at = Date.now();
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.map.size >= MAX_SIZE) {
      const oldest = [...this.map.entries()].sort(
        (a, b) => a[1].at - b[1].at
      )[0];
      if (oldest) this.map.delete(oldest[0]);
    }
    this.map.set(key, { value, at: Date.now() });
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export const preloadCache = new LRUCache<string, boolean>();
