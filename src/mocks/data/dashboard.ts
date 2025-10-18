import type { DashboardSummary } from '@/modules/workspace/types'

const now = () => new Date()

const subtractHours = (date: Date, hours: number) => new Date(date.getTime() - hours * 60 * 60 * 1000)
const addMinutes = (isoString: string, minutes: number) => {
  const date = new Date(isoString)
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export const buildMockDashboardSummary = (
  orgId: string,
  divisionId: string | null,
): DashboardSummary => {
  const generated = now()
  const projectsUpdated = generated.toISOString()
  const docUpdated = subtractHours(generated, 3).toISOString()
  const activityTime = subtractHours(generated, 1).toISOString()

  return {
    orgId,
    divisionId,
    generatedAt: generated.toISOString(),
    hasTemplates: true,
    kpis: [
      { id: 'onTrack', label: 'On Track', count: 4, delta: 12, deltaDirection: 'up' },
      { id: 'stuck', label: 'At Risk', count: 1, delta: 3, deltaDirection: 'down' },
      { id: 'overdue', label: 'Overdue', count: 2, delta: 5, deltaDirection: 'flat' },
    ],
    projects: [
      {
        id: 'mock-project-1',
        orgId,
        divisionId,
        name: 'Workspace Launch Hub',
        description: 'Track the first milestones for your workspace rollout.',
        badgeCount: 4,
        dotColor: 'bg-indigo-500',
        status: 'active',
        defaultView: 'board',
        isTemplate: true,
        updatedAt: projectsUpdated,
      },
      {
        id: 'mock-project-2',
        orgId,
        divisionId,
        name: 'Team Onboarding Sprint',
        description: 'Introduce your teammates to the workspace and collect feedback.',
        badgeCount: 2,
        dotColor: 'bg-emerald-500',
        status: 'active',
        defaultView: 'list',
        isTemplate: true,
        updatedAt: projectsUpdated,
      },
    ],
    docs: [
      {
        id: 'mock-doc-1',
        orgId,
        divisionId,
        name: 'Workspace Playbook',
        url: 'https://example.com/docs/workspace-playbook',
        summary: 'Guidelines and rituals to keep everyone aligned.',
        isTemplate: true,
        updatedAt: docUpdated,
      },
      {
        id: 'mock-doc-2',
        orgId,
        divisionId,
        name: 'Team Rituals',
        url: 'https://example.com/docs/team-rituals',
        summary: 'Weekly cadences and async rituals for the team.',
        isTemplate: true,
        updatedAt: docUpdated,
      },
    ],
    activity: [
      {
        id: 'mock-activity-1',
        orgId,
        divisionId,
        activityType: 'post',
        content: 'Welcome! The workspace is live. Explore the sidebar and invite teammates.',
        metadata: { tags: ['welcome', 'launch'] },
        occurredAt: activityTime,
        isTemplate: true,
        author: {
          id: 'mock-author-1',
          name: 'Workspace Guide',
          role: 'System',
          avatar: undefined,
        },
      },
      {
        id: 'mock-activity-2',
        orgId,
        divisionId,
        activityType: 'file',
        content: 'Design system updated with new button variants.',
        metadata: { tags: ['design'] },
        occurredAt: addMinutes(activityTime, -45).toISOString(),
        isTemplate: true,
        author: {
          id: 'mock-author-2',
          name: 'Alex Chen',
          role: 'Designer',
          avatar: undefined,
        },
      },
    ],
    presence: [
      { id: 'mock-user-1', name: 'Alex Chen', status: 'online', avatar: undefined, role: 'Designer' },
      { id: 'mock-user-2', name: 'Sarah Miller', status: 'away', avatar: undefined, role: 'Product Manager' },
      { id: 'mock-user-3', name: 'Mike Johnson', status: 'offline', avatar: undefined, role: 'Engineering Lead' },
      { id: 'mock-user-4', name: 'Priya Patel', status: 'online', avatar: undefined, role: 'Marketing' },
    ],
  }
}
