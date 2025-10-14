'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { X, ArrowRight, Sparkles, Cursor } from 'lucide-react'
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
  const [calculatedPosition, setCalculatedPosition] = useState({ top: 0, left: 0, arrow: 'top', spotlightX: 50, spotlightY: 50, spotlightWidth: 20, spotlightHeight: 10, targetAspectRatio: 2 })
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate position relative to target element
  useEffect(() => {
    if (!isOpen || !targetElement || !toastRef.current) return

    const updatePosition = () => {
      const targetRect = targetElement.getBoundingClientRect()
      const toastRect = toastRef.current?.getBoundingClientRect()

      if (!toastRect) return

      const margin = 16
      const arrowSize = 12
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let top = 0
      let left = 0
      let arrow = 'top'

      switch (position) {
        case 'top':
          top = targetRect.top - toastRect.height - margin - arrowSize - 60 // Extra 60px lower
          left = targetRect.left + (targetRect.width - toastRect.width) / 2
          arrow = 'bottom'
          break
        case 'bottom':
          top = targetRect.bottom + margin + arrowSize + 60 // Extra 60px lower
          left = targetRect.left + (targetRect.width - toastRect.width) / 2
          arrow = 'top'
          break
        case 'left':
          top = targetRect.top + (targetRect.height - toastRect.height) / 2 + 60 // Extra 60px lower
          left = targetRect.left - toastRect.width - margin - arrowSize
          arrow = 'right'
          break
        case 'right':
          top = targetRect.top + (targetRect.height - toastRect.height) / 2 + 60 // Extra 60px lower
          left = targetRect.right + margin + arrowSize
          arrow = 'left'
          break
      }

      // Enhanced viewport bounds checking with smart positioning
      const maxLeft = viewportWidth - toastRect.width - margin
      const maxTop = viewportHeight - toastRect.height - margin

      // Smart horizontal positioning with center preference
      if (left < margin) {
        left = margin
        // Adjust arrow to point to original target
        if (position === 'top' || position === 'bottom') {
          const offset = targetRect.left + targetRect.width / 2 - left
          if (Math.abs(offset) > 50) {
            arrow = position === 'top' ? 'top-left' : 'bottom-left'
          }
        }
      } else if (left > maxLeft) {
        left = maxLeft
        // Adjust arrow to point to original target
        if (position === 'top' || position === 'bottom') {
          const offset = targetRect.left + targetRect.width / 2 - left - toastRect.width
          if (Math.abs(offset) > 50) {
            arrow = position === 'top' ? 'top-right' : 'bottom-right'
          }
        }
      }

      // Smart vertical positioning
      if (top < margin) {
        top = margin
        // Switch to bottom positioning if top doesn't fit
        if (position === 'top') {
          top = targetRect.bottom + margin + arrowSize
          arrow = 'top'
        }
      } else if (top > maxTop) {
        top = maxTop
        // Switch to top positioning if bottom doesn't fit
        if (position === 'bottom') {
          top = targetRect.top - toastRect.height - margin - arrowSize
          arrow = 'bottom'
        }
      }

      // Fine-tune center alignment for perfect symmetry
      if (position === 'top' || position === 'bottom') {
        const targetCenter = targetRect.left + targetRect.width / 2
        const toastCenter = left + toastRect.width / 2
        const centerOffset = targetCenter - toastCenter

        // Apply small offset for better alignment if needed
        if (Math.abs(centerOffset) > 10 && Math.abs(centerOffset) < 100) {
          left += centerOffset * 0.3 // Gentle adjustment
        }
      }

      // Calculate precise spotlight coordinates matching target element
      const spotlightCenterX = targetRect.left + targetRect.width / 2
      const spotlightCenterY = targetRect.top + targetRect.height / 2
      const spotlightX = (spotlightCenterX / viewportWidth) * 100
      const spotlightY = (spotlightCenterY / viewportHeight) * 100

      // Calculate spotlight size to match target element
      const spotlightWidth = (targetRect.width / viewportWidth) * 100
      const spotlightHeight = (targetRect.height / viewportHeight) * 100
      const targetAspectRatio = targetRect.width / targetRect.height

      setCalculatedPosition({ top, left, arrow, spotlightX, spotlightY, spotlightWidth, spotlightHeight, targetAspectRatio })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [isOpen, targetElement, position])

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
        "fixed z-50 max-w-sm animate-in fade-in-0 zoom-in-95 duration-300",
        isAnimating && "animate-out fade-out-0 zoom-out-95",
        calculatedPosition.arrow.includes('top') && "drop-shadow-lg",
        calculatedPosition.arrow.includes('bottom') && "drop-shadow-lg"
      )}
      style={{
        top: `${calculatedPosition.top}px`,
        left: `${calculatedPosition.left}px`,
      }}
    >
      {/* Enhanced arrow with precise positioning */}
      <div
        className={cn(
          "absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent transition-all duration-200",
          calculatedPosition.arrow === 'bottom' && "bottom-[-8px] left-1/2 transform -translate-x-1/2 border-b-card border-t-0",
          calculatedPosition.arrow === 'top' && "top-[-8px] left-1/2 transform -translate-x-1/2 border-t-card border-b-0",
          calculatedPosition.arrow === 'left' && "left-[-8px] top-1/2 transform -translate-y-1/2 border-l-card border-r-0",
          calculatedPosition.arrow === 'right' && "right-[-8px] top-1/2 transform -translate-y-1/2 border-r-card border-l-0",
          calculatedPosition.arrow === 'top-left' && "top-[-8px] left-4 border-t-card border-b-0",
          calculatedPosition.arrow === 'top-right' && "top-[-8px] right-4 border-t-card border-b-0",
          calculatedPosition.arrow === 'bottom-left' && "bottom-[-8px] left-4 border-b-card border-t-0",
          calculatedPosition.arrow === 'bottom-right' && "bottom-[-8px] right-4 border-b-card border-t-0"
        )}
      />

      <Card className="relative border-0 border-transparent bg-transparent shadow-none">
        {/* Spotlight - works with both target elements and fallback positioning */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 40,
            background: targetElement ? `
              /* Create exact rectangular mask matching target element */
              linear-gradient(
                to right,
                rgba(0, 0, 0, 0.85) 0%,
                rgba(0, 0, 0, 0.85) ${calculatedPosition.spotlightX - calculatedPosition.spotlightWidth / 2 - 0.2}%,
                transparent ${calculatedPosition.spotlightX - calculatedPosition.spotlightWidth / 2}%,
                transparent ${calculatedPosition.spotlightX + calculatedPosition.spotlightWidth / 2}%,
                rgba(0, 0, 0, 0.85) ${calculatedPosition.spotlightX + calculatedPosition.spotlightWidth / 2 + 0.2}%,
                rgba(0, 0, 0, 0.85) 100%
              ),
              linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0.85) 0%,
                rgba(0, 0, 0, 0.85) ${calculatedPosition.spotlightY - calculatedPosition.spotlightHeight / 2 - 0.2}%,
                transparent ${calculatedPosition.spotlightY - calculatedPosition.spotlightHeight / 2}%,
                transparent ${calculatedPosition.spotlightY + calculatedPosition.spotlightHeight / 2}%,
                rgba(0, 0, 0, 0.85) ${calculatedPosition.spotlightY + calculatedPosition.spotlightHeight / 2 + 0.2}%,
                rgba(0, 0, 0, 0.85) 100%
              )
            ` : `
              radial-gradient(
                ellipse at 50% 50%,
                transparent 0%,
                transparent 15%,
                rgba(0, 0, 0, 0.7) 16%,
                rgba(0, 0, 0, 0.85) 100%
              )
            `,
            backgroundBlendMode: 'normal',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(0.5px)'
          }}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-foreground">
                  {title}
                </CardTitle>
                {showProgress && (
                  <div className="flex items-center space-x-2">
                    <Progress value={progress} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">
                      {step + 1}/{totalSteps}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <CardDescription className="text-sm leading-relaxed">
            {description}
          </CardDescription>

          <div className="flex items-center justify-between">
            {showSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                {skipLabel}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={onNext}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
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