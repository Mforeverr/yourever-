'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Confetti, Sparkles, ArrowRight, CheckCircle, Users, Building2 } from 'lucide-react'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'

// Confetti animation component
function ConfettiAnimation() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([])

  useEffect(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `fall ${3 + Math.random() * 2}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`
          }}
        >
          <div
            className="w-2 h-2 rounded-full opacity-70"
            style={{ backgroundColor: particle.color }}
          />
        </div>
      ))}
    </div>
  )
}

function WelcomeIllustration() {
  return (
    <div className="relative w-64 h-64 mx-auto mb-8">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Main circle */}
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          {/* Orbiting circles */}
          <div className="absolute -top-4 -left-4 w-8 h-8 bg-green-500 rounded-full animate-bounce" />
          <div className="absolute -top-4 -right-4 w-6 h-6 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
        </div>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  const router = useRouter()
  const { isLoading: isProtecting } = useProtectedRoute()
  const { user } = useCurrentUser()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Add custom animation styles
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fall {
        from {
          transform: translateY(-100vh) rotate(0deg);
          opacity: 1;
        }
        to {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
      @keyframes slideInUp {
        from {
          transform: translateY(30px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handleGetStarted = () => {
    setIsAnimating(true)
    authStorage.setWorkspaceWelcomeSeen()
    setTimeout(() => {
      router.push('/workspace-hub')
    }, 300)
  }

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-muted-foreground">
        <p>Preparing your welcome...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const firstName = user.first_name || user.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      <ConfettiAnimation />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-2xl w-full">
          {/* Main welcome card */}
          <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="mb-4" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <WelcomeIllustration />
              </div>

              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Welcome to Yourever, {firstName}! 🎉
              </CardTitle>

              <CardDescription className="text-lg text-muted-foreground mb-6">
                You've completed your profile setup! Now let's get your workspace ready so you can start collaborating with your team.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Achievement badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Profile Complete
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <Users className="w-4 h-4 mr-1 text-blue-500" />
                  Ready to Collaborate
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <Building2 className="w-4 h-4 mr-1 text-purple-500" />
                  Workspace Setup
                </Badge>
              </div>

              {/* What's next section */}
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  What's Next?
                </h3>
                <div className="grid gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">1</span>
                    </div>
                    <span>Choose your workspace setup</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">2</span>
                    </div>
                    <span>Create or join an organization</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">3</span>
                    </div>
                    <span>Start collaborating with your team</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isAnimating}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  {isAnimating ? (
                    <span>Setting up your workspace...</span>
                  ) : (
                    <>
                      Start Workspace Setup
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>

              {/* Skip option */}
              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    authStorage.setWorkspaceWelcomeSeen()
                    router.push('/workspace-hub')
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip to workspace setup
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
