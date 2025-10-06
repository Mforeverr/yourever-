'use client'

import { useEffect, useState } from 'react'

type ViewportSize = {
  width: number
  height: number
}

const getViewportSize = (): ViewportSize => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }

  const visualViewport = window.visualViewport
  const width = visualViewport?.width ?? window.innerWidth
  const height = visualViewport?.height ?? window.innerHeight

  return { width, height }
}

export const useViewportSize = (): ViewportSize | null => {
  const [viewport, setViewport] = useState<ViewportSize | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }
    return getViewportSize()
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateSize = () => {
      const size = getViewportSize()
      setViewport(size)

      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--app-viewport-height', `${size.height}px`)
      }
    }

    updateSize()

    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', updateSize)

    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
      visualViewport?.removeEventListener('resize', updateSize)
    }
  }, [])

  return viewport
}

export default useViewportSize
