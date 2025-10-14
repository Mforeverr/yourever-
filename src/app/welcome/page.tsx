'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'

export default function WelcomePage() {
  const router = useRouter()
  const { isLoading: isProtecting } = useProtectedRoute()
  const { user } = useCurrentUser()
  const [isAnimating, setIsAnimating] = useState(false)

  const handleGetStarted = () => {
    setIsAnimating(true)
    authStorage.setWorkspaceWelcomeSeen()
    setTimeout(() => {
      router.push('/workspace-hub')
    }, 300)
  }

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-muted-foreground">
        <p>Preparing your welcome...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const firstName = user.first_name || user.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          {/* Simplified welcome card */}
          <Card className="border-none shadow-lg bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              {/* Simple icon instead of complex illustration */}
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>

              <CardTitle className="text-3xl font-bold text-foreground mb-4">
                Welcome to Yourever, {firstName}!
              </CardTitle>

              <CardDescription className="text-muted-foreground">
                Your profile is ready. Let's set up your workspace so you can start collaborating with your team.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* CTA Button */}
              <Button
                size="lg"
                onClick={handleGetStarted}
                disabled={isAnimating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 font-medium transition-all duration-300"
              >
                {isAnimating ? (
                  <span>Setting up your workspace...</span>
                ) : (
                  <>
                    Set Up Your Workspace
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>

              {/* Skip option */}
              <div className="text-center">
                <button
                  onClick={() => {
                    authStorage.setWorkspaceWelcomeSeen()
                    router.push('/workspace-hub')
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
