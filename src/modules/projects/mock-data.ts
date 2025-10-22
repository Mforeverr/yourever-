// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import {
  type ProjectDetails,
  type ProjectDocSummary,
  type ProjectDocsResponse,
  type ProjectMember,
  type ProjectMembersResponse,
  type ProjectSettings,
  type ProjectTaskListResponse,
  type ProjectTaskSummary,
  type ProjectTimelineEntry,
  type ProjectTimelineResponse,
} from "./contracts"

interface ProjectMemoryStore {
  projects: Record<string, ProjectDetails>
  members: Record<string, ProjectMember[]>
  tasks: Record<string, ProjectTaskSummary[]>
  timeline: Record<string, ProjectTimelineEntry[]>
  docs: Record<string, ProjectDocSummary[]>
  settings: Record<string, ProjectSettings>
  archived: Set<string>
}

const now = new Date().toISOString()
const thirtyDays = 30 * 24 * 60 * 60 * 1000

const projectDetails: Record<string, ProjectDetails> = {
  "website-revamp": {
    id: "website-revamp",
    slug: "website-revamp",
    name: "Website Revamp",
    description: "Refresh marketing site visuals, messaging, and conversion flows before Q1 launch.",
    status: "active",
    priority: "high",
    progressPercent: 58,
    startDate: "2024-08-01T00:00:00Z",
    targetDate: "2024-12-15T00:00:00Z",
    updatedAt: now,
    createdAt: "2024-07-01T00:00:00Z",
    ownerId: "user_1",
    divisionId: "marketing",
    organizationId: "acme",
    visibility: "division",
    badgeCount: 12,
    tags: ["website", "launch", "marketing"],
    overview: {
      goals: [
        "Increase website conversion rate by 15%",
        "Improve Lighthouse performance scores to >90",
        "Launch new pricing and social proof sections",
      ],
      outcomes: [
        "Updated brand narrative and visuals",
        "Optimized lead capture flow with A/B testing",
        "SEO improvements across top landing pages",
      ],
    },
    metrics: {
      health: "green",
      budgetUsedPercent: 62,
      scorecards: [
        {
          id: "conversion-rate",
          label: "Demo Conversion",
          value: 11.5,
          target: 13,
          unit: "%",
        },
        {
          id: "page-speed",
          label: "Lighthouse Performance",
          value: 88,
          target: 92,
        },
      ],
    },
    coverImage: "/images/projects/website-revamp-cover.png",
    defaultView: "board",
    integrations: [
      { id: "linear", provider: "Linear", status: "connected", syncedAt: now },
      { id: "notion", provider: "Notion", status: "connected", syncedAt: now },
    ],
  },
  "platform-infra": {
    id: "platform-infra",
    slug: "platform-infra",
    name: "Platform Infrastructure Hardening",
    description: "Reduce hosting costs and improve reliability across the platform services.",
    status: "planning",
    priority: "medium",
    progressPercent: 35,
    startDate: "2024-09-15T00:00:00Z",
    targetDate: new Date(Date.now() + thirtyDays).toISOString(),
    updatedAt: now,
    createdAt: "2024-08-20T00:00:00Z",
    ownerId: "user_1",
    divisionId: "engineering",
    organizationId: "acme",
    visibility: "organization",
    badgeCount: 9,
    tags: ["infra", "cost", "reliability"],
    overview: {
      goals: [
        "Cut AWS spend by 20% without impacting SLAs",
        "Adopt blue/green deployments for core APIs",
        "Improve observability coverage for background jobs",
      ],
      outcomes: [
        "Service dashboards with actionable alerts",
        "Documented incident response runbooks",
        "Improved pipeline success rate",
      ],
    },
    metrics: {
      health: "yellow",
      riskNotes: "Pending capacity testing for new deployment pipeline.",
      budgetUsedPercent: 38,
    },
    defaultView: "timeline",
    integrations: [
      { id: "pagerduty", provider: "PagerDuty", status: "connected", syncedAt: now },
    ],
  },
  "company-allhands": {
    id: "company-allhands",
    slug: "company-allhands",
    name: "Company All-Hands",
    description: "Company all-hands meeting planning and coordination",
    status: "active",
    priority: "medium",
    progressPercent: 45,
    startDate: "2024-10-01T00:00:00Z",
    targetDate: "2024-12-31T00:00:00Z",
    updatedAt: now,
    createdAt: "2024-09-15T00:00:00Z",
    ownerId: "user_1",
    divisionId: null, // Company-wide project, not tied to specific division
    organizationId: "acme",
    visibility: "organization",
    badgeCount: 3,
    tags: ["all-hands", "company", "meeting"],
    overview: {
      goals: [
        "Coordinate quarterly all-hands meeting logistics",
        "Prepare company-wide presentations and updates",
        "Facilitate cross-department communication"
      ],
      outcomes: [
        "Successful quarterly meetings with high engagement",
        "Clear communication of company goals and progress",
        "Improved company culture and alignment"
      ],
    },
    metrics: {
      health: "green",
      budgetUsedPercent: 25,
    },
    defaultView: "board",
    integrations: [],
  },
}

const projectMembers: Record<string, ProjectMember[]> = {
  "website-revamp": [
    {
      userId: "user_1",
      fullName: "Dev User",
      email: "dev@yourever.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev",
      role: "owner",
      joinedAt: "2024-07-01T00:00:00Z",
      isActive: true,
    },
    {
      userId: "user_marketing",
      fullName: "Mia Carter",
      email: "mia.carter@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mia",
      role: "editor",
      joinedAt: "2024-07-10T00:00:00Z",
      isActive: true,
    },
    {
      userId: "user_design",
      fullName: "Hiro Tanaka",
      email: "hiro.tanaka@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=hiro",
      role: "viewer",
      joinedAt: "2024-08-02T00:00:00Z",
      isActive: true,
    },
  ],
  "platform-infra": [
    {
      userId: "user_1",
      fullName: "Dev User",
      email: "dev@yourever.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev",
      role: "owner",
      joinedAt: "2024-08-20T00:00:00Z",
      isActive: true,
    },
    {
      userId: "user_engineering",
      fullName: "Priya Patel",
      email: "priya.patel@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
      role: "editor",
      joinedAt: "2024-09-01T00:00:00Z",
      isActive: true,
    },
    {
      userId: "user_ops",
      fullName: "Thomas Nguyen",
      email: "thomas.nguyen@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=thomas",
      role: "viewer",
      joinedAt: "2024-09-04T00:00:00Z",
      isActive: true,
    },
  ],
  "company-allhands": [
    {
      userId: "user_1",
      fullName: "Dev User",
      email: "dev@yourever.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=dev",
      role: "owner",
      joinedAt: "2024-09-15T00:00:00Z",
      isActive: true,
    },
    {
      userId: "user_marketing",
      fullName: "Mia Carter",
      email: "mia.carter@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mia",
      role: "editor",
      joinedAt: "2024-09-20T00:00:00Z",
      isActive: true,
    },
    {
      userId: "user_engineering",
      fullName: "Priya Patel",
      email: "priya.patel@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
      role: "editor",
      joinedAt: "2024-09-22T00:00:00Z",
      isActive: true,
    },
  ],
}

const projectTasks: Record<string, ProjectTaskSummary[]> = {
  "website-revamp": [
    {
      id: "task-hero-refresh",
      name: "Redesign hero section with new messaging",
      status: "in_progress",
      priority: "high",
      assigneeId: "user_design",
      assigneeName: "Hiro Tanaka",
      dueDate: "2024-11-01T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-09-10T00:00:00Z",
      shortId: "WE-101",
    },
    {
      id: "task-split-test",
      name: "Launch pricing page A/B test",
      status: "todo",
      priority: "medium",
      assigneeId: "user_marketing",
      assigneeName: "Mia Carter",
      dueDate: "2024-11-15T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-09-20T00:00:00Z",
      shortId: "WE-102",
    },
    {
      id: "task-lighthouse",
      name: "Improve Lighthouse score to 90+ for marketing pages",
      status: "review",
      priority: "urgent",
      assigneeId: "user_engineering",
      assigneeName: "Priya Patel",
      dueDate: "2024-10-20T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-09-05T00:00:00Z",
      shortId: "WE-089",
    },
    {
      id: "task-copy-refresh",
      name: "Finalize copy updates for solutions pages",
      status: "done",
      priority: "medium",
      assigneeId: "user_marketing",
      assigneeName: "Mia Carter",
      updatedAt: "2024-09-25T00:00:00Z",
      createdAt: "2024-08-22T00:00:00Z",
      shortId: "WE-067",
    },
  ],
  "platform-infra": [
    {
      id: "task-cost-audit",
      name: "Complete AWS cost audit",
      status: "in_progress",
      priority: "high",
      assigneeId: "user_ops",
      assigneeName: "Thomas Nguyen",
      dueDate: "2024-10-30T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-09-18T00:00:00Z",
      shortId: "INF-040",
    },
    {
      id: "task-deploy-pipeline",
      name: "Implement blue/green deployment pipeline",
      status: "todo",
      priority: "urgent",
      assigneeId: "user_engineering",
      assigneeName: "Priya Patel",
      dueDate: "2024-11-10T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-09-22T00:00:00Z",
      shortId: "INF-041",
    },
    {
      id: "task-dashboards",
      name: "Set up service dashboards in Grafana",
      status: "todo",
      priority: "medium",
      assigneeId: "user_engineering",
      assigneeName: "Priya Patel",
      updatedAt: now,
      createdAt: "2024-09-24T00:00:00Z",
      shortId: "INF-042",
    },
  ],
  "company-allhands": [
    {
      id: "task-allhands-slides",
      name: "Prepare Q4 all-hands presentation slides",
      status: "in_progress",
      priority: "high",
      assigneeId: "user_marketing",
      assigneeName: "Mia Carter",
      dueDate: "2024-11-15T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-10-20T00:00:00Z",
      shortId: "ALL-001",
    },
    {
      id: "task-allhands-logistics",
      name: "Book venue and coordinate logistics",
      status: "done",
      priority: "medium",
      assigneeId: "user_1",
      assigneeName: "Dev User",
      updatedAt: "2024-10-25T00:00:00Z",
      createdAt: "2024-10-18T00:00:00Z",
      shortId: "ALL-002",
    },
    {
      id: "task-allhands-agenda",
      name: "Finalize meeting agenda and schedule",
      status: "todo",
      priority: "medium",
      assigneeId: "user_engineering",
      assigneeName: "Priya Patel",
      dueDate: "2024-11-10T00:00:00Z",
      updatedAt: now,
      createdAt: "2024-10-22T00:00:00Z",
      shortId: "ALL-003",
    },
  ],
}

const projectTimeline: Record<string, ProjectTimelineEntry[]> = {
  "website-revamp": [
    {
      id: "timeline-we-01",
      projectId: "website-revamp",
      title: "Kickoff workshop completed",
      entryType: "milestone",
      happenedAt: "2024-08-05T12:00:00Z",
      authorId: "user_1",
      authorName: "Dev User",
      description: "Initial stakeholder workshop completed. Collected feedback and prioritized homepage improvements.",
    },
    {
      id: "timeline-we-02",
      projectId: "website-revamp",
      title: "Performance audit flagged blocking issues",
      entryType: "risk",
      happenedAt: "2024-09-15T16:30:00Z",
      authorId: "user_engineering",
      authorName: "Priya Patel",
      description: "Mobile performance below target on product pages. Need to refactor legacy carousel component.",
    },
    {
      id: "timeline-we-03",
      projectId: "website-revamp",
      title: "New pricing layout shipped",
      entryType: "update",
      happenedAt: "2024-10-01T09:15:00Z",
      authorId: "user_marketing",
      authorName: "Mia Carter",
      description: "Launched new comparison table. Early metrics show +8% uplift in click-through rate.",
    },
  ],
  "platform-infra": [
    {
      id: "timeline-inf-01",
      projectId: "platform-infra",
      title: "Defined reliability targets",
      entryType: "decision",
      happenedAt: "2024-09-25T14:00:00Z",
      authorId: "user_1",
      authorName: "Dev User",
      description: "Agreed on updated SLOs: 99.9% uptime, 2h MTTR, <1% failed deploys.",
    },
  ],
  "company-allhands": [
    {
      id: "timeline-all-01",
      projectId: "company-allhands",
      title: "Q4 All-Hands Planning Started",
      entryType: "milestone",
      happenedAt: "2024-10-01T10:00:00Z",
      authorId: "user_1",
      authorName: "Dev User",
      description: "Initial planning meeting for Q4 all-hands. Key dates and themes identified.",
    },
    {
      id: "timeline-all-02",
      projectId: "company-allhands",
      title: "Venue Confirmed",
      entryType: "milestone",
      happenedAt: "2024-10-15T14:30:00Z",
      authorId: "user_1",
      authorName: "Dev User",
      description: "Main conference room booked for November 15th. A/V equipment confirmed.",
    },
  ],
}

const projectDocs: Record<string, ProjectDocSummary[]> = {
  "website-revamp": [
    {
      id: "doc-weBrief",
      title: "Website Revamp Brief",
      shortId: "DOC-11",
      updatedAt: now,
      ownerId: "user_1",
      ownerName: "Dev User",
      status: "published",
    },
    {
      id: "doc-weCopy",
      title: "Copywriting Guidelines",
      shortId: "DOC-12",
      updatedAt: "2024-09-12T00:00:00Z",
      ownerId: "user_marketing",
      ownerName: "Mia Carter",
      status: "draft",
    },
  ],
  "platform-infra": [
    {
      id: "doc-infPlan",
      title: "Infrastructure Hardening Plan",
      shortId: "DOC-20",
      updatedAt: now,
      ownerId: "user_engineering",
      ownerName: "Priya Patel",
      status: "published",
    },
  ],
  "company-allhands": [
    {
      id: "doc-allAgenda",
      title: "Q4 All-Hands Agenda",
      shortId: "DOC-ALL-001",
      updatedAt: now,
      ownerId: "user_1",
      ownerName: "Dev User",
      status: "published",
    },
    {
      id: "doc-allSlides",
      title: "Q4 Company Update Presentation",
      shortId: "DOC-ALL-002",
      updatedAt: now,
      ownerId: "user_marketing",
      ownerName: "Mia Carter",
      status: "draft",
    },
  ],
}

const projectSettings: Record<string, ProjectSettings> = {
  "website-revamp": {
    allowGuests: false,
    notificationsEnabled: true,
    autoArchiveCompletedTasks: true,
    featureFlags: [
      { key: "enable-doc-sync", enabled: true },
      { key: "enable-budget-tab", enabled: false },
    ],
  },
  "platform-infra": {
    allowGuests: false,
    notificationsEnabled: true,
    autoArchiveCompletedTasks: false,
    featureFlags: [
      { key: "enable-doc-sync", enabled: true },
      { key: "enable-budget-tab", enabled: true },
    ],
  },
  "company-allhands": {
    allowGuests: true, // Company-wide event, allow broader access
    notificationsEnabled: true,
    autoArchiveCompletedTasks: true,
    featureFlags: [
      { key: "enable-doc-sync", enabled: true },
      { key: "enable-budget-tab", enabled: false },
      { key: "enable-public-view", enabled: true },
    ],
  },
}

export const projectMemoryStore: ProjectMemoryStore = {
  projects: projectDetails,
  members: projectMembers,
  tasks: projectTasks,
  timeline: projectTimeline,
  docs: projectDocs,
  settings: projectSettings,
  archived: new Set<string>(),
}

export const getProjectDetailOrThrow = (projectId: string): ProjectDetails => {
  const project = projectMemoryStore.projects[projectId]
  if (!project || projectMemoryStore.archived.has(projectId)) {
    throw new Error(`Project ${projectId} not found`)
  }
  return project
}

export const buildProjectMembersResponse = (projectId: string): ProjectMembersResponse => ({
  projectId,
  members: [...(projectMemoryStore.members[projectId] ?? [])],
})

export const buildProjectTasksResponse = (
  projectId: string,
  cursor?: string,
  limit?: number,
): ProjectTaskListResponse => {
  const tasks = [...(projectMemoryStore.tasks[projectId] ?? [])]
  let startIndex = 0
  if (cursor) {
    const index = tasks.findIndex((task) => task.id === cursor)
    startIndex = index >= 0 ? index + 1 : 0
  }
  const pageSize = limit ?? tasks.length
  const slice = tasks.slice(startIndex, startIndex + pageSize)

  return {
    projectId,
    tasks: slice,
    pagination: {
      cursor: slice.length === pageSize && tasks[startIndex + pageSize]
        ? tasks[startIndex + pageSize].id
        : undefined,
      hasMore: startIndex + pageSize < tasks.length,
    },
  }
}

export const buildProjectTimelineResponse = (projectId: string): ProjectTimelineResponse => ({
  projectId,
  entries: [...(projectMemoryStore.timeline[projectId] ?? [])],
})

export const buildProjectDocsResponse = (projectId: string): ProjectDocsResponse => ({
  projectId,
  docs: [...(projectMemoryStore.docs[projectId] ?? [])],
})

export const getProjectSettingsOrDefault = (projectId: string): ProjectSettings => {
  const settings = projectMemoryStore.settings[projectId]
  if (settings) {
    return { ...settings, featureFlags: [...settings.featureFlags] }
  }
  return {
    allowGuests: false,
    notificationsEnabled: true,
    autoArchiveCompletedTasks: false,
    featureFlags: [],
  }
}

export const upsertProjectMembers = (projectId: string, members: ProjectMember[]) => {
  projectMemoryStore.members[projectId] = members
}

export const upsertProjectSettings = (projectId: string, settings: ProjectSettings) => {
  projectMemoryStore.settings[projectId] = settings
}

export const upsertProjectDetails = (projectId: string, project: ProjectDetails) => {
  projectMemoryStore.projects[projectId] = project
}

export const archiveProjectById = (projectId: string) => {
  projectMemoryStore.archived.add(projectId)
}
