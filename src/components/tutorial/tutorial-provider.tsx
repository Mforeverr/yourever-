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
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set())

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

  const getCurrentTutorial = (): TutorialDefinition | null => {
    if (!currentTutorialId) return null
    return tutorials.find(t => t.id === currentTutorialId) || null
  }

  const getCurrentStep = (): TutorialStep | null => {
    const tutorial = getCurrentTutorial()
    if (!tutorial || currentStepIndex >= tutorial.steps.length) return null
    return tutorial.steps[currentStepIndex]
  }

  const startTutorial = (tutorialId: string) => {
    const tutorial = tutorials.find(t => t.id === tutorialId)
    if (!tutorial) {
      console.warn(`Tutorial with id "${tutorialId}" not found`)
      return
    }

    // Check if tutorial is already completed
    if (completedTutorials.has(tutorialId)) {
      console.log(`Tutorial "${tutorialId}" has already been completed`)
      return
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

    setCurrentTutorialId(tutorialId)
    setCurrentStepIndex(0)
  }

  const nextStep = () => {
    const tutorial = getCurrentTutorial()
    if (!tutorial) return

    if (currentStepIndex >= tutorial.steps.length - 1) {
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
    const tutorial = getCurrentTutorial()
    if (!tutorial) return
    setCurrentStepIndex(Math.max(0, Math.min(stepIndex, tutorial.steps.length - 1)))
  }

  // Auto-start tutorials on mount
  useEffect(() => {
    tutorials.forEach(tutorial => {
      if (tutorial.triggerOnMount && !completedTutorials.has(tutorial.id)) {
        // Small delay to ensure DOM is ready
        setTimeout(() => startTutorial(tutorial.id), 500)
      }
    })
  }, []) // Only run on mount

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
          totalSteps={getCurrentTutorial()?.steps.length || 0}
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
    title: 'Choose Your Setup',
    description: 'First, let\'s decide how you want to get started. You can join an existing team, create a new workspace, or accept an invitation.',
    targetSelector: '[data-tutorial="choice-options"]',
    position: 'bottom',
    nextLabel: 'Next',
    showProgress: true,
  },
  {
    id: 'create-option',
    title: 'Create Your Own Workspace',
    description: 'If you want to be the admin and set everything up yourself, choose this option. You\'ll create a new organization from scratch.',
    targetSelector: '[data-tutorial="create-new-option"]',
    position: 'right',
    nextLabel: 'Next',
    showProgress: true,
  },
  {
    id: 'join-option',
    title: 'Join an Existing Team',
    description: 'Already have a team? Choose this option to join an existing organization that you\'re a member of.',
    targetSelector: '[data-tutorial="join-existing-option"]',
    position: 'left',
    nextLabel: 'Next',
    showProgress: true,
  },
  {
    id: 'invitation-option',
    title: 'Accept an Invitation',
    description: 'If someone invited you to join their team, you\'ll see those invitations here. Just click to accept!',
    targetSelector: '[data-tutorial="accept-invitation-option"]',
    position: 'left',
    nextLabel: 'Got it!',
    showProgress: true,
  },
]