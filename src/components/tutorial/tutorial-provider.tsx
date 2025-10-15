'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { TutorialToast, useTutorialTarget, type TutorialStep } from './tutorial-toast'

interface TutorialContextType {
  startTutorial: (tutorialId: string) => void
  skipTutorial: () => void
  isTutorialActive: boolean
  currentTutorialId: string | null
  hasCompletedTutorial: (tutorialId: string) => boolean
  markTutorialCompleted: (tutorialId: string) => void
}

const TutorialContext = createContext<TutorialContextType | null>(null)

interface TutorialDefinition {
  id: string
  steps: TutorialStep[]
  autoStart?: boolean
  triggerOnMount?: boolean
  prerequisites?: string[]
}

interface TutorialProviderProps {
  children: ReactNode
  tutorials: TutorialDefinition[]
}

const TUTORIAL_COMPLETION_KEY = 'yourever-tutorial-completion'

export function TutorialProvider({ children, tutorials }: TutorialProviderProps) {
  const [currentTutorialId, setCurrentTutorialId] = useState<string | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [activeSteps, setActiveSteps] = useState<TutorialStep[]>([])
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set())
  const [isCompletionHydrated, setIsCompletionHydrated] = useState(false)

  // Load completed tutorials from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TUTORIAL_COMPLETION_KEY)
      if (stored) {
        const completed = JSON.parse(stored)
        setCompletedTutorials(new Set(completed))
      }
    } catch (error) {
      console.warn('Failed to load tutorial completion status:', error)
    } finally {
      setIsCompletionHydrated(true)
    }
  }, [])

  // Save completed tutorials to localStorage
  const saveCompletedTutorials = (tutorials: Set<string>) => {
    try {
      localStorage.setItem(TUTORIAL_COMPLETION_KEY, JSON.stringify(Array.from(tutorials)))
    } catch (error) {
      console.warn('Failed to save tutorial completion status:', error)
    }
  }

  const getCurrentStep = (): TutorialStep | null => {
    if (currentStepIndex < 0 || currentStepIndex >= activeSteps.length) {
      return null
    }
    return activeSteps[currentStepIndex]
  }

  const resolveTutorialSteps = (steps: TutorialStep[]): TutorialStep[] => {
    if (typeof window === 'undefined') {
      return steps
    }

    return steps.filter(step => {
      if (!step.targetSelector) {
        return true
      }

      const element = document.querySelector(step.targetSelector) as HTMLElement | null
      if (!element) {
        console.warn(`Tutorial target not found for selector: "${step.targetSelector}"`)
      }
      return Boolean(element)
    })
  }

  const startTutorial = (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId)
    if (!tutorial) {
      console.warn(`Tutorial with id "${tutorialId}" not found`)
      return
    }

    // TODO: TESTING MODIFICATION - Bypass completion check for repeated testing
    // This allows restarting completed tutorials for development/testing purposes
    // In production, uncomment the completion check below:
    // if (completedTutorials.has(tutorialId)) {
    //   console.log(`Tutorial "${tutorialId}" has already been completed`)
    //   return
    // }
    const isAlreadyCompleted = completedTutorials.has(tutorialId)

    // Clear completion status if restarting a completed tutorial
    if (isAlreadyCompleted) {
      const newCompleted = new Set(completedTutorials)
      newCompleted.delete(tutorialId)
      setCompletedTutorials(newCompleted)
      saveCompletedTutorials(newCompleted)
      console.log(`Tutorial "${tutorialId}" completion status cleared for testing`)
    }

    // Check prerequisites
    if (tutorial.prerequisites) {
      const missingPrerequisites = tutorial.prerequisites.filter(
        prereq => !completedTutorials.has(prereq)
      )
      if (missingPrerequisites.length > 0) {
        console.log(`Missing prerequisites for tutorial "${tutorialId}": ${missingPrerequisites.join(', ')}`)
        return
      }
    }

    const orderedSteps = resolveTutorialSteps(tutorial.steps)
    if (orderedSteps.length === 0) {
      console.warn(`Tutorial "${tutorialId}" does not have any available steps`)
      return
    }

    setCurrentTutorialId(tutorialId)
    setActiveSteps(orderedSteps)
    setCurrentStepIndex(0)
  }

  const nextStep = () => {
    if (activeSteps.length === 0) return

    if (currentStepIndex >= activeSteps.length - 1) {
      // Tutorial completed
      completeTutorial()
    } else {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const previousStep = () => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1))
  }

  const skipTutorial = () => {
    completeTutorial()
  }

  const closeTutorial = () => {
    setCurrentTutorialId(null)
    setCurrentStepIndex(0)
    setActiveSteps([])
  }

  const completeTutorial = () => {
    if (currentTutorialId) {
      const newCompleted = new Set(completedTutorials)
      newCompleted.add(currentTutorialId)
      setCompletedTutorials(newCompleted)
      saveCompletedTutorials(newCompleted)
    }
    closeTutorial()
  }

  const hasCompletedTutorial = (tutorialId: string): boolean => {
    return completedTutorials.has(tutorialId)
  }

  const markTutorialCompleted = (tutorialId: string) => {
    const newCompleted = new Set(completedTutorials)
    newCompleted.add(tutorialId)
    setCompletedTutorials(newCompleted)
    saveCompletedTutorials(newCompleted)
  }

  const goToStep = (stepIndex: number) => {
    if (activeSteps.length === 0) return
    setCurrentStepIndex(Math.max(0, Math.min(stepIndex, activeSteps.length - 1)))
  }

  useEffect(() => {
    if (currentStepIndex < activeSteps.length) return
    if (activeSteps.length === 0) {
      setCurrentTutorialId(null)
      setCurrentStepIndex(0)
      return
    }

    setCurrentStepIndex(activeSteps.length - 1)
  }, [activeSteps, currentStepIndex])

  // Auto-start tutorials when ready
  useEffect(() => {
    if (!isCompletionHydrated || currentTutorialId) return

    const timers = tutorials
      .filter(tutorial => tutorial.triggerOnMount && !completedTutorials.has(tutorial.id))
      .map(tutorial =>
        window.setTimeout(() => {
          startTutorial(tutorial.id)
        }, 500)
      )

    return () => {
      timers.forEach(timer => window.clearTimeout(timer))
    }
  }, [tutorials, completedTutorials, isCompletionHydrated, currentTutorialId])

  const currentStep = getCurrentStep()
  const targetElement = useTutorialTarget(currentStep?.targetSelector || null)

  const isTutorialActive = currentTutorialId !== null

  const contextValue: TutorialContextType = {
    startTutorial,
    skipTutorial,
    isTutorialActive,
    currentTutorialId,
    hasCompletedTutorial,
    markTutorialCompleted,
  }

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}

      {currentStep && (
        <TutorialToast
          isOpen={isTutorialActive}
          onClose={closeTutorial}
          onNext={nextStep}
          onSkip={skipTutorial}
          title={currentStep.title}
          description={currentStep.description}
          step={currentStepIndex}
          totalSteps={activeSteps.length}
          targetElement={targetElement}
          position={currentStep.position}
          skipLabel={currentStep.skipLabel}
          nextLabel={currentStep.nextLabel}
          showSkip={currentStep.showSkip !== false}
          showProgress={currentStep.showProgress !== false}
        />
      )}
    </TutorialContext.Provider>
  )
}

export function useTutorialContext(): TutorialContextType {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorialContext must be used within a TutorialProvider')
  }
  return context
}

// Hook for easy tutorial management
export function useTutorialManager(tutorialId: string) {
  const {
    startTutorial,
    skipTutorial,
    isTutorialActive,
    currentTutorialId,
    hasCompletedTutorial,
    markTutorialCompleted,
  } = useTutorialContext()

  const isCurrentTutorial = currentTutorialId === tutorialId
  const isActive = isTutorialActive && isCurrentTutorial

  return {
    start: () => startTutorial(tutorialId),
    skip: skipTutorial,
    isActive,
    isCompleted: hasCompletedTutorial(tutorialId),
    markCompleted: () => markTutorialCompleted(tutorialId),
  }
}

// Predefined workspace hub tutorial steps
export const WORKSPACE_HUB_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome-choice',
    title: 'Welcome to Workspace Setup! 👋',
    description:
      "Let me guide you through setting up your workspace. You can choose how you want to get started - create your own, join existing, or accept invitations.",
    targetSelector: '[data-tutorial="choice-options"]',
    position: 'left',
    nextLabel: 'Next Step',
    showProgress: true,
  },
  {
    id: 'create-option',
    title: 'Create Your Own Workspace',
    description:
      "Choose this option if you want to be the admin and set up everything yourself. Perfect for new teams!",
    targetSelector: '[data-tutorial="create-new-option"]',
    position: 'left',
    nextLabel: 'Learn More',
    showProgress: true,
  },
  {
    id: 'join-option',
    title: 'Join an Existing Team',
    description: "Already have a team? Select this to join an organization you're already a member of.",
    targetSelector: '[data-tutorial="join-existing-option"]',
    position: 'left',
    nextLabel: 'See Invitations',
    showProgress: true,
  },
  {
    id: 'invitation-option',
    title: 'Accept an Invitation',
    description: "If someone invited you to their workspace, you'll see those invitations here. Just click to join!",
    targetSelector: '[data-tutorial="accept-invitation-option"]',
    position: 'left',
    nextLabel: 'Got it!',
    showProgress: true,
  },
]