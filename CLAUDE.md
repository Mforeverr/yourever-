# CLAUDE.md

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