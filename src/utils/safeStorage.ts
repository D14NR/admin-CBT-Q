type StorageValue = string | null;

type MemoryStore = Record<string, string>;

const memoryStore: MemoryStore = {};

const isStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return false;
    }
    const testKey = '__cbtq_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const getStore = () => {
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const SafeStorage = {
  getItem: (key: string): StorageValue => {
    try {
      const store = getStore();
      if (store) return store.getItem(key);
      return memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] ?? null;
    }
  },

  setItem: (key: string, value: string) => {
    try {
      const store = getStore();
      if (store) {
        store.setItem(key, value);
      } else {
        memoryStore[key] = value;
      }
    } catch {
      memoryStore[key] = value;
    }
  },

  removeItem: (key: string) => {
    try {
      const store = getStore();
      if (store) {
        store.removeItem(key);
      } else {
        delete memoryStore[key];
      }
    } catch {
      delete memoryStore[key];
    }
  },

  clear: () => {
    try {
      const store = getStore();
      if (store) {
        store.clear();
      } else {
        Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
      }
    } catch {
      Object.keys(memoryStore).forEach((key) => delete memoryStore[key]);
    }
  },

  keys: (): string[] => {
    try {
      const store = getStore();
      if (store) {
        return Object.keys(store);
      }
      return Object.keys(memoryStore);
    } catch {
      return Object.keys(memoryStore);
    }
  }
};
