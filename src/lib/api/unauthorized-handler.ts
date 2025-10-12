let handler: (() => void) | null = null

export const setUnauthorizedHandler = (nextHandler: () => void) => {
  handler = nextHandler
}

export const clearUnauthorizedHandler = () => {
  handler = null
}

export const notifyUnauthorized = () => {
  handler?.()
}
