export const deepEqual = (valueA: unknown, valueB: unknown) => {
  if (Object.is(valueA, valueB)) {
    return true
  }

  try {
    return JSON.stringify(valueA) === JSON.stringify(valueB)
  } catch {
    return false
  }
}
