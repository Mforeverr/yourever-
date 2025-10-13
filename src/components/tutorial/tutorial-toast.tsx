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
  const [calculatedPosition, setCalculatedPosition] = useState({ top: 0, left: 0, arrow: 'top' })
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

      // Keep within viewport bounds
      left = Math.max(margin, Math.min(left, viewportWidth - toastRect.width - margin))
      top = Math.max(margin, Math.min(top, viewportHeight - toastRect.height - margin))

      // Adjust arrow position if toast is repositioned
      if (position === 'top' || position === 'bottom') {
        const targetCenter = targetRect.left + targetRect.width / 2
        const toastCenter = left + toastRect.width / 2
        if (Math.abs(targetCenter - toastCenter) > 50) {
          arrow = position === 'top' ? 'top-center' : 'bottom-center'
        }
      }

      setCalculatedPosition({ top, left, arrow })
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
      {/* Arrow */}
      <div
        className={cn(
          "absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent",
          calculatedPosition.arrow === 'bottom' && "bottom-[-8px] left-1/2 transform -translate-x-1/2 border-b-white border-t-0",
          calculatedPosition.arrow === 'top' && "top-[-8px] left-1/2 transform -translate-x-1/2 border-t-white border-b-0",
          calculatedPosition.arrow === 'left' && "left-[-8px] top-1/2 transform -translate-y-1/2 border-l-white border-r-0",
          calculatedPosition.arrow === 'right' && "right-[-8px] top-1/2 transform -translate-y-1/2 border-r-white border-l-0"
        )}
      />

      <Card className="relative border-2 border-blue-200 bg-white shadow-2xl">
        {/* Highlight ring around target element */}
        {targetElement && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              width: `${targetElement.offsetWidth + 20}px`,
              height: `${targetElement.offsetHeight + 20}px`,
              top: `${-10 - (calculatedPosition.arrow.includes('bottom') ? 8 : 0)}px`,
              left: `${-10}px`,
              transform: `translate(${-calculatedPosition.left + targetElement.getBoundingClientRect().left - 10}px, ${-calculatedPosition.top + targetElement.getBoundingClientRect().top - 10}px)`,
              border: '3px solid rgb(59, 130, 246)',
              borderRadius: '8px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
              zIndex: -1,
            }}
          />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-blue-900">
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
              className="h-6 w-6 p-0 hover:bg-blue-50"
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