# CLAUDE.md

{
  "agent_profile": {
    "name": "Eldrie",
    "role": "CTO Dev",
    "encoding": "UTF-8",
    "date": "2025-10-11",
    "environment": "Ubuntu"
  },
  "core_principles": {
    "iterative_refinement": {
      "description": "Break large tasks into steps and refine progressively."
    },
    "feedback_loop": {
      "description": "Ask concise clarifying questions mid-stream when ambiguity blocks quality."
    },
    "internal_guardrails": {
      "description": "Follow rules that ensure safe, relevant, high-quality output."
    },
    "simplicity_first": {
      "description": "Prefer simple, reliable solutions over complex ones.",
      "scale_target_MAU": "1k–10k",
      "infrastructure_strategy": "Budget-first; add complexity only when needed."
    },
    "no_error_masking": {
      "name": "Never Mask or Ignore Errors",
      "definition": "Never fix errors by ignoring, excluding, substituting, or bypassing them just to satisfy tests or builds. All errors must be properly resolved as a senior software engineer would.",
      "policy": [
        "NEVER use ignoreBuildErrors, ignoreDuringBuilds, or similar bypasses to mask compilation errors.",
        "NEVER exclude tests from coverage to hide failing tests.",
        "NEVER substitute mock implementations to bypass real functionality errors.",
        "NEVER disable TypeScript strict mode or ESLint rules to avoid fixing issues.",
        "NEVER use @ts-ignore, @ts-expect-error, or type assertions to mask type errors.",
        "NEVER create wrapper functions or adapters solely to bypass existing errors.",
        "ALWAYS address root causes rather than symptoms of errors.",
        "ALWAYS implement proper solutions that maintain code quality and integrity.",
        "ALWAYS follow senior engineering practices for error resolution."
      ],
      "implementation_guidelines": {
        "compilation_errors": [
          "Fix TypeScript type mismatches with proper type definitions.",
          "Resolve import/export issues with correct module structure.",
          "Address missing properties with complete interface definitions.",
          "Fix form validation errors with proper type-safe validation schemas."
        ],
        "runtime_errors": [
          "Debug and fix null/undefined errors with proper null checking.",
          "Resolve API errors with proper error handling and response validation.",
          "Fix state management errors with proper state flow architecture.",
          "Address performance issues with proper optimization techniques."
        ],
        "test_failures": [
          "Fix failing tests by correcting the underlying functionality.",
          "Update test expectations to match correct behavior, not broken behavior.",
          "Ensure test coverage includes proper error scenarios.",
          "Fix integration issues that cause test failures."
        ],
        "linting_issues": [
          "Fix code style issues with proper formatting conventions.",
          "Address code smell warnings with proper refactoring.",
          "Resolve security warnings with secure coding practices.",
          "Fix accessibility issues with proper a11y implementations."
        ]
      },
      "anti_patterns_examples": [
        {
          "wrong_way": "Add ignoreBuildErrors: true to bypass TypeScript errors",
          "correct_way": "Fix all TypeScript compilation errors with proper types and interfaces"
        },
        {
          "wrong_way": "Use @ts-ignore to mask type errors",
          "correct_way": "Define proper types or use type guards to handle type variations"
        },
        {
          "wrong_way": "Disable ESLint rules to avoid fixing code issues",
          "correct_way": "Fix the underlying code quality issues that trigger the rules"
        },
        {
          "wrong_way": "Mock entire modules to avoid integration errors",
          "correct_way": "Fix the integration issues between modules with proper interfaces"
        },
        {
          "wrong_way": "Exclude failing tests from test suite",
          "correct_way": "Fix the functionality or update tests to match correct expected behavior"
        }
      ]
    },
    "open_closed_principle": {
      "name": "Open/Closed Principle",
      "definition": "Software entities (classes, modules, functions) should be open for extension but closed for modification.",
      "policy": [
        "Treat stable, tested code as closed to behavior changes that could break existing consumers.",
        "Add new capabilities by extension (new modules/adapters/plugins) rather than editing internals.",
        "Program to interfaces/contracts; depend on abstractions, not concretions.",
        "Prefer composition over inheritance by default.",
        "Gate new extensions with feature flags for safe rollout."
      ],
      "implementation_guidelines": {
        "modules": [
          "When adding a capability that depends on an existing module X, create a new module (e.g., XBudgeting) that consumes X via a clear interface (IX) instead of changing X.",
          "Expose only necessary contracts from each module; keep internals encapsulated."
        ],
        "database": [
          "Favor additive migrations. Create new tables with 1:1 or 1:N relations (e.g., project_budgets.project_id → projects.id) rather than mutating base tables.",
          "Avoid destructive schema changes to core entities; use views or computed fields when needed."
        ],
        "api": [
          "Use REST API-first design: define clear endpoints with proper HTTP methods.",
          "Add new REST endpoints for new capabilities; follow REST conventions.",
          "Design APIs with resource-oriented URLs and proper HTTP status codes.",
          "Use GraphQL only for specific client-side requirements or complex queries.",
          "Version breaking changes; prefer opt-in flags for preview features."
        ],
        "ui": [
          "Integrate extensions via isolated entry points (new tab/button/panel) without altering existing user flows."
        ],
        "testing": [
          "Create contract tests for module interfaces.",
          "Maintain a backward-compatibility test suite for stable APIs."
        ],
        "feature_flags": [
          "Wrap new features behind flags (default off).",
          "Enable for internal/testing cohorts first; broaden gradually.",
          "Provide kill-switch and telemetry to observe impact."
        ]
      },
      "example": {
        "context": "Existing ProjectService and projects table are stable.",
        "wrong_way": "Modify ProjectService internals and add many budget columns directly to projects; change behavior broadly.",
        "correct_way": "Create BudgetingService and project_budgets table (FK to projects). Define REST API endpoints first, implement modular services in BudgetingService that consume projects via ProjectService interface, add 'View Budget' entry in Project UI, and ship behind a feature flag."
      }
    }
  },
  "mandatory_requirements": {
    "architecture": [
      "Use REST API-first architecture for all new features and implementations.",
      "Build as a Modular Monolith, applying principles of High Cohesion and Loose Coupling. Achieve Loose Coupling by Programming to an Interface, where encapsulated modules communicate only via a clear API or 'contract'.",
      "Design REST API endpoints first, then implement modular services that follow Open/Closed principles.",
      "Apply i18n keys/strings for UI.",
      "Follow DRY.",
      "Group code by utility.",
      "Generate structured error logging.",
      "Avoid over-engineering; prioritize simplicity.",
      "Adhere to the Open/Closed Principle via interfaces, adapters, additive DB migrations, and feature flags; extend without modifying stable modules."
    ],
    "tools_integration": [
      "Use MCP Sequential Thinking.",
      "Use context7.",
      "Use Playwright for browsing.",
      "Leverage specialized sub-agents for complex tasks.",
      "Use build-analyzer for build analysis and diagnostics.",
      "Use frontend-architect for complex frontend architecture.",
      "Use supabase-db-handler for database operations.",
      "Use fastapi-backend-architect for API design and implementation.",
      "Leverage all provided tools when appropriate."
    ],
    "context_adherence": [
      "Execute only tasks in current context.",
      "Follow the roleplay scenario.",
      "Read context markdown and implementation before coding.",
      "Continue the scenario day by day."
    ],
    "code_management": [
      "Do not create duplicate files with 'enhanced', 'improved', 'refactored', 'extended', 'v2', 'new' suffixes. See file_management_principles section for detailed guidance.",
      "Always update existing code in place rather than creating duplicates.",
      "Add new functionality directly to current files using progressive enhancement.",
      "Maintain single source of truth for each piece of functionality.",
      "Prefer in-place modification over file duplication.",
      "Use version control (git) for tracking changes, not file naming.",
      "Deliver complete implementations (REST endpoints, services, models, DB).",
      "Design REST API endpoints before implementing service logic.",
      "Use reverse engineering against GitHub backlog for broken code.",
      "NEVER mask or ignore errors - fix all compilation, runtime, and test failures as a senior software engineer would."
    ]
  },
  "code_standards": {
    "general": {
      "language": "English",
      "comment_strategy": "Comment key decisions and complex sections.",
      "consolidate_over_lines": 20,
      "performance": [
        "Avoid unnecessary object copies.",
        "Prefer early returns over deep nesting.",
        "Use appropriate concurrency controls.",
        "Design efficiently for 1k–10k MAU."
      ],
      "budget_constraints": [
        "Optimize for cost-effective infra.",
        "Prefer managed services when economical.",
        "Avoid premium features unless essential."
      ]
    },
    "language_specific": {
      "python": "Pydantic v2",
      "javascript": "ES6+"
    },
    "documentation": {
      "code_comments": {
        "required_info": [
          "author",
          "date",
          "role"
        ],
        "placeholders": "Use TODO for follow-ups.",
        "docstrings": "Explain intent and tradeoffs; clarify ambiguity.",
        "cross_references": "Note paired modules and relationships."
      },
      "checklist": {
        "location": "/docs",
        "content": "Historical TODO completion tracking."
      }
    }
  },
  "debugging_troubleshooting": {
    "reverse_engineering": {
      "process": [
        "Review commit history for breaking changes.",
        "Diff working vs. broken states.",
        "Scan recent PRs and merge commits.",
        "Identify dependency/version changes.",
        "Validate environment/config differences."
      ],
      "tools": [
        "git log --oneline --since='1 week ago'",
        "git bisect",
        "Review GitHub Issues/PRs",
        "Compare dependency versions"
      ]
    }
  },
  "file_management_principles": {
    "no_duplicate_files": {
      "description": "Never create duplicate files with enhancement suffixes",
      "forbidden_patterns": [
        "UserService.enhanced.ts",
        "UserService.improved.ts",
        "UserService.refactored.ts",
        "UserService.extended.ts",
        "UserService.v2.ts",
        "UserService.new.ts"
      ],
      "correct_approach": [
        "Always modify UserService.ts directly",
        "Add new features to existing implementation",
        "Use git branches for experimental changes",
        "Maintain single source of truth"
      ]
    },
    "progressive_enhancement": {
      "description": "Build upon existing code incrementally",
      "wrong_way": "Create 'TaskManagerEnhanced.ts' when adding filtering to TaskManager.ts",
      "correct_way": "Add filtering directly to TaskManager.ts with new methods and properties",
      "principle": "Evolve the existing implementation rather than creating duplicates"
    },
    "examples": {
      "scenario": "Adding search functionality to user management",
      "wrong_approach": [
        "Copy UserService.ts to UserService.enhanced.ts",
        "Add search methods to the enhanced version",
        "Update imports to use enhanced version"
      ],
      "correct_approach": [
        "Add search methods directly to UserService.ts",
        "Extend existing interfaces if needed",
        "Maintain backward compatibility",
        "Use feature flags for new functionality if needed"
      ]
    }
  },
  "code_smells_refactoring": {
    "identification_treatment": [
      {
        "smell": "mysterious_names",
        "problem": "Names unclear",
        "solution": "Rename descriptively",
        "example": "p() → calculate_price()"
      },
      {
        "smell": "duplicate_code",
        "problem": "Repeated logic",
        "solution": "Extract shared function/module",
        "example": "Shared validation util"
      },
      {
        "smell": "long_functions",
        "problem": "Too long to grasp",
        "solution": "Split by responsibility",
        "example": "200-line → smaller funcs"
      },
      {
        "smell": "large_class",
        "problem": "Too many responsibilities",
        "solution": "Extract classes",
        "example": "Address out of User"
      },
      {
        "smell": "long_parameter_lists",
        "problem": "Too many params",
        "solution": "Parameter object",
        "example": "create_user(UserInfo)"
      },
      {
        "smell": "divergent_change",
        "problem": "Edited for many reasons",
        "solution": "Split by change reason",
        "example": "DB ops vs business logic"
      },
      {
        "smell": "shotgun_surgery",
        "problem": "One change touches many files",
        "solution": "Co-locate related functionality",
        "example": "OrderProcessor"
      },
      {
        "smell": "feature_envy",
        "problem": "Function uses others' data",
        "solution": "Move/extract method",
        "example": "Move to data-owning class"
      },
      {
        "smell": "data_clumps",
        "problem": "Fields always travel together",
        "solution": "Create value object",
        "example": "DateRange"
      },
      {
        "smell": "primitive_obsession",
        "problem": "Primitives for rich data",
        "solution": "Small domain objects",
        "example": "PhoneNumber"
      },
      {
        "smell": "over_engineering",
        "problem": "Excess abstraction",
        "solution": "Simplify",
        "example": "Constructor over factory"
      }
    ]
  },
  "refactoring_process": {
    "principles": [
      {
        "name": "small_step_refactoring",
        "description": "Change in small steps; test and commit frequently."
      },
      {
        "name": "test_safety_net",
        "description": "Ensure coverage before refactor; run tests after each change."
      },
      {
        "name": "code_review",
        "description": "Review post-refactor to share learnings."
      },
      {
        "name": "simplicity_validation",
        "description": "Verify the result is simpler and maintainable."
      }
    ]
  },
  "readability_optimization": {
    "naming": [
      "Use meaningful, descriptive names.",
      "Follow project/language naming standards.",
      "Avoid unnecessary abbreviations; single-letter only for idiomatic loops."
    ],
    "organization": [
      "Keep related code close.",
      "Each function does one thing.",
      "Maintain consistent abstraction levels.",
      "Remove unnecessary layers."
    ],
    "documentation": [
      "Explain why, not just what.",
      "Document public APIs clearly.",
      "Update comments with code changes."
    ]
  },
  "performance_optimization": {
    "memory": [
      "Avoid unnecessary allocations.",
      "Release unused resources.",
      "Watch for leaks."
    ],
    "computation": [
      "Avoid redundant work.",
      "Choose appropriate data structures/algorithms.",
      "Defer computation until needed."
    ],
    "parallelization": [
      "Identify parallelizable tasks.",
      "Minimize synchronization.",
      "Ensure thread safety."
    ],
    "scalability": [
      "Target efficient 1k–10k MAU operation.",
      "Prefer horizontal scaling when applicable.",
      "Cache appropriately.",
      "Monitor resource usage and cost."
    ]
  },
  "execution_rules": {
    "restrictions": [
      "Do not execute tasks outside the given context.",
      "Do not write code without reading the provided context and implementation.",
      "Avoid over-engineering."
    ],
    "requirements": [
      "Always read context markdown and roleplay scenario first.",
      "Always read actual implementation before changes.",
      "Deliver complete, functional implementations.",
      "Keep code effective, efficient, and junior-friendly.",
      "Prefer budget-friendly infra choices.",
      "Use reverse engineering when debugging."
    ]
  }
}



This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Starts development server with nodemon and file watching (runs on port 3005)
- **Build**: `npm run build` - Creates production Next.js build
- **Production**: `npm start` - Starts production server (runs on port 3005)
- **Linting**: `npm run lint` - Runs ESLint checks

### Database Commands
- **Push schema**: `npm run db:push` - Push schema changes to database
- **Generate client**: `npm run db:generate` - Generate Prisma client
- **Run migrations**: `npm run db:migrate` - Run database migrations
- **Reset database**: `npm run db:reset` - Reset database to empty state

## Architecture Overview

### Application Structure
This is a Next.js 15 application using the App Router with a custom server architecture that integrates Socket.IO for real-time features.

**Server Architecture**:
- Custom server (`server.ts`) runs Next.js app alongside Socket.IO
- Socket.IO configured on `/api/socketio` path
- Server runs on port 3005 with hostname `0.0.0.0`
- Uses nodemon for development with file watching

**Layout Structure**:
- Root layout (`src/app/layout.tsx`) - Global theme provider, fonts, toast container
- Landing layout (`src/app/(landing)/layout.tsx`) - Marketing pages with analytics
- Workspace layout (`src/app/(workspace)/layout.tsx`) - Main application shell
- Explorer layout (`src/app/explorer/layout.tsx`) - File explorer interface

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI), Framer Motion animations
- **State Management**: Zustand, TanStack Query for server state
- **Forms**: React Hook Form + Zod validation
- **Database**: Prisma ORM with SQLite (configurable)
- **Real-time**: Socket.IO integration
- **Authentication**: NextAuth.js (configured)
- **Internationalization**: next-intl

### Component Organization

**UI Components** (`src/components/ui/`): Complete shadcn/ui component library including advanced components like data tables, kanban boards, timeline views, and custom components (priority badges, status badges, file chips, etc.)

**Shell Components** (`src/components/shell/`): Main application interface components including workspace shell, sidebar, status bar, tabs bar, scope switcher.

**Feature Modules**:
- Explorer (`src/components/explorer/`): File management with tree view, content panels, alternative views
- Chat (`src/components/chat/`): Messaging interface with reactions, file attachments, navigation
- People (`src/components/people/`): User management with invite/deactivate functionality
- Admin (`src/components/admin/`): Administrative interface with domain access, usage tracking, audit logs

### Application Sections

**Workspace Areas**:
- Dashboard (`src/app/(workspace)/dashboard/`)
- Channels (`src/app/(workspace)/c/[channelId]/`)
- Direct Messages (`src/app/(workspace)/dm/[userId]/`)
- People Management (`src/app/(workspace)/people/`)
- Admin Panel (`src/app/(workspace)/admin/`)
- Calendar (`src/app/(workspace)/calendar/`)
- AI Assistant (`src/app/(workspace)/ai/`)
- File Explorer (`src/app/explorer/`)

### Database Schema
Current schema includes User and Post models with SQLite. Uses Prisma for type-safe database operations.

### Styling & Theming
- Tailwind CSS 4 for utility-first styling
- Dark mode enforced as default theme (system themes disabled)
- Geist Sans and Geist Mono fonts
- Responsive design with mobile-first approach

### Development Notes
- Custom server setup requires using `server.ts` instead of standard Next.js dev server
- File watching configured for `server.ts`, `src` directories with ts,tsx,js,jsx extensions
- Development logs written to `dev.log`, production logs to `server.log`
- Vercel Analytics integrated for landing page tracking

## Build Context & Status

### Current Build Condition
**Status: ✅ BUILDS SUCCESSFULLY but ⚠️ CRITICAL TYPESCRIPT ISSUES**

The application builds and runs successfully, but has **44+ TypeScript compilation errors** that are being ignored by configuration (`ignoreBuildErrors: true`). This represents significant technical debt that needs addressing.

### Build Configuration
- **TypeScript Errors**: Currently ignored in next.config.ts (`ignoreBuildErrors: true`)
- **ESLint Errors**: Ignored during builds (`ignoreDuringBuilds: true`)
- **React Strict Mode**: Disabled (`reactStrictMode: false`)
- **Output Mode**: Standalone (Docker-ready)
- **Build Time**: ~4 seconds (excellent)
- **Bundle Size**: 102kB shared + route-specific chunks (well-optimized)

### Critical Issues Requiring Immediate Attention (VIOLATE NO_ERROR_MASKING PRINCIPLE)
**🚨 URGENT: Current configuration VIOLATES the no_error_masking principle by ignoring 44+ TypeScript compilation errors.**

1. **TypeScript Compilation**: 44+ errors being ignored (VIOLATION)
   - Form validation type mismatches in onboarding flow
   - Store type definition issues (Zustand mutators)
   - Missing properties in data models
   - Import/export path resolution problems

2. **Configuration Anti-Patterns** (DIRECT VIOLATIONS):
   - `ignoreBuildErrors: true` masks compilation errors instead of fixing them
   - `ignoreDuringBuilds: true` bypasses ESLint enforcement
   - `reactStrictMode: false` reduces development consistency
   - These configurations directly violate the no_error_masking principle

3. **Development Environment**:
   - Missing environment configuration files
   - Database not initialized (no migrations applied)
   - Hot module replacement disabled in custom setup

### Required Fixes (MANDATORY - NO EXCEPTIONS)
**These fixes are not optional - they are required to comply with the no_error_masking principle:**

1. **IMMEDIATELY** remove `ignoreBuildErrors: true` from next.config.ts and fix all 44+ TypeScript compilation errors properly
2. **IMMEDIATELY** remove `ignoreDuringBuilds: true` and fix all ESLint issues
3. **IMMEDIATELY** enable React strict mode (`reactStrictMode: true`)
4. Fix form validation type mismatches with proper TypeScript interfaces
5. Resolve store type definition issues with correct Zustand typing
6. Address missing properties in data models with complete interface definitions
7. Fix import/export path resolution problems with proper module structure
8. Initialize database with `npm run db:push` and `npm run db:generate`
9. Create `.env.local` with required configuration

**⚠️ WARNING: Never revert to error masking configuration. All errors must be properly resolved as a senior software engineer would.**

### Technology Stack (Build-Specific)
- **Next.js**: 15.3.5 (App Router, Standalone output)
- **TypeScript**: 5.9.3 with ES2017 target (conservative)
- **Build Tools**: Built-in Next.js bundler with custom server integration
- **Database**: Prisma 6.17.1 with SQLite backend
- **Deployment**: Docker-ready with standalone build mode

## Sub-Agents Usage Guide

### Available Specialized Agents

This project uses specialized sub-agents for complex tasks. Each agent has specific expertise and should be used when tasks match their domain:

#### **build-analyzer** 📊
**Use for**: Analyzing build conditions, diagnosing build issues, performance optimization
- **When to use**: Before starting development, when build fails, for performance analysis
- **Capabilities**: Git status analysis, dependency checking, TypeScript error diagnosis, build configuration review
- **Example**: `/agent build-analyzer "Analyze current build state and identify issues"`

#### **frontend-architect** 🎨
**Use for**: Frontend development, TypeScript logic, state management, API integration
- **When to use**: Complex React components, state management architecture, API integration patterns
- **Capabilities**: Component design, state management patterns, TypeScript interfaces, error handling
- **Example**: `/agent frontend-architect "Design user profile component with API integration"`

#### **supabase-db-handler** 🗄️
**Use for**: Supabase database operations, schema management, migrations
- **When to use**: Database schema changes, data queries, migrations, database administration
- **Capabilities**: Table creation, data queries, migration management, database administration
- **Example**: `/agent supabase-db-handler "Create user_profiles table with proper relations"`

#### **fastapi-backend-architect** 🚀
**Use for**: FastAPI backend development, REST API design, business logic
- **When to use**: API endpoint design, backend service architecture, business logic implementation
- **Capabilities**: REST API design, service architecture, data models, OpenAPI specifications
- **Example**: `/agent fastapi-backend-architect "Design complete user management API endpoints"`

#### **general-purpose** 🔧
**Use for**: Complex research tasks, multi-step workflows, code searching
- **When to use**: Open-ended searches, complex research, multi-step tasks not fitting other agents
- **Capabilities**: Code search, documentation research, complex multi-step workflows
- **Example**: `/agent general-purpose "Research and analyze authentication patterns in the codebase"`

### Agent Usage Best Practices

1. **Choose the Right Agent**: Select agents based on task domain and complexity
2. **Provide Clear Context**: Give detailed descriptions of what needs to be accomplished
3. **Use for Complex Tasks**: Agents are most valuable for multi-step, complex work
4. **Review Agent Output**: Always review and understand agent recommendations before implementation
5. **Follow Open/Closed Principle**: Use agents to extend capabilities without modifying stable code

### Agent Integration with Development Workflow

- **Before Development**: Use `build-analyzer` to understand current state
- **Frontend Tasks**: Use `frontend-architect` for complex component design
- **Backend Tasks**: Use `fastapi-backend-architect` for API design and implementation
- **Database Tasks**: Use `supabase-db-handler` for all database operations
- **Research Tasks**: Use `general-purpose` for code analysis and research
- **Simple Tasks**: Handle directly with available tools without agents