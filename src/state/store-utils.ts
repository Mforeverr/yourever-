import { devtools } from "zustand/middleware"
import type { StateCreator } from "zustand"

const ENABLE_DEVTOOLS =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_ZUSTAND_DEVTOOLS === "true"

export function withOptionalDevtools<
  T extends object,
  Mps extends any[] = [],
  Mcs extends any[] = []
>(store: StateCreator<T, Mps, Mcs>, label: string): StateCreator<T, Mps, Mcs> {
  if (!ENABLE_DEVTOOLS) {
    return store
  }
  return devtools(store as any, { name: label }) as any
}
