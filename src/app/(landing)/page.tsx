'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import PixelBlast from '@/components/PixelBlast'
import PixelBlastMobile from '@/components/PixelBlastMobile'
import { useMobileDetection } from '@/hooks/use-mobile-detection'
import useViewportSize from '@/hooks/use-viewport-size'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Check,
  Menu,
  X,
  MessageSquare,
  Calendar,
  Zap,
  Shield,
  ChevronRight,
  ArrowUpRight,
  Play,
  Star,
  Mail,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react'

const SCROLL_ACTIVATE_THRESHOLD = 140
const SCROLL_DEACTIVATE_THRESHOLD = 60

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (ticking) return

      ticking = true
      requestAnimationFrame(() => {
        const scrollY =
          window.scrollY ??
          window.pageYOffset ??
          document.documentElement.scrollTop ??
          document.body.scrollTop ??
          0

        setIsScrolled(prev => {
          if (!prev && scrollY > SCROLL_ACTIVATE_THRESHOLD) return true
          if (prev && scrollY < SCROLL_DEACTIVATE_THRESHOLD) return false
          return prev
        })

        ticking = false
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex justify-center px-4 transition-transform duration-500 ease-out will-change-transform',
        isScrolled
          ? 'translate-y-5 bg-transparent'
          : 'translate-y-0 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
      )}
    >
      <div
        className={cn(
          'flex w-full items-center justify-between gap-4 transition-all duration-500',
          isScrolled
            ? 'mx-auto max-w-5xl rounded-full border border-border/40 bg-background/90 px-6 py-3 shadow-[0_25px_80px_-30px_rgba(0,0,0,0.65)] backdrop-blur-xl'
            : 'mx-auto max-w-7xl px-6 py-4'
        )}
      >
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="Yourever" className={`${isScrolled ? 'h-8 w-8' : 'h-10 w-10'} rounded-lg transition-all duration-300`} />
          {!isScrolled && <span className="font-bold text-xl transition-all duration-300">Yourever</span>}
        </Link>

        <nav
          className={cn(
            'hidden items-center gap-6 md:flex transition-all duration-300',
            isScrolled ? 'text-sm' : 'ml-auto text-sm'
          )}
        >
          <Link href="#product" className="font-medium transition-colors hover:text-primary">Product</Link>
          <Link href="#solutions" className="font-medium transition-colors hover:text-primary">Solutions</Link>
          <Link href="#docs" className="font-medium transition-colors hover:text-primary">Docs</Link>
          <Link href="#security" className="font-medium transition-colors hover:text-primary">Security</Link>
          <Link href="#contact" className="font-medium transition-colors hover:text-primary">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center">
            <Button
              size="sm"
              className={cn(
                'bg-white text-black transition-all hover:bg-gray-100',
                isScrolled ? 'px-4 py-1 text-xs font-semibold shadow-sm' : ''
              )}
              asChild
            >
              <Link href="/joinwaitlist">Join Waitlist</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className={cn(
            'md:hidden border-t border-border/40 bg-background/95 backdrop-blur',
            isScrolled ? 'mx-auto mt-2 max-w-5xl rounded-b-3xl px-4' : ''
          )}
        >
          <nav
            className={cn(
              'flex flex-col gap-4 p-4',
              isScrolled ? 'mx-auto max-w-4xl px-4' : 'mx-auto max-w-7xl px-6'
            )}
          >
            <Link href="#product" className="text-sm font-medium hover:text-primary transition-colors">Product</Link>
            <Link href="#solutions" className="text-sm font-medium hover:text-primary transition-colors">Solutions</Link>
            <Link href="#docs" className="text-sm font-medium hover:text-primary transition-colors">Docs</Link>
            <Link href="#security" className="text-sm font-medium hover:text-primary transition-colors">Security</Link>
            <Link href="#contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1 bg-white text-black hover:bg-gray-100" asChild>
                <Link href="/joinwaitlist">Join Waitlist</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

const Hero = () => {
  const deviceInfo = useMobileDetection()
  const viewport = useViewportSize()
  const heroHeight = viewport?.height
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const heroStyles = useMemo<React.CSSProperties>(() => {
    // Always use 100dvh initially to match SSR, then update on client after mount
    if (mounted && heroHeight && heroHeight > 0) {
      return { minHeight: heroHeight, height: heroHeight }
    }
    return { minHeight: '100dvh', height: '100dvh' }
  }, [heroHeight, mounted])

  return (
    <section
      className="relative w-full min-h-screen overflow-hidden"
      style={heroStyles}
    >
      {/* Mobile-responsive PixelBlast container */}
      <div
        className="absolute inset-0 w-full h-full min-h-screen"
        style={heroStyles}
      >
        {deviceInfo.isMobile || deviceInfo.isLowEnd ? (
          <PixelBlastMobile
            variant="diamond"  // Square is fastest to render
            pixelSize={5}     // Much larger pixels = way less calculations
            color="#70b9e6"
            patternScale={3}   // Even smaller scale = simpler patterns
            patternDensity={0.8} // Much lower density = lighter load
            speed={1}        // Slightly slower = less CPU usage
            edgeFade={0.02}    // Almost no edge processing
            transparent
          />
        ) : (
          <PixelBlast
            variant="circle"
            pixelSize={6}
            color="#70b9e6"
            patternScale={3}
            patternDensity={1.2}
            pixelSizeJitter={0.5}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.25}
            transparent
          />
        )}
      </div>
      <div
        className="relative z-10 flex w-full min-h-screen items-center justify-center"
        style={heroStyles}
      >
        <div className="text-center space-y-8 px-6 max-w-6xl mx-auto">
          <div className="space-y-4">
            <Badge variant="outline" className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white border-white/20">
              <Zap className="h-3 w-3 mr-2" />
              AI-ready workspace
            </Badge>
            <h1 className="text-4xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-white">
              Work, chat, plan—<br />one place.
            </h1>
            <p className="text-xl lg:text-2xl text-white/90 max-w-4xl mx-auto">
              Yourever unifies tasks, timelines, docs, chat, and calls in a single, AI-ready workspace.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 text-lg px-8 py-6" asChild>
              <Link href="/joinwaitlist">
                Join Waitlist
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20 text-lg px-8 py-6">
              Talk to sales
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm lg:text-base text-white/80">
            No credit card required · Sign in via Google/GitHub/Magic Link
          </p>
        </div>
      </div>
    </section>
  )
}

const VideoPreview = () => {
  return (
    <section className="py-4 lg:py-8 bg-background">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="max-w-6xl mx-auto">
          <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden">
            <video
              className="w-full h-auto"
              poster="/thumbnail.jpg"
              controls
              preload="metadata"
              playsInline
            >
              <source src="/video-preview.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  )
}

const WhySection = () => {
  const points = [
    {
      title: "One workspace scoped by Organization/Division",
      description: "Identical UX for everyone. No matter your role or team, you get the same powerful workspace experience."
    },
    {
      title: "AI-ready workspace",
      description: "Personal & project chat scopes, @mentions, slash commands. AI works where you work."
    },
    {
      title: "Plan with clarity",
      description: "Boards, Lists, Timelines, Calendars, Mind-maps, Docs - all the tools you need to plan effectively."
    },
    {
      title: "Communication where it matters",
      description: "Channels, DMs, and huddles right next to your work. No more switching between apps."
    }
  ]

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Yourever?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Finally, a workspace that works the way you do.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {points.map((point, index) => (
            <Card key={index} className="p-6 border-0 shadow-sm">
              <CardContent className="p-0">
                <h3 className="text-lg font-semibold mb-2">{point.title}</h3>
                <p className="text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const HowItWorks = () => {
  const steps = [
    { number: "1", title: "Sign up", description: "Create your account in seconds" },
    { number: "2", title: "Onboard", description: "Quick setup for your team" },
    { number: "3", title: "Choose/Create org/division", description: "Join existing or create new workspace" },
    { number: "4", title: "Start working", description: "Begin collaborating immediately" }
  ]

  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes, not months.
          </p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-8 relative">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const Highlights = () => {
  const features = [
    {
      title: "Workspace Dashboard",
      description: "Get a bird's eye view of all your projects and tasks",
      image: "/workspace-dashboard.png"
    },
    {
      title: "AI Chat Assistant",
      description: "Smart assistance right where you work",
      image: "/ai-chat.png"
    },
    {
      title: "Multiple Views",
      description: "Board, List, Timeline, Calendar, Mind-map, Docs",
      image: "/multiple-views.png"
    },
    {
      title: "Team Communication",
      description: "Real-time channels, DMs, and huddles",
      image: "/team-communication.png"
    },
    {
      title: "Calendar Integration",
      description: "Never miss a deadline or meeting",
      image: "/calendar-integration.png"
    },
    {
      title: "Admin & People Management",
      description: "Manage your organization with ease",
      image: "/admin-management.png"
    }
  ]

  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything you need</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            All the tools your team needs to collaborate effectively.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                <img 
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `https://via.placeholder.com/640x360/1e293b/64748b?text=${encodeURIComponent(feature.title)}`
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

const Integrations = () => {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Ecosystem
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Open by Design</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built to plug in later. Start fast today, add integrations when you're ready.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Use Yourever standalone from day one—boards, docs, chat, and calendar work out of the box. When you're ready to connect other tools, we'll meet you there with transparent priorities and no lock-in.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 rounded-lg border border-border/50 bg-muted/30">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Start now, switch nothing</h3>
              <p className="text-sm text-muted-foreground">
                productive without connectors
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-border/50 bg-muted/30">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Data in, data out</h3>
              <p className="text-sm text-muted-foreground">
                CSV/Markdown today; APIs & webhooks on the roadmap
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-border/50 bg-muted/30">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No lock-in</h3>
              <p className="text-sm text-muted-foreground">
                export anytime
              </p>
            </div>
          </div>
          
          <div className="text-center p-6 rounded-lg border border-border/50 bg-muted/30 mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Your vote matters</h3>
            <p className="text-sm text-muted-foreground mb-4">
              request integrations and follow the public roadmap
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button variant="outline" size="lg" className="gap-2">
              Request an integration
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              View roadmap
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Integrations are planned; timelines may change.
          </p>
        </div>
      </div>
    </section>
  )
}



const Security = () => {
  const todayFeatures = [
    "Private by default: role-based access and clear workspace boundaries.",
    "Encryption: industry-standard protection for data in transit and at rest.",
    "Least privilege: limited internal access with reviews.",
    "Backups & continuity: regular backups and recovery playbooks.",
    "Responsible logging: avoid sensitive content in logs.",
    "Your data, your call: export and delete controls."
  ]

  const nextUpFeatures = [
    "SOC 2 readiness & independent audit",
    "SSO/SAML + SCIM",
    "Advanced audit logs & admin alerts",
    "Data-processing addendum (DPA) templates",
    "Periodic penetration testing"
  ]

  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Security & privacy, from day one</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're not enterprise-certified yet—but we follow sensible, industry-standard practices and publish our roadmap.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Today Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Today</span>
              </div>
              <div className="space-y-4">
                {todayFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Next Up Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <ArrowRight className="h-5 w-5" />
                <span className="font-semibold">Next up</span>
              </div>
              <div className="space-y-4">
                {nextUpFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-primary/30 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <div className="w-2 h-2 bg-primary/60 rounded-full"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button variant="outline" size="lg" className="gap-2">
              Read our security overview
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              See the roadmap
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              Report a vulnerability
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}


const FinalCTA = () => {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to transform your workspace?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of teams already using Yourever to work better together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-100" asChild>
              <Link href="/joinwaitlist">
                Join Waitlist
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container mx-auto px-6 max-w-7xl py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="Yourever" className="h-10 w-10 rounded-lg" />
              <span className="font-bold text-xl">Yourever</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The all-in-one workspace for modern teams.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Github className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>

              <li><Link href="#integrations" className="hover:text-foreground transition-colors">Integrations</Link></li>
              <li><Link href="#changelog" className="hover:text-foreground transition-colors">Changelog</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="#blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#careers" className="hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="#contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link href="#terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link href="#security" className="hover:text-foreground transition-colors">Security</Link></li>
              <li><Link href="#status" className="hover:text-foreground transition-colors">Status</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Yourever. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <VideoPreview />
      <WhySection />
      <HowItWorks />
      <Highlights />
      <Integrations />

      <Security />
      <FinalCTA />
      <Footer />
    </div>
  )
}
