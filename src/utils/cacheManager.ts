import { SafeStorage } from './safeStorage';

export const CacheManager = {
  get: <T>(key: string): T | null => {
    try {
      const item = SafeStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        SafeStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch (e) {
      console.error('Error reading from cache', e);
      return null;
    }
  },

  set: (key: string, value: any, ttlMs: number = 5 * 60 * 1000) => {
    try {
      const item = {
        value,
        expiry: Date.now() + ttlMs,
      };
      SafeStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.error('Error writing to cache', e);
    }
  },

  invalidate: (keyPrefix: string) => {
    try {
      SafeStorage.keys().forEach((key) => {
        if (key.startsWith(keyPrefix)) {
          SafeStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Error invalidating cache', e);
    }
  }
};
