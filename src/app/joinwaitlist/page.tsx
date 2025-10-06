'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp, ArrowLeft, Check } from 'lucide-react'
import { Analytics } from "@vercel/analytics/next"

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    {
      question: "Why are you implementing a waitlist?",
      answer: "Because currently Yourever is Built by Solo Developer, He is doing the best to create this for You."
    },
    {
      question: "I joined the waitlist. When will I hear back?",
      answer: "We're rolling out access in batches. You'll receive an email when our MVP is ready."
    },
    {
      question: "Is Yourever free to use?",
      answer: "Yes! We offer a generous free tier for individuals and small teams. Premium features will be available for larger organizations."
    },
    {
      question: "What makes Yourever different from other tools?",
      answer: "Yourever unifies all your work tools in one place - tasks, docs, chat, timelines, and more. No more switching between apps or losing context."
    },
    {
      question: "Can I invite my team?",
      answer: "Absolutely! Once you get access, you can invite your entire team. We're designed for collaboration from day one."
    }
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-8 text-center">Common questions</h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  openIndex === index ? 'border-white bg-white' : 'border-zinc-600'
                }`}>
                  {openIndex === index && (
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                  )}
                </div>
                <span className="text-white font-medium">{faq.question}</span>
              </div>
              <div className={`transform transition-transform duration-200 ${
                openIndex === index ? 'rotate-180' : ''
              }`}>
                <ChevronDown className="h-5 w-5 text-zinc-400" />
              </div>
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 pl-14">
                <p className="text-zinc-300 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function JoinWaitlist() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        console.error('Failed to submit email')
      }
    } catch (error) {
      console.error('Failed to submit email:', error)
    }

    setIsLoading(false)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">You're on the list!</h1>

            {/* Mascot */}
            <div className="relative flex justify-center my-8">
              <div className="relative group">
                {/* Mascot image */}
                <img
                  src="/Yourever.png"
                  alt="Yourever Mascot"
                  className="w-64 h-64 object-contain animate-bounce"
                  style={{ animationDuration: '3s' }}
                />

                {/* Speech bubble */}
                <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-white text-black px-6 py-3 rounded-lg shadow-lg text-lg font-medium whitespace-nowrap">
                    See you soon!
                    <div className="absolute bottom-0 right-6 transform translate-y-2 rotate-45 w-3 h-3 bg-white"></div>
                  </div>
                </div>

                {/* Pulse ring animation */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
              </div>
            </div>

            <p className="text-xl text-zinc-300 mb-8">
              Thanks for joining the Yourever waitlist. We'll send you an email soon with your access date.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button asChild className="bg-white hover:bg-gray-100 text-black px-8 py-3">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur">
        <div className="container mx-auto px-6 max-w-7xl flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ArrowLeft className="h-5 w-5 text-zinc-400 hover:text-white transition-colors" />
            <span className="text-zinc-400 hover:text-white transition-colors">Back to home</span>
          </Link>
          
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Yourever" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-xl">Yourever</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 max-w-7xl py-20">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold mb-6">
            Thank you for your amazing response to Yourever!
          </h1>
          <p className="text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">
            We're working hard to bring you the best unified workspace experience. Join our waitlist to be the first to know when we launch.
          </p>
          
          {/* Email Signup Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-16">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 px-4 py-3 rounded-lg flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !email}
                className="bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Joining...' : 'Join Waitlist'}
              </Button>
            </div>
            <p className="text-sm text-zinc-500 mt-3">
              No spam, unsubscribe at any time.
            </p>
          </form>
        </div>

        {/* FAQ Section */}
        <FAQ />
      </div>
      <Analytics />
    </div>
  )
}