'use client'

import { useCallback, useMemo } from "react"
import { useUIStore, type HuddleSessionState } from "@/state/ui.store"

export interface BottomPanelControls {
  isOpen: boolean
  isCollapsed: boolean
  session: HuddleSessionState | null
  height: number
  open: (session?: HuddleSessionState) => void
  close: () => void
  toggle: () => void
  collapse: () => void
  expand: () => void
  setSession: (session: HuddleSessionState | null) => void
  setHeight: (height: number) => void
}

export function useBottomPanel(): BottomPanelControls {
  const isOpen = useUIStore((state) => state.isBottomPanelOpen)
  const isCollapsed = useUIStore((state) => state.bottomPanelCollapsed)
  const session = useUIStore((state) => state.bottomPanelSession)
  const height = useUIStore((state) => state.bottomPanelHeight)
  const openBottomPanel = useUIStore((state) => state.openBottomPanel)
  const closeBottomPanel = useUIStore((state) => state.closeBottomPanel)
  const toggleBottomPanel = useUIStore((state) => state.toggleBottomPanel)
  const setBottomPanelCollapsed = useUIStore((state) => state.setBottomPanelCollapsed)
  const setBottomPanelSession = useUIStore((state) => state.setBottomPanelSession)
  const setBottomPanelHeight = useUIStore((state) => state.setBottomPanelHeight)

  const open = useCallback(
    (nextSession?: HuddleSessionState) => {
      if (nextSession) {
        setBottomPanelSession(nextSession)
      }
      openBottomPanel()
    },
    [openBottomPanel, setBottomPanelSession]
  )

  const close = useCallback(() => {
    closeBottomPanel()
  }, [closeBottomPanel])

  const toggle = useCallback(() => {
    toggleBottomPanel()
  }, [toggleBottomPanel])

  const collapse = useCallback(() => {
    setBottomPanelCollapsed(true)
  }, [setBottomPanelCollapsed])

  const expand = useCallback(() => {
    setBottomPanelCollapsed(false)
  }, [setBottomPanelCollapsed])

  const setSession = useCallback(
    (nextSession: HuddleSessionState | null) => {
      setBottomPanelSession(nextSession)
    },
    [setBottomPanelSession]
  )

  return useMemo(
    () => ({
      isOpen,
      isCollapsed,
      session,
      height,
      open,
      close,
      toggle,
      collapse,
      expand,
      setSession,
      setHeight: setBottomPanelHeight,
    }),
    [
      collapse,
      close,
      expand,
      height,
      isCollapsed,
      isOpen,
      open,
      session,
      setBottomPanelHeight,
      setSession,
      toggle,
    ]
  )
}
