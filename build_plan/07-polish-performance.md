# Phase 7: Polish & Performance

**Timeline:** Week 4
**Goal:** Accessibility compliance, performance optimization, and testing setup

---

## 🚀 Task 7.1: Accessibility Improvements
**Estimate:** 0.5 day
**Priority:** High

### Files to modify:
```
src/components/ui/button.tsx (enhance)
src/components/ui/input.tsx (enhance)
src/components/shell/workspace-shell.tsx (enhance)
src/components/global/command-palette.tsx (enhance)
Multiple form components
```

### Implementation steps:
1. **Add ARIA labels** and descriptions throughout
2. **Implement keyboard navigation** for all interactive elements
3. **Add focus management** for modals and dropdowns
4. **Test with screen readers** and fix issues

### Code Structure:
```typescript
// Enhanced button component
const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    'aria-label'?: string
    'aria-describedby'?: string
  }
>(({ children, className, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {children}
    </button>
  )
})

// Enhanced command palette with accessibility
const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <CommandInput
          ref={inputRef}
          onKeyDown={handleKeyDown}
          aria-label="Search commands and actions"
        />
        <CommandList ref={listRef} role="listbox" aria-activedescendant={`option-${selectedIndex}`}>
          {results.map((result, index) => (
            <CommandItem
              key={result.id}
              id={`option-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              onMouseEnter={() => setSelectedIndex(index)}
              onSelect={() => handleSelect(result)}
            >
              {result.title}
            </CommandItem>
          ))}
        </CommandList>
      </DialogContent>
    </Dialog>
  )
}

// Focus management for modals
const useFocusTrap = (isOpen: boolean) => {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [isOpen])

  return containerRef
}
```

### Accessibility Checklist:
- [ ] All interactive elements have keyboard access
- [ ] ARIA labels and descriptions added
- [ ] Focus management implemented for modals
- [ ] Screen reader announcements working
- [ ] Color contrast ratios meet WCAG AA standards
- [ ] Text can be resized to 200% without breaking layout
- [ ] Forms have proper error association

---

## 🚀 Task 7.2: Performance Optimization
**Estimate:** 0.5 day
**Priority:** High

### Files to modify:
```
next.config.ts (optimize)
src/app/layout.tsx (optimize)
src/components/shell/workspace-shell.tsx (optimize)
Large component files
```

### Implementation steps:
1. **Implement code splitting** for large components
2. **Add image optimization** with Next.js Image component
3. **Optimize bundle size** with dynamic imports
4. **Add loading skeletons** and progressive loading

### Code Structure:
```typescript
// next.config.ts optimization
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['example.com'],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            priority: -15,
            chunks: 'all',
          },
        },
      }
    }
    return config
  },
}

// Dynamic imports for large components
const ProjectDetailPage = dynamic(() => import('./project-detail-page'), {
  loading: () => <ProjectDetailSkeleton />,
  ssr: false, // Client-side only for complex interactions
})

const AdminDashboard = dynamic(() => import('./admin-dashboard'), {
  loading: () => <AdminSkeleton />,
})

// Optimized workspace shell with React.memo
const WorkspaceShell = React.memo(({ children }: WorkspaceShellProps) => {
  const { orgId, divisionId } = useScope()
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useUIStore(state => [
    state.leftSidebarCollapsed,
    state.toggleLeftSidebar
  ])

  // Use useMemo for expensive computations
  const navigationItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, href: `/${orgId}/${divisionId}/dashboard` },
    { id: 'workspace', label: 'Workspace', icon: Folder, href: `/${orgId}/${divisionId}/workspace` },
    // ... other items
  ], [orgId, divisionId])

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Optimized JSX */}
    </div>
  )
})

WorkspaceShell.displayName = 'WorkspaceShell'

// Image optimization
const OptimizedAvatar = ({ src, alt, size }: AvatarProps) => {
  return (
    <div className="relative">
      <Image
        src={src || '/default-avatar.png'}
        alt={alt}
        width={size}
        height={size}
        className="rounded-full object-cover"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
      />
    </div>
  )
}

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window'

const VirtualizedTaskList = ({ tasks }: { tasks: Task[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TaskItem task={tasks[index]} />
    </div>
  )

  return (
    <List
      height={400}
      itemCount={tasks.length}
      itemSize={60}
      className="border rounded-md"
    >
      {Row}
    </List>
  )
}
```

### Performance Checklist:
- [ ] Code splitting implemented for large components
- [ ] Images optimized with Next.js Image component
- [ ] Bundle size analyzed and optimized
- [ ] React.memo used for expensive components
- [ ] useMemo and useCallback used appropriately
- [ ] Virtual scrolling for large lists
- [ ] Loading skeletons implemented
- [ ] Lighthouse performance score > 90

---

## 🚀 Task 7.3: Error Handling & Edge Cases
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/components/error/error-boundary.tsx (new)
src/components/error/error-fallback.tsx (new)
src/components/error/network-error.tsx (new)
src/components/error/not-found.tsx (new)
src/components/loading/skeletons.tsx (new)
src/components/loading/empty-states.tsx (new)
```

### Implementation steps:
1. **Add comprehensive error boundaries** at strategic levels
2. **Implement retry logic** for API calls
3. **Add empty states** for all data displays
4. **Create 404 and error pages**

### Code Structure:
```typescript
// error-boundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo })

    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo)

    // Send to monitoring service (Sentry, etc.)
    if (typeof window !== 'undefined') {
      // Error reporting service integration
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error!}
          retry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

// error-fallback.tsx
const DefaultErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex items-center justify-center min-h-screen p-4">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          <div className="space-y-2">
            <Button onClick={retry} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)

// skeletons.tsx
export const ProjectSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-3 w-[200px]" />
      </div>
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-[100px] mb-2" />
            <Skeleton className="h-8 w-[60px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)

export const TaskTableSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
)

// empty-states.tsx
export const EmptyProjects = () => (
  <div className="flex flex-col items-center justify-center h-96 text-center">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
      <Folder className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
    <p className="text-muted-foreground mb-4 max-w-sm">
      Create your first project to start organizing your work
    </p>
    <Button onClick={() => setShowCreateProject(true)}>
      <Plus className="w-4 h-4 mr-2" />
      Create Project
    </Button>
  </div>
)

export const EmptySearchResults = ({ query }: { query: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-center">
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
      <Search className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No results found</h3>
    <p className="text-muted-foreground mb-4 max-w-sm">
      We couldn't find anything matching "{query}"
    </p>
    <div className="space-x-2">
      <Button variant="outline" onClick={() => setSearchQuery('')}>
        Clear search
      </Button>
      <Button onClick={() => setShowAdvancedSearch(true)}>
        Advanced search
      </Button>
    </div>
  </div>
)
```

### Error Handling Checklist:
- [ ] Error boundaries implemented at app, page, and component levels
- [ ] Retry mechanisms for failed API calls
- [ ] Empty states for all data displays
- [ ] 404 page implemented
- [ ] Network error handling
- [ ] Graceful degradation for JavaScript failures
- [ ] User-friendly error messages

---

## 🚀 Task 7.4: Testing Setup
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
jest.config.js (new)
src/test/__mocks__/ (new directory)
src/test/setup.ts (new)
src/test/utils.tsx (new)
src/components/__tests__/ (new directories)
```

### Implementation steps:
1. **Set up testing framework** (Jest + React Testing Library)
2. **Add unit tests** for critical components
3. **Implement integration tests** for user flows
4. **Add E2E tests** for critical journeys

### Code Structure:
```typescript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)

// src/test/setup.ts
import '@testing-library/jest-dom'
import { server } from './__mocks__/server'

// Establish API mocking before all tests
beforeAll(() => server.listen())

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())

// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Component test example
// src/components/ui/__tests__/button.test.tsx
import { render, screen, fireEvent } from '@/test/utils'
import { Button } from '../button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button disabled>Loading...</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })
})

// Integration test example
// src/app/__tests__/project-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { ProjectPage } from '../projects/[projectId]/page'

// Mock API responses
import { mockProject, mockTasks } from '@/test/__mocks__/data'

describe('Project Flow', () => {
  it('allows user to view project details and create tasks', async () => {
    render(<ProjectPage params={{ orgId: 'org1', divisionId: 'div1', projectId: 'proj1' }} />)

    // Wait for project to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Navigate to tasks tab
    fireEvent.click(screen.getByText('Tasks'))

    // Create new task
    fireEvent.click(screen.getByText('Add Task'))
    fireEvent.change(screen.getByLabelText('Task Title'), {
      target: { value: 'New Test Task' }
    })
    fireEvent.click(screen.getByText('Create Task'))

    // Verify task was created
    await waitFor(() => {
      expect(screen.getByText('New Test Task')).toBeInTheDocument()
    })
  })
})

// E2E test example (Playwright)
// e2e/project-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to project
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password')
    await page.click('[data-testid=login-button]')
    await page.waitForURL('/dashboard')
  })

  test('can create and manage projects', async ({ page }) => {
    // Navigate to workspace
    await page.click('[data-testid=workspace-tab]')

    // Create new project
    await page.click('[data-testid=create-project-button]')
    await page.fill('[data-testid=project-name]', 'E2E Test Project')
    await page.fill('[data-testid=project-description]', 'This is a test project')
    await page.click('[data-testid=create-project-submit]')

    // Verify project was created
    await expect(page.locator('text=E2E Test Project')).toBeVisible()

    // Add task to project
    await page.click('[data-testid=add-task-button]')
    await page.fill('[data-testid=task-title]', 'E2E Test Task')
    await page.click('[data-testid=create-task-submit]')

    // Verify task was added
    await expect(page.locator('text=E2E Test Task')).toBeVisible()
  })
})
```

### Testing Checklist:
- [ ] Jest and React Testing Library configured
- [ ] Unit tests for critical components
- [ ] Integration tests for user flows
- [ ] E2E tests for critical journeys
- [ ] Coverage thresholds met
- [ ] Test CI/CD pipeline configured
- [ ] Mock data and API handlers set up

---

## 🎯 Phase 7 Success Criteria

### Functional Requirements:
- [ ] Full WCAG AA accessibility compliance
- [ ] Lighthouse performance score > 90
- [ ] Comprehensive error handling
- [ ] Test coverage > 80%
- [ ] All edge cases handled gracefully

### Technical Requirements:
- [ ] Code splitting implemented
- [ ] Bundle size optimized
- [ ] Error boundaries at strategic levels
- [ ] Loading states everywhere
- [ ] Retry mechanisms for failures

### Quality Requirements:
- [ ] Unit tests for all components
- [ ] Integration tests for user flows
- [ ] E2E tests for critical paths
- [ ] Performance monitoring
- [ ] Error tracking implemented

---

## 🔗 Dependencies

**Prerequisites:** All previous phases (1-6)
**Blocking:** None (Final phase)
**Parallel:** Performance monitoring and testing tools setup

---

## 📝 Notes

- **Monitoring:** Set up performance monitoring (Lighthouse CI, Web Vitals)
- **Error Tracking:** Integrate error reporting service (Sentry, etc.)
- **Analytics:** Track user interactions and performance metrics
- **Documentation:** Create component documentation and testing guides
- **CI/CD:** Configure automated testing and deployment pipelines