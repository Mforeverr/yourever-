import type { StateStorage } from "zustand/middleware"

export interface StorageService {
  getRaw: (key: string) => string | null
  setRaw: (key: string, value: string | null) => void
  get: <T>(key: string, fallback?: T | null) => T | null
  set: <T>(key: string, value: T) => void
  remove: (key: string) => void
  clear: () => void
  clearByPrefix: (prefix: string) => void
  toStorageAdapter: () => StateStorage
}

type StorageDriver = "localStorage" | "sessionStorage"

const getBrowserStorage = (driver: StorageDriver): Storage | null => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window[driver]
  } catch {
    return null
  }
}

const createStorageService = (driver: StorageDriver): StorageService => {
  const memoryFallback = new Map<string, string>()

  const getRaw = (key: string): string | null => {
    const storage = getBrowserStorage(driver)
    if (!storage) {
      return memoryFallback.get(key) ?? null
    }

    try {
      return storage.getItem(key)
    } catch {
      return memoryFallback.get(key) ?? null
    }
  }

  const setRaw = (key: string, value: string | null) => {
    const storage = getBrowserStorage(driver)
    if (!storage) {
      if (value === null) {
        memoryFallback.delete(key)
      } else {
        memoryFallback.set(key, value)
      }
      return
    }

    try {
      if (value === null) {
        storage.removeItem(key)
      } else {
        storage.setItem(key, value)
      }
    } catch {
      if (value === null) {
        memoryFallback.delete(key)
      } else {
        memoryFallback.set(key, value)
      }
    }
  }

  const get = <T>(key: string, fallback: T | null = null): T | null => {
    const raw = getRaw(key)
    if (raw === null) {
      return fallback
    }

    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  const set = <T>(key: string, value: T) => {
    try {
      setRaw(key, JSON.stringify(value))
    } catch {
      // Swallow serialization errors silently
    }
  }

  const remove = (key: string) => {
    setRaw(key, null)
  }

  const clear = () => {
    memoryFallback.clear()
    const storage = getBrowserStorage(driver)
    if (storage) {
      try {
        storage.clear()
      } catch {
        // Ignore failure to clear browser storage
      }
    }
  }

  const clearByPrefix = (prefix: string) => {
    if (!prefix) {
      clear()
      return
    }

    for (const key of Array.from(memoryFallback.keys())) {
      if (key.startsWith(prefix)) {
        memoryFallback.delete(key)
      }
    }

    const storage = getBrowserStorage(driver)
    if (storage) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i)
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => storage.removeItem(key))
      } catch {
        // ignore failures to remove from storage
      }
    }
  }

  const toStorageAdapter = (): StateStorage => ({
    getItem: (name: string) => getRaw(name),
    setItem: (name: string, value: string) => setRaw(name, value),
    removeItem: (name: string) => remove(name),
  })

  return {
    getRaw,
    setRaw,
    get,
    set,
    remove,
    clear,
    clearByPrefix,
    toStorageAdapter,
  }
}

export const localStorageService = createStorageService("localStorage")
export const sessionStorageService = createStorageService("sessionStorage")

export { createStorageService }
