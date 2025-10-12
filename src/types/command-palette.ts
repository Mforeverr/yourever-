export const QUICK_ADD_TYPES = ["task", "project", "doc", "channel", "event"] as const
export type QuickAddType = typeof QUICK_ADD_TYPES[number]

export const QUICK_ADD_PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type QuickAddPriority = typeof QUICK_ADD_PRIORITIES[number]

export interface QuickAddInitialValues {
  context?: string
  title?: string
  assignee?: string
  dueDate?: Date
  priority?: QuickAddPriority
}

export interface QuickAddSubmitPayload {
  type: QuickAddType
  context?: string
  title: string
  assignee?: string
  dueDate?: string
  priority?: QuickAddPriority
  orgId?: string
  divisionId?: string
}

export interface PaletteQuickAddOptions {
  type: QuickAddType
  defaultContext?: string
  initialValues?: QuickAddInitialValues
}

export type GlobalEntityType =
  | "task"
  | "project"
  | "doc"
  | "channel"
  | "event"
  | "user"
  | "organization"
  | "division"

export interface ApiSearchResult {
  id: string
  type: GlobalEntityType
  title: string
  description?: string
  href?: string
  score?: number
  metadata?: Record<string, unknown>
}

export interface PaletteSearchResult extends ApiSearchResult {
  badgeLabel: string
  href?: string
}
