'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthLayoutProps {
  children: ReactNode
  className?: string
  showBackground?: boolean
}

export function AuthLayout({
  children,
  className,
  showBackground = true
}: AuthLayoutProps) {
  return (
    <div className={cn(
      'min-h-screen flex flex-col',
      showBackground && 'bg-muted',
      className
    )}>
      {/* Background pattern */}
      {showBackground && (
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2024 Yourever. All rights reserved.
        </p>
        <div className="mt-2 flex justify-center gap-4 text-xs">
          <a
            href="/privacy"
            className="text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
          <a
            href="/support"
            className="text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support
          </a>
        </div>
      </footer>
    </div>
  )
}