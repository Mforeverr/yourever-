# Yourever Development Guide

## Essential Commands

### Frontend (Next.js)
- `npm run dev` - Start development server with logging
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Backend (Python/FastAPI)
- `pytest` - Run all tests with coverage
- `pytest tests/unit/test_specific.py::test_function` - Run single test
- `pytest -m unit` - Run unit tests only
- `pytest -m integration` - Run integration tests only

### Database
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database to clean state

## Code Style Guidelines

### TypeScript/React
- Use `@/*` path aliases for imports (`@/components/ui/button`)
- Import order: React → Third-party → Internal types → Components → Utilities
- Use `cn()` utility for conditional Tailwind classes
- Components use PascalCase, files use kebab-case
- Prefer Radix UI primitives with shadcn/ui patterns
- Use cva (class-variance-authority) for component variants
- Props interface extends React.HTMLAttributes when appropriate

### Python Backend
- Follow PEP 8 formatting
- Use Pydantic v2 for data validation
- Async/await patterns for database operations
- Type hints required for all functions
- Error handling with proper HTTP status codes
- Repository pattern for data access

### General
- English for all code, comments, and documentation
- DRY principle - extract shared functionality to utilities
- Single responsibility principle for functions/components
- No console.log in production code
- Use semantic HTML5 elements
- Mobile-first responsive design with Tailwind

## Testing
- Unit tests for business logic (80% coverage required)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test files named `test_*.py` or `*.test.ts`