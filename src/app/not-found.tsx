import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Image */}
            <div className="lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 lg:p-12 flex items-center justify-center">
              <div className="relative">
                {/* Placeholder for 404 image */}
                <div className="w-64 h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-700 dark:to-indigo-800 rounded-2xl shadow-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl lg:text-8xl font-bold text-white mb-2">404</div>
                    <div className="text-white/80 text-sm">Image Placeholder</div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-400 rounded-full opacity-60 blur-xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-pink-400 rounded-full opacity-60 blur-xl"></div>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2">
                    404 Not Found
                  </h1>
                  <p className="text-xl lg:text-2xl text-slate-600 dark:text-slate-300 font-medium">
                    Coming back later!
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-400">
                    Oops! The page you're looking for seems to have vanished into the digital void.
                    Don't worry, even the best explorers get lost sometimes.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button asChild variant="default" size="lg">
                      <Link href="/" className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Go Home
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg">
                      <Link href="javascript:history.back()" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                      </Link>
                    </Button>

                    <Button asChild variant="ghost" size="lg">
                      <Link href="/search" className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Additional help section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    You might be looking for:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      → Dashboard
                    </Link>
                    <Link href="/workspace" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      → Workspace
                    </Link>
                    <Link href="/calendar" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      → Calendar
                    </Link>
                    <Link href="/people" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      → People
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-8 text-slate-500 dark:text-slate-400 text-sm">
          <p>
            If you believe this is an error, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  )
}