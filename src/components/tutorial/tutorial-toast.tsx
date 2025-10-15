'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { X, ArrowRight, Sparkles } from 'lucide-react'

type ArrowDirection =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
import { cn } from '@/lib/utils'

interface TutorialToastProps {
  isOpen: boolean
  onClose: () => void
  onNext: () => void
  onSkip: () => void
  title: string
  description: string
  step: number
  totalSteps: number
  targetElement?: HTMLElement | null
  position?: 'top' | 'bottom' | 'left' | 'right'
  skipLabel?: string
  nextLabel?: string
  showSkip?: boolean
  showProgress?: boolean
}

export function TutorialToast({
  isOpen,
  onClose,
  onNext,
  onSkip,
  title,
  description,
  step,
  totalSteps,
  targetElement,
  position = 'top',
  skipLabel = 'Skip Tutorial',
  nextLabel = 'Next',
  showSkip = true,
  showProgress = true,
}: TutorialToastProps) {
  const toastRef = useRef<HTMLDivElement>(null)
  const [calculatedPosition, setCalculatedPosition] = useState({
    top: 0,
    left: 0,
    arrow: 'top' as ArrowDirection,
    spotlight: null as
      | {
          top: number
          left: number
          width: number
          height: number
          borderRadius: string
        }
      | null,
  })
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate position relative to target element
  useEffect(() => {
    if (!isOpen || !targetElement || !toastRef.current) return

    const margin = 16
    const arrowSize = 12
    const spotlightPadding = 12

    const updatePosition = () => {
      if (!targetElement || !toastRef.current) return

      window.requestAnimationFrame(() => {
        const targetRect = targetElement.getBoundingClientRect()
        const toastRect = toastRef.current?.getBoundingClientRect()

        if (!toastRect) return

        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let top = 0
        let left = 0
        let arrow: ArrowDirection = 'top'

        switch (position) {
          case 'top':
            top = targetRect.top - toastRect.height - margin - arrowSize
            left = targetRect.left + (targetRect.width - toastRect.width) / 2
            arrow = 'bottom'
            break
          case 'bottom':
            top = targetRect.bottom + margin + arrowSize
            left = targetRect.left + (targetRect.width - toastRect.width) / 2
            arrow = 'top'
            break
          case 'left':
            top = targetRect.top + (targetRect.height - toastRect.height) / 2
            left = targetRect.left - toastRect.width - margin - arrowSize
            arrow = 'right'
            break
          case 'right':
            top = targetRect.top + (targetRect.height - toastRect.height) / 2
            left = targetRect.right + margin + arrowSize
            arrow = 'left'
            break
        }

        const maxLeft = viewportWidth - toastRect.width - margin
        const maxTop = viewportHeight - toastRect.height - margin

        if (left < margin) {
          left = margin
          if (position === 'top' || position === 'bottom') {
            const offset = targetRect.left + targetRect.width / 2 - left
            if (Math.abs(offset) > 50) {
              arrow = position === 'top' ? 'top-left' : 'bottom-left'
            }
          }
        } else if (left > maxLeft) {
          left = maxLeft
          if (position === 'top' || position === 'bottom') {
            const offset = targetRect.left + targetRect.width / 2 - left - toastRect.width
            if (Math.abs(offset) > 50) {
              arrow = position === 'top' ? 'top-right' : 'bottom-right'
            }
          }
        }

        if (top < margin) {
          top = margin
          if (position === 'top') {
            top = targetRect.bottom + margin + arrowSize
            arrow = 'top'
          }
        } else if (top > maxTop) {
          top = maxTop
          if (position === 'bottom') {
            top = targetRect.top - toastRect.height - margin - arrowSize
            arrow = 'bottom'
          }
        }

        const computedStyle = window.getComputedStyle(targetElement)
        const borderRadius = computedStyle.borderRadius || '20px'

        const highlightTop = Math.max(0, targetRect.top - spotlightPadding)
        const highlightLeft = Math.max(0, targetRect.left - spotlightPadding)
        const highlightBottom = Math.min(viewportHeight, targetRect.bottom + spotlightPadding)
        const highlightRight = Math.min(viewportWidth, targetRect.right + spotlightPadding)

        setCalculatedPosition({
          top,
          left,
          arrow,
          spotlight: {
            top: highlightTop,
            left: highlightLeft,
            width: Math.max(0, highlightRight - highlightLeft),
            height: Math.max(0, highlightBottom - highlightTop),
            borderRadius,
          },
        })
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, { passive: true })

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updatePosition()) : null
    resizeObserver?.observe(targetElement)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      resizeObserver?.disconnect()
    }
  }, [isOpen, targetElement, position, step])

  useEffect(() => {
    if (isOpen && !targetElement) {
      setCalculatedPosition(prev => ({ ...prev, spotlight: null }))
    }
  }, [isOpen, targetElement])

  useEffect(() => {
    if (!isOpen || !targetElement) return

    const scrollTimer = window.setTimeout(() => {
      try {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      } catch (error) {
        console.warn('Unable to scroll tutorial target into view', error)
      }
    }, 120)

    return () => window.clearTimeout(scrollTimer)
  }, [targetElement, isOpen, step])

  // Handle animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  const progress = ((step + 1) / totalSteps) * 100

  const toast = (
    <div
      ref={toastRef}
      className={cn(
        'pointer-events-none fixed z-50 max-w-sm animate-in fade-in-0 zoom-in-95 duration-300',
        isAnimating && 'animate-out fade-out-0 zoom-out-95'
      )}
      style={{
        top: targetElement ? `${calculatedPosition.top}px` : '50%',
        left: targetElement ? `${calculatedPosition.left}px` : '50%',
        transform: targetElement ? undefined : 'translate(-50%, -50%)',
      }}
    >
        {/* Dimming overlay and spotlight */}
      {calculatedPosition.spotlight ? (
        <>
          {/* Dark overlay with clear spotlight cutout */}
          <div
            className="fixed -z-10 pointer-events-none transition-all duration-500 ease-out"
            style={{
              top: `${calculatedPosition.spotlight.top}px`,
              left: `${calculatedPosition.spotlight.left}px`,
              width: `${calculatedPosition.spotlight.width}px`,
              height: `${calculatedPosition.spotlight.height}px`,
              borderRadius: calculatedPosition.spotlight.borderRadius,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)',
            }}
          />
          {/* Clear spotlight area with blue outline */}
          <div
            className="fixed -z-10 pointer-events-none transition-all duration-500 ease-out"
            style={{
              top: `${calculatedPosition.spotlight.top}px`,
              left: `${calculatedPosition.spotlight.left}px`,
              width: `${calculatedPosition.spotlight.width}px`,
              height: `${calculatedPosition.spotlight.height}px`,
              borderRadius: calculatedPosition.spotlight.borderRadius,
              background: 'transparent',
              outline: '3px solid rgba(59, 130, 246, 0)',
              outlineOffset: '2px',
              filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))',
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 -z-10 bg-black/70 transition-opacity duration-500" />
      )}

      {/* Enhanced arrow with precise positioning */}
      <div
        className={cn(
          'pointer-events-none absolute h-0 w-0 border-l-8 border-r-8 border-b-8 border-transparent transition-all duration-200',
          calculatedPosition.arrow === 'bottom' &&
            'bottom-[-8px] left-1/2 border-b-card border-t-0 shadow-[0_8px_20px_rgba(0,0,0,0.25)]',
          calculatedPosition.arrow === 'top' && 'top-[-8px] left-1/2 border-t-card border-b-0',
          calculatedPosition.arrow === 'left' && 'left-[-8px] top-1/2 border-l-card border-r-0',
          calculatedPosition.arrow === 'right' && 'right-[-8px] top-1/2 border-r-card border-l-0',
          calculatedPosition.arrow === 'top-left' && 'top-[-8px] left-4 border-t-card border-b-0',
          calculatedPosition.arrow === 'top-right' && 'top-[-8px] right-4 border-t-card border-b-0',
          calculatedPosition.arrow === 'bottom-left' && 'bottom-[-8px] left-4 border-b-card border-t-0',
          calculatedPosition.arrow === 'bottom-right' && 'bottom-[-8px] right-4 border-b-card border-t-0'
        )}
      />

      <Card className="pointer-events-auto relative rounded-3xl border border-border/60 bg-card/95 shadow-xl backdrop-blur-xl">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <Badge className="h-6 rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">
                  Step {step + 1} of {totalSteps}
                </Badge>
                <CardTitle className="text-lg font-semibold text-foreground">
                  {title}
                </CardTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {showProgress && <Progress value={progress} className="h-1 overflow-hidden rounded-full bg-muted" />}
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>

          <div className="flex items-center justify-between gap-3">
            {showSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {skipLabel}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={onNext}
              size="sm"
              className="rounded-full bg-blue-600 px-4 text-white shadow-sm transition-transform hover:scale-[1.01] hover:bg-blue-700"
            >
              {step === totalSteps - 1 ? 'Got it!' : nextLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return createPortal(toast, document.body)
}

// Hook to get element by selector
export function useTutorialTarget(selector: string | null) {
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!selector) {
      setElement(null)
      return
    }

    const target = document.querySelector(selector) as HTMLElement
    setElement(target)

    // Watch for changes in case the element appears later
    const observer = new MutationObserver(() => {
      const newTarget = document.querySelector(selector) as HTMLElement
      setElement(newTarget)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [selector])

  return element
}

// Tutorial context for managing global tutorial state
export interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  skipLabel?: string
  nextLabel?: string
  showSkip?: boolean
  showProgress?: boolean
}

interface TutorialState {
  isOpen: boolean
  currentStep: number
  steps: TutorialStep[]
}

interface TutorialActions {
  startTutorial: (steps: TutorialStep[]) => void
  nextStep: () => void
  previousStep: () => void
  skipTutorial: () => void
  closeTutorial: () => void
  goToStep: (stepIndex: number) => void
}

export const useTutorial = (): TutorialState & TutorialActions => {
  const [state, setState] = useState<TutorialState>({
    isOpen: false,
    currentStep: 0,
    steps: [],
  })

  const startTutorial = (steps: TutorialStep[]) => {
    setState({
      isOpen: true,
      currentStep: 0,
      steps,
    })
  }

  const nextStep = () => {
    setState((prev) => {
      if (prev.currentStep >= prev.steps.length - 1) {
        return { ...prev, isOpen: false }
      }
      return { ...prev, currentStep: prev.currentStep + 1 }
    })
  }

  const previousStep = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }))
  }

  const skipTutorial = () => {
    setState({ isOpen: false, currentStep: 0, steps: [] })
  }

  const closeTutorial = () => {
    setState({ isOpen: false, currentStep: 0, steps: [] })
  }

  const goToStep = (stepIndex: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(stepIndex, prev.steps.length - 1)),
    }))
  }

  return {
    ...state,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    closeTutorial,
    goToStep,
  }
}