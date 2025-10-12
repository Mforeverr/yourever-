# Phase 4: Entity Pages & Shortlinks

**Timeline:** Week 2-3
**Goal:** Implement project and task detail pages with shortlink resolution

---

## 🚀 Task 4.1: Project Detail Page
**Estimate:** 1 day
**Priority:** High

### Files to create:
```
src/app/[orgId]/[divisionId]/projects/[projectId]/page.tsx (new)
src/components/entities/project-header.tsx (new)
src/components/entities/project-tabs.tsx (new)
src/components/entities/project-members.tsx (new)
src/components/entities/project-settings.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
GET /api/projects/{projectId}           // Project details
PUT /api/projects/{projectId}           // Update project
DELETE /api/projects/{projectId}        // Delete project
GET /api/projects/{projectId}/tasks     // Project tasks
GET /api/projects/{projectId}/timeline  // Project timeline
GET /api/projects/{projectId}/docs      // Project docs
GET /api/projects/{projectId}/members   // Project members
POST /api/projects/{projectId}/members  // Add member
DELETE /api/projects/{projectId}/members/{userId} // Remove member
```

### Implementation steps:
1. **Create project detail page** with tabs (Overview/Tasks/Timeline/Docs/Settings)
2. **Add inline project name editing**
3. **Implement project member management**
4. **Add project settings and actions**
5. **Create project overview dashboard**

### Code Structure:
```typescript
// project-header.tsx
interface ProjectHeaderProps {
  project: Project
  isEditing: boolean
  onEdit: () => void
  onSave: (data: Partial<Project>) => void
  onCancel: () => void
}

// project-tabs.tsx
const projectTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings }
]

// page.tsx
const ProjectPage = ({ params }: { params: { orgId: string, divisionId: string, projectId: string } }) => {
  const { project, isLoading, error } = useProject(params.projectId)
  const [activeTab, setActiveTab] = useState('overview')

  if (isLoading) return <ProjectSkeleton />
  if (error) return <ErrorState error={error} />
  if (!project) return <NotFoundState />

  return (
    <div className="h-full flex flex-col">
      <ProjectHeader project={project} />
      <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <ProjectOverview project={project} />}
        {activeTab === 'tasks' && <ProjectTasks projectId={project.id} />}
        {activeTab === 'timeline' && <ProjectTimeline projectId={project.id} />}
        {activeTab === 'docs' && <ProjectDocs projectId={project.id} />}
        {activeTab === 'settings' && <ProjectSettings project={project} />}
      </div>
    </div>
  )
}
```

### Acceptance Criteria:
- [ ] Project detail page loads correctly
- [ ] Inline project name editing working
- [ ] Tab navigation functional
- [ ] Member management implemented
- [ ] Project settings accessible
- [ ] Breadcrumb navigation shows project path

---

## 🚀 Task 4.2: Task Detail Page
**Estimate:** 1 day
**Priority:** High

### Files to create:
```
src/app/[orgId]/[divisionId]/tasks/[taskId]/page.tsx (new)
src/components/entities/task-header.tsx (new)
src/components/entities/task-properties-grid.tsx (new)
src/components/entities/why-note-editor.tsx (new)
src/components/entities/task-comments.tsx (new)
src/components/entities/task-subtasks.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
GET /api/tasks/{taskId}                 // Task details
PUT /api/tasks/{taskId}                 // Update task
DELETE /api/tasks/{taskId}              // Delete task
GET /api/tasks/{taskId}/comments        // Task comments
POST /api/tasks/{taskId}/comments       // Add comment
PUT /api/tasks/{taskId}/comments/{commentId} // Update comment
DELETE /api/tasks/{taskId}/comments/{commentId} // Delete comment
GET /api/tasks/{taskId}/subtasks        // Task subtasks
POST /api/tasks/{taskId}/subtasks       // Add subtask
PUT /api/tasks/{taskId}/subtasks/{subtaskId} // Update subtask
GET /api/tasks/{taskId}/relations       // Task relations
POST /api/tasks/{taskId}/relations      // Add relation
```

### Implementation steps:
1. **Create task detail page** with properties grid
2. **Add inline task editing capabilities**
3. **Implement assignee, priority, status selectors**
4. **Add comments and activity feed**
5. **Implement sub-tasks and relationships**

### Code Structure:
```typescript
// task-properties-grid.tsx
interface TaskPropertiesGridProps {
  task: Task
  onUpdate: (field: string, value: any) => void
}

const TaskPropertiesGrid = ({ task, onUpdate }: TaskPropertiesGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <PropertyRow
        label="Assignee"
        value={<AssigneeSelector value={task.assigneeId} onChange={(assignee) => onUpdate('assigneeId', assignee.id)} />}
      />
      <PropertyRow
        label="Priority"
        value={<PriorityBadge value={task.priority} onChange={(priority) => onUpdate('priority', priority)} />}
      />
      <PropertyRow
        label="Status"
        value={<StatusBadge value={task.status} onChange={(status) => onUpdate('status', status)} />}
      />
      <PropertyRow
        label="Due Date"
        value={<DatePicker value={task.dueDate} onChange={(date) => onUpdate('dueDate', date)} />}
      />
      <PropertyRow
        label="Tags"
        value={<TagSelector value={task.tags} onChange={(tags) => onUpdate('tags', tags)} />}
        colSpan={2}
      />
    </div>
  )
}

// why-note-editor.tsx
const WhyNoteEditor = ({ taskId, initialContent }: { taskId: string, initialContent?: string }) => {
  const [content, setContent] = useState(initialContent || '')
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="p-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Why?</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Save' : 'Edit'}
        </Button>
      </div>
      {isEditing ? (
        <RichTextEditor value={content} onChange={setContent} />
      ) : (
        <div className="text-sm text-muted-foreground">
          {content || 'Add context about why this task matters...'}
        </div>
      )}
    </div>
  )
}

// page.tsx
const TaskPage = ({ params }: { params: { orgId: string, divisionId: string, taskId: string } }) => {
  const { task, isLoading, error } = useTask(params.taskId)

  if (isLoading) return <TaskSkeleton />
  if (error) return <ErrorState error={error} />
  if (!task) return <NotFoundState />

  return (
    <div className="h-full flex flex-col">
      <TaskHeader task={task} />
      <TaskPropertiesGrid task={task} onUpdate={handleUpdate} />
      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <TaskDescription task={task} onUpdate={handleUpdate} />
            </TabsContent>
            <TabsContent value="comments" className="mt-4">
              <TaskComments taskId={task.id} />
            </TabsContent>
            <TabsContent value="subtasks" className="mt-4">
              <TaskSubtasks taskId={task.id} />
            </TabsContent>
          </Tabs>
        </div>
        <WhyNoteEditor taskId={task.id} initialContent={task.whyNote} />
      </div>
    </div>
  )
}
```

### Acceptance Criteria:
- [ ] Task detail page loads correctly
- [ ] Properties grid functional with all fields
- [ ] Inline editing working for all properties
- [ ] Comments system functional
- [ ] Subtasks management working
- [ ] Why note editor implemented
- [ ] Breadcrumb navigation shows task path

---

## 🚀 Task 4.3: Shortlink Resolution Pages
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/app/p/[projectId]/page.tsx (new)
src/app/t/[taskId]/page.tsx (new)
src/app/c/[channelId]/page.tsx (new)
src/components/global/resolving-splash.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
GET /api/shortlinks/resolve/{type}/{id} // Resolve shortlink to scoped URL
GET /api/projects/by-shortlink/{id}     // Get project by short ID
GET /api/tasks/by-shortlink/{id}        // Get task by short ID
GET /api/channels/by-shortlink/{id}     // Get channel by short ID
```

### Implementation steps:
1. **Create resolving splash screen component**
2. **Implement shortlink resolution logic**
3. **Add automatic redirect** to scoped workspace
4. **Handle invalid shortlinks gracefully**

### Code Structure:
```typescript
// resolving-splash.tsx
const ResolvingSplash = ({ type, shortId }: { type: 'project' | 'task' | 'channel', shortId: string }) => {
  const [isResolving, setIsResolving] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)

  useEffect(() => {
    const resolveShortlink = async () => {
      try {
        const response = await fetch(`/api/shortlinks/resolve/${type}/${shortId}`)
        if (!response.ok) {
          throw new Error('Shortlink not found')
        }
        const data = await response.json()
        setResolvedUrl(data.scopedUrl)

        // Redirect after brief delay
        setTimeout(() => {
          window.location.href = data.scopedUrl
        }, 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve')
      } finally {
        setIsResolving(false)
      }
    }

    resolveShortlink()
  }, [type, shortId])

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {isResolving ? (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <h2 className="text-lg font-semibold">Resolving {type}...</h2>
              <p className="text-muted-foreground">Finding your {type} in the workspace</p>
            </div>
          </>
        ) : error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <X className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{type} not found</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </>
        ) : resolvedUrl ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{type} found!</h2>
              <p className="text-muted-foreground">Redirecting to your {type}...</p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// p/[projectId]/page.tsx
const ProjectShortlinkPage = ({ params }: { params: { projectId: string } }) => {
  return <ResolvingSplash type="project" shortId={params.projectId} />
}

// t/[taskId]/page.tsx
const TaskShortlinkPage = ({ params }: { params: { taskId: string } }) => {
  return <ResolvingSplash type="task" shortId={params.taskId} />
}

// c/[channelId]/page.tsx
const ChannelShortlinkPage = ({ params }: { params: { channelId: string } }) => {
  return <ResolvingSplash type="channel" shortId={params.channelId} />
}
```

### Acceptance Criteria:
- [ ] Shortlink pages show resolving splash screen
- [ ] Automatic redirect to scoped workspace working
- [ ] Error handling for invalid shortlinks
- [ ] Smooth transitions and loading states
- [ ] Back navigation options provided

---

## 🚀 Task 4.4: Entity List Views Enhancement
**Estimate:** 0.5 day
**Priority:** Medium

### Files to modify:
```
src/app/[orgId]/[divisionId]/workspace/page.tsx
src/components/data-views/kanban-board.tsx (enhance)
src/components/data-views/data-table.tsx (enhance)
src/components/data-views/timeline-view.tsx (enhance)
```

### Implementation steps:
1. **Enhance workspace page** with better entity navigation
2. **Add links to entity detail pages** from list views
3. **Implement hover previews** for entities
4. **Add keyboard navigation** to entity lists

### Acceptance Criteria:
- [ ] Entity items clickable to detail pages
- [ ] Hover previews working
- [ ] Keyboard navigation implemented
- [ ] Search functionality enhanced
- [ ] Filter options working correctly

---

## 🎯 Phase 4 Success Criteria

### Functional Requirements:
- [ ] Project detail pages fully functional
- [ ] Task detail pages with all properties
- [ ] Shortlink resolution working for all entity types
- [ ] Entity list views enhanced with navigation
- [ ] Breadcrumb navigation showing entity hierarchy

### Technical Requirements:
- [ ] FastAPI endpoints integrated correctly
- [ ] TanStack Query caching implemented
- [ ] Error handling for all API calls
- [ ] Loading states and skeletons implemented
- [ ] Performance optimized for entity pages

### UX Requirements:
- [ ] Smooth transitions between entity pages
- [ ] Inline editing working seamlessly
- [ ] Keyboard navigation fully supported
- [ ] Mobile-responsive design
- [ ] Accessibility compliance maintained

---

## 🔗 Dependencies

**Prerequisites:** Phase 1 (Foundation & Routing), Phase 3 (Global Integrations)
**Blocking:** Phase 5 (Admin Integrations)
**Parallel:** FastAPI entity endpoints

---

## 📝 Notes

- **SEO:** Entity pages should have proper meta tags
- **Performance:** Implement efficient data fetching with proper caching
- **Security:** Validate user permissions for entity access
- **Analytics:** Track entity page views and interactions
- **Mobile:** Ensure entity pages work well on mobile devices

Steps 1–4, 6: totally doable now. We can define the REST contracts, add the DTO/types, set up the API interface with stubbed/mock implementations, wire TanStack Query around those mocks, and build the page/feature-flagged UI. Workspace links and shell integrations can also land while they still target the mock store.
Step 5 (page assembly) is mostly frontend—so yes, as long as the data hook returns mocks. Once FastAPI exists we just swap the implementation behind the service interface.
Step 7’s telemetry/tests can run against the mocked flow, but obviously any backend-driven assertions should be marked TODO until the real endpoints respond.

1) connect upcoming project page components to these hooks/service, 2) decide where to surface translation loading (e.g., via next-intl), 3) extend mock data or plug actual FastAPI calls once backend is live.


Contract + Types: Align with backend on response/request shapes for the endpoints listed in the build plan, then add TypeScript DTOs plus i18n key scaffolding under a new src/modules/projects package so UI can consume translations without hard-coding strings.
API Layer: Extend httpRequest to cover PUT/DELETE/PATCH and structured error logging, then create a ProjectApi interface with a FastAPI-backed implementation (projects.api.ts) that calls those REST routes; keep it additive so existing modules remain untouched.
Data Access Hook: Introduce a shared QueryClientProvider (probably src/components/providers/query-client.tsx) and a useProject hook that wraps TanStack Query, scopes cache keys by org/division, and honors feature-flag gating so we can roll out safely.
UI Composition: Build ProjectHeader, ProjectTabs, ProjectMembers, ProjectSettings, etc. inside src/components/entities/, reusing primitives from components/ui and wiring inline editing/member actions to the service layer with optimistic updates + skeleton/error states.
Page Assembly: Add src/app/[orgId]/[divisionId]/projects/[projectId]/page.tsx that consumes the hook, renders tabs (Overview/Tasks/Timeline/Docs/Settings), plugs in breadcrumbs, and redirects or shows a not-found state when APIs fail.
Integration Touchpoints: Update workspace list/board and sidebar to link into the detail route, wrap the release behind a feature flag, and ensure TanStack Query invalidations keep the workspace summary in sync after edits.
Validation & Telemetry: Add smoke tests (Playwright) for the happy path, wire structured logs/metrics around key mutations, and document follow-up work in /docs checklist so backend pairing stays aligned.

Next: 1) decide when to swap the hooks from the mock to fastProjectApi, 2) pipe scope metadata (org/division) into the factory so server calls receive the right context, 3) align with backend auth requirements (headers/tokens) once FastAPI is ready.

Next steps: 1) Integrate these components into the upcoming project detail route, 2) flesh out task/timeline/doc tab bodies to consume the corresponding hooks, 3) expand translations/locales as additional languages are introduced.