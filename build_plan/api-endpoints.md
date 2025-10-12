# FastAPI API Endpoints Specification

**Backend Framework:** FastAPI
**Authentication:** JWT + OAuth2 (Google, GitHub)
**Database:** PostgreSQL (recommended) or SQLite for development

---

## 🔐 Authentication Endpoints

### User Authentication
```typescript
POST /api/auth/login
Body: {
  email: string
  password: string
  rememberMe?: boolean
}
Response: {
  user: User
  token: string
  refreshToken: string
}

POST /api/auth/register
Body: {
  email: string
  password: string
  firstName: string
  lastName: string
}

POST /api/auth/logout
Headers: Authorization: Bearer {token}

POST /api/auth/refresh
Body: {
  refreshToken: string
}

GET /api/auth/me
Headers: Authorization: Bearer {token}
Response: User

// OAuth Endpoints
GET /api/auth/google
GET /api/auth/github
GET /api/auth/callback/{provider}
POST /api/auth/magic-link
Body: {
  email: string
}
GET /api/auth/magic-link/{token}
```

---

## 🏢 Organization Management

### Organizations
```typescript
GET /api/organizations
Headers: Authorization: Bearer {token}
Response: {
  items: Organization[]
  pagination: PaginationInfo
}

POST /api/organizations
Headers: Authorization: Bearer {token}
Body: {
  name: string
  domain?: string
  description?: string
}
Response: Organization

GET /api/organizations/{orgId}
Headers: Authorization: Bearer {token}
Response: Organization

PUT /api/organizations/{orgId}
Headers: Authorization: Bearer {token}
Body: Partial<Organization>
Response: Organization

DELETE /api/organizations/{orgId}
Headers: Authorization: Bearer {token}

GET /api/organizations/{orgId}/divisions
Headers: Authorization: Bearer {token}
Response: {
  items: Division[]
}

GET /api/organizations/{orgId}/members
Headers: Authorization: Bearer {token}
Response: {
  items: OrganizationMember[]
}

POST /api/organizations/{orgId}/members
Headers: Authorization: Bearer {token}
Body: {
  email: string
  role: 'admin' | 'member'
}

DELETE /api/organizations/{orgId}/members/{userId}
Headers: Authorization: Bearer {token}
```

### Divisions
```typescript
GET /api/organizations/{orgId}/divisions
Headers: Authorization: Bearer {token}
Response: {
  items: Division[]
}

POST /api/organizations/{orgId}/divisions
Headers: Authorization: Bearer {token}
Body: {
  name: string
  description?: string
}
Response: Division

GET /api/organizations/{orgId}/divisions/{divisionId}
Headers: Authorization: Bearer {token}
Response: Division

PUT /api/organizations/{orgId}/divisions/{divisionId}
Headers: Authorization: Bearer {token}
Body: Partial<Division>
Response: Division

DELETE /api/organizations/{orgId}/divisions/{divisionId}
Headers: Authorization: Bearer {token}
```

---

## 📊 Projects & Tasks

### Projects
```typescript
GET /api/organizations/{orgId}/divisions/{divisionId}/projects
Headers: Authorization: Bearer {token}
Query Parameters:
  - page?: number
  - limit?: number
  - status?: 'active' | 'archived' | 'all'
  - search?: string
  - assignee?: string
  - priority?: 'low' | 'medium' | 'high' | 'urgent'
Response: {
  items: Project[]
  pagination: PaginationInfo
}

POST /api/organizations/{orgId}/divisions/{divisionId}/projects
Headers: Authorization: Bearer {token}
Body: {
  name: string
  description?: string
  status?: 'active' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  dueDate?: string
  tags?: string[]
}
Response: Project

GET /api/projects/{projectId}
Headers: Authorization: Bearer {token}
Response: Project

PUT /api/projects/{projectId}
Headers: Authorization: Bearer {token}
Body: Partial<Project>
Response: Project

DELETE /api/projects/{projectId}
Headers: Authorization: Bearer {token}

GET /api/projects/{projectId}/tasks
Headers: Authorization: Bearer {token}
Response: {
  items: Task[]
}

GET /api/projects/{projectId}/timeline
Headers: Authorization: Bearer {token}
Response: {
  items: TimelineItem[]
}

GET /api/projects/{projectId}/members
Headers: Authorization: Bearer {token}
Response: {
  items: ProjectMember[]
}

POST /api/projects/{projectId}/members
Headers: Authorization: Bearer {token}
Body: {
  userId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

DELETE /api/projects/{projectId}/members/{userId}
Headers: Authorization: Bearer {token}
```

### Tasks
```typescript
GET /api/organizations/{orgId}/divisions/{divisionId}/tasks
Headers: Authorization: Bearer {token}
Query Parameters:
  - page?: number
  - limit?: number
  - status?: 'todo' | 'in_progress' | 'review' | 'done'
  - priority?: 'low' | 'medium' | 'high' | 'urgent'
  - assignee?: string
  - projectId?: string
  - dueDate?: string
  - search?: string
Response: {
  items: Task[]
  pagination: PaginationInfo
}

POST /api/organizations/{orgId}/divisions/{divisionId}/tasks
Headers: Authorization: Bearer {token}
Body: {
  title: string
  description?: string
  projectId?: string
  assigneeId?: string
  status?: 'todo' | 'in_progress' | 'review' | 'done'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  tags?: string[]
  whyNote?: string
}
Response: Task

GET /api/tasks/{taskId}
Headers: Authorization: Bearer {token}
Response: Task

PUT /api/tasks/{taskId}
Headers: Authorization: Bearer {token}
Body: Partial<Task>
Response: Task

DELETE /api/tasks/{taskId}
Headers: Authorization: Bearer {token}

// Task Comments
GET /api/tasks/{taskId}/comments
Headers: Authorization: Bearer {token}
Response: {
  items: Comment[]
}

POST /api/tasks/{taskId}/comments
Headers: Authorization: Bearer {token}
Body: {
  content: string
}
Response: Comment

PUT /api/tasks/{taskId}/comments/{commentId}
Headers: Authorization: Bearer {token}
Body: {
  content: string
}
Response: Comment

DELETE /api/tasks/{taskId}/comments/{commentId}
Headers: Authorization: Bearer {token}

// Task Subtasks
GET /api/tasks/{taskId}/subtasks
Headers: Authorization: Bearer {token}
Response: {
  items: Task[]
}

POST /api/tasks/{taskId}/subtasks
Headers: Authorization: Bearer {token}
Body: {
  title: string
}
Response: Task

// Task Relations
GET /api/tasks/{taskId}/relations
Headers: Authorization: Bearer {token}
Response: {
  items: TaskRelation[]
}

POST /api/tasks/{taskId}/relations
Headers: Authorization: Bearer {token}
Body: {
  relatedTaskId: string
  relationType: 'blocks' | 'depends_on' | 'relates_to'
}
Response: TaskRelation
```

---

## 💬 Channels & Communication

### Channels
```typescript
GET /api/organizations/{orgId}/divisions/{divisionId}/channels
Headers: Authorization: Bearer {token}
Query Parameters:
  - type?: 'public' | 'private'
  - search?: string
Response: {
  items: Channel[]
}

POST /api/organizations/{orgId}/divisions/{divisionId}/channels
Headers: Authorization: Bearer {token}
Body: {
  name: string
  type: 'public' | 'private'
  description?: string
}
Response: Channel

GET /api/channels/{channelId}
Headers: Authorization: Bearer {token}
Response: Channel

PUT /api/channels/{channelId}
Headers: Authorization: Bearer {token}
Body: Partial<Channel>
Response: Channel

DELETE /api/channels/{channelId}
Headers: Authorization: Bearer {token}

// Channel Messages
GET /api/channels/{channelId}/messages
Headers: Authorization: Bearer {token}
Query Parameters:
  - page?: number
  - limit?: number
  - before?: string (message ID for pagination)
Response: {
  items: Message[]
  pagination: PaginationInfo
}

POST /api/channels/{channelId}/messages
Headers: Authorization: Bearer {token}
Body: {
  content: string
  type?: 'text' | 'file' | 'image'
  fileUrl?: string
}
Response: Message

GET /api/channels/{channelId}/members
Headers: Authorization: Bearer {token}
Response: {
  items: ChannelMember[]
}

POST /api/channels/{channelId}/members
Headers: Authorization: Bearer {token}
Body: {
  userId: string
}
```

---

## 🔍 Search & Shortlinks

### Search
```typescript
GET /api/search/global
Headers: Authorization: Bearer {token}
Query Parameters:
  - q: string (required)
  - type?: 'all' | 'projects' | 'tasks' | 'channels' | 'people'
  - limit?: number
Response: {
  projects: Project[]
  tasks: Task[]
  channels: Channel[]
  people: User[]
}

GET /api/search/projects
Headers: Authorization: Bearer {token}
Query Parameters:
  - q: string (required)
  - orgId: string
  - divisionId: string
Response: {
  items: Project[]
}

GET /api/search/tasks
Headers: Authorization: Bearer {token}
Query Parameters:
  - q: string (required)
  - orgId: string
  - divisionId: string
Response: {
  items: Task[]
}
```

### Shortlinks
```typescript
GET /api/shortlinks/resolve/{type}/{id}
Path Parameters:
  - type: 'project' | 'task' | 'channel'
  - id: string (short ID)
Response: {
  type: string
  id: string
  shortId: string
  scopedUrl: string
}

GET /api/projects/by-shortlink/{shortId}
Response: Project

GET /api/tasks/by-shortlink/{shortId}
Response: Task

GET /api/channels/by-shortlink/{shortId}
Response: Channel
```

---

## 🛠️ Integrations

### Generic Integration Endpoints
```typescript
GET /api/integrations
Headers: Authorization: Bearer {token}
Response: {
  items: Integration[]
}

GET /api/integrations/{service}
Headers: Authorization: Bearer {token}
Response: Integration

PUT /api/integrations/{service}
Headers: Authorization: Bearer {token}
Body: {
  enabled: boolean
  displayName: string
  config: Record<string, any>
}

DELETE /api/integrations/{service}
Headers: Authorization: Bearer {token}

POST /api/integrations/{service}/test
Headers: Authorization: Bearer {token}
Body: {
  config: Record<string, any>
}
Response: {
  success: boolean
  message: string
  data?: any
}
```

### Service-Specific Endpoints

#### Slack Integration
```typescript
GET /api/integrations/slack/workspaces
Headers: Authorization: Bearer {token}
Response: {
  items: SlackWorkspace[]
}

GET /api/integrations/slack/channels
Headers: Authorization: Bearer {token}
Query Parameters:
  - workspaceId: string
Response: {
  items: SlackChannel[]
}

POST /api/integrations/slack/test
Headers: Authorization: Bearer {token}
Body: {
  botToken: string
}
```

#### Zoom Integration
```typescript
GET /api/integrations/zoom/templates
Headers: Authorization: Bearer {token}
Response: {
  items: ZoomMeetingTemplate[]
}

POST /api/integrations/zoom/test
Headers: Authorization: Bearer {token}
Body: {
  apiKey: string
  apiSecret: string
}
```

#### Gmail Integration
```typescript
GET /api/integrations/gmail/labels
Headers: Authorization: Bearer {token}
Response: {
  items: GmailLabel[]
}

POST /api/integrations/gmail/test
Headers: Authorization: Bearer {token}
Body: {
  accessToken: string
}
```

#### Google Calendar Integration
```typescript
GET /api/integrations/gcal/calendars
Headers: Authorization: Bearer {token}
Response: {
  items: GCalCalendar[]
}

POST /api/integrations/gcal/test
Headers: Authorization: Bearer {token}
Body: {
  accessToken: string
}
```

---

## 📈 Analytics & Admin

### Usage Analytics
```typescript
GET /api/organizations/{orgId}/usage
Headers: Authorization: Bearer {token}
Query Parameters:
  - startDate?: string
  - endDate?: string
Response: {
  activeUsers: number
  totalUsers: number
  projects: number
  tasks: number
  apiCalls: number
  storageUsed: number
  storageLimit: number
  userActivity: UserActivityPoint[]
  projectGrowth: GrowthData[]
}

GET /api/organizations/{orgId}/seats
Headers: Authorization: Bearer {token}
Response: {
  total: number
  used: number
  available: number
  members: SeatUsage[]
}

GET /api/organizations/{orgId}/storage
Headers: Authorization: Bearer {token}
Response: {
  total: number
  used: number
  available: number
  breakdown: StorageBreakdown[]
}
```

### Audit Logs
```typescript
GET /api/organizations/{orgId}/audit
Headers: Authorization: Bearer {token}
Query Parameters:
  - page?: number
  - limit?: number
  - actor?: string (user ID)
  - action?: string
  - resource?: string
  - startDate?: string
  - endDate?: string
Response: {
  items: AuditLog[]
  pagination: PaginationInfo
}

GET /api/organizations/{orgId}/audit/export
Headers: Authorization: Bearer {token}
Query Parameters:
  - format?: 'csv' | 'json'
  - actor?: string
  - action?: string
  - startDate?: string
  - endDate?: string
Response: File download
```

### Branding
```typescript
GET /api/organizations/{orgId}/branding
Headers: Authorization: Bearer {token}
Response: Branding

PUT /api/organizations/{orgId}/branding
Headers: Authorization: Bearer {token}
Body: {
  name: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  favicon?: string
  customCSS?: string
}
Response: Branding

POST /api/organizations/{orgId}/branding/logo
Headers: Authorization: Bearer {token}
Content-Type: multipart/form-data
Body: FormData with 'file' field
Response: {
  logoUrl: string
}
```

### Domain & SSO
```typescript
GET /api/organizations/{orgId}/domain
Headers: Authorization: Bearer {token}
Response: DomainSettings

PUT /api/organizations/{orgId}/domain
Headers: Authorization: Bearer {token}
Body: {
  domain: string
  customDomain?: string
  sslEnabled: boolean
}
Response: DomainSettings

GET /api/organizations/{orgId}/sso
Headers: Authorization: Bearer {token}
Response: SSOConfig

PUT /api/organizations/{orgId}/sso
Headers: Authorization: Bearer {token}
Body: {
  provider: 'saml' | 'oidc'
  config: Record<string, any>
}
Response: SSOConfig
```

---

## 📁 File Types & Data Models

### Core Models
```typescript
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: string
  createdAt: string
  updatedAt: string
}

interface Organization {
  id: string
  name: string
  domain?: string
  logo?: string
  description?: string
  branding?: Branding
  createdAt: string
  updatedAt: string
}

interface Division {
  id: string
  name: string
  description?: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  organizationId: string
  divisionId: string
  status: 'active' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigneeId?: string
  dueDate?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface Task {
  id: string
  title: string
  description?: string
  projectId?: string
  assigneeId?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  tags: string[]
  whyNote?: string
  createdAt: string
  updatedAt: string
}

interface Channel {
  id: string
  name: string
  type: 'public' | 'private'
  description?: string
  organizationId: string
  divisionId: string
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  content: string
  type: 'text' | 'file' | 'image'
  authorId: string
  channelId: string
  fileUrl?: string
  createdAt: string
  updatedAt: string
}
```

---

## 🔒 Security Considerations

### Authentication
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Rate limiting on auth endpoints
- Password strength requirements
- OAuth 2.0 flow for social login

### Authorization
- Role-based access control (RBAC)
- Organization-level permissions
- Division-level permissions
- Project-level permissions
- Resource-level ownership checks

### Data Validation
- Input validation using Pydantic models
- SQL injection prevention
- XSS protection
- CSRF protection
- File upload restrictions

### Rate Limiting
- Authentication endpoints: 5 requests/minute
- API endpoints: 1000 requests/hour per user
- Search endpoints: 100 requests/minute
- File upload: 10 files/minute

---

## 📊 Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Query optimization for large datasets
- Connection pooling
- Read replicas for analytics queries

### Caching Strategy
- Redis for session storage
- Application-level caching for frequently accessed data
- CDN for static assets
- Database query result caching

### API Response Optimization
- Pagination for large result sets
- Field selection (partial responses)
- Compression for large responses
- Async processing for long-running operations

---

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/dbname
DATABASE_POOL_SIZE=20

# Authentication
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# External Services
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# File Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
```

### Health Checks
```typescript
GET /api/health
Response: {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  checks: {
    database: "healthy" | "unhealthy"
    redis: "healthy" | "unhealthy"
    external_apis: "healthy" | "degraded" | "unhealthy"
  }
}
```

---

## 📝 Notes for Implementation

1. **Async Processing**: Use Celery or similar for background tasks (email sending, file processing, etc.)
2. **Webhooks**: Implement webhook support for integrations (Slack events, Zoom webhooks, etc.)
3. **File Storage**: Use S3 or similar for file uploads with proper access controls
4. **Monitoring**: Implement structured logging and metrics collection
5. **Testing**: Include comprehensive test coverage with pytest
6. **Documentation**: Generate OpenAPI/Swagger documentation automatically
7. **Migrations**: Use Alembic for database migrations
8. **Seeding**: Implement data seeding for development and testing