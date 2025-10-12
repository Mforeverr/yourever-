'use client'

import { useCallback, useEffect, useState } from "react"
import { localStorageService, sessionStorageService } from "@/lib/storage"

type Serializer<T> = (value: T) => string
type Deserializer<T> = (value: string) => T

interface UsePersistentStateOptions<T> {
  storage?: "localStorage" | "sessionStorage"
  serialize?: Serializer<T>
  deserialize?: Deserializer<T>
}

const defaultSerialize: Serializer<unknown> = (value) => JSON.stringify(value)
const defaultDeserialize: Deserializer<unknown> = (value) => JSON.parse(value)

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options?: UsePersistentStateOptions<T>
) {
  const storageService =
    options?.storage === "sessionStorage" ? sessionStorageService : localStorageService

  const serialize: Serializer<T> = options?.serialize ?? (defaultSerialize as Serializer<T>)
  const deserialize: Deserializer<T> =
    options?.deserialize ?? (defaultDeserialize as Deserializer<T>)

  const [state, setState] = useState<T>(() => {
    const raw = storageService.getRaw(key)
    if (raw === null) {
      return defaultValue
    }

    try {
      return deserialize(raw)
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      const serialized = serialize(state)
      storageService.setRaw(key, serialized)
    } catch {
      // Ignore serialization errors
    }
  }, [key, serialize, state, storageService])

  const setPersistentState = useCallback(
    (value: T | ((previous: T) => T)) => {
      setState((prev) => (typeof value === "function" ? (value as (previous: T) => T)(prev) : value))
    },
    []
  )

  return [state, setPersistentState] as const
}
