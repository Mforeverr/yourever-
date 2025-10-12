import { z } from 'zod'
import type {
  InviteStepData,
  PreferencesStepData,
  ProfileStepData,
  ToolsStepData,
  WorkProfileStepData,
  WorkspaceHubStepData,
} from '@/lib/onboarding'

const urlSchema = z
  .string()
  .trim()
  .url('Enter a valid URL')
  .or(z.literal(''))
  .optional()

export const profileStepSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  role: z.string().trim().min(1, 'Role is required'),
  avatarUrl: urlSchema,
}) satisfies z.ZodType<ProfileStepData>

export const workProfileStepSchema = z
  .object({
    teamName: z.string().trim().min(1, 'Team or department is required'),
    jobTitle: z.string().trim().min(1, 'Role title is required'),
    timezone: z.string().trim().min(1, 'Select your primary timezone'),
    teamSize: z.string().trim().min(1, 'Select a team size'),
    functions: z.array(z.string()).min(1, 'Select at least one function'),
    intents: z.array(z.string()).min(1, 'Select at least one focus area'),
    experience: z.string().trim().min(1, 'Select your experience level'),
    role: z.string().trim(),
  })
  .transform((value) => ({
    ...value,
    role: value.role.trim() || value.jobTitle.trim(),
  })) satisfies z.ZodType<WorkProfileStepData>

const integrationSchema = z.object({
  id: z.string().trim().min(1, 'Integration id is required'),
  name: z.string().trim().min(1, 'Integration name is required'),
  status: z.enum(['not-started', 'in-progress', 'connected']),
})

export const toolsStepSchema = z
  .object({
    tools: z.array(z.string()),
    customTool: z.string().trim().optional(),
    integrations: z.array(integrationSchema).optional(),
  })
  .transform((value) => ({
    ...value,
    customTool: value.customTool?.trim() ?? '',
    integrations: value.integrations ?? [],
  })) satisfies z.ZodType<ToolsStepData>

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address')

export const inviteStepSchema = z
  .object({
    emails: z.array(emailSchema),
    defaultRole: z.enum(['admin', 'member']),
    message: z.string().trim().max(500, 'Message must be 500 characters or fewer').optional(),
    statuses: z
      .array(
        z.object({
          email: emailSchema,
          status: z.enum(['pending', 'sent', 'failed']),
        }),
      )
      .optional(),
  })
  .transform((value) => ({
    ...value,
    message: value.message?.trim() ?? '',
    statuses: value.statuses ?? [],
  })) satisfies z.ZodType<InviteStepData>

export const preferencesStepSchema = z.object({
  weeklySummary: z.boolean(),
  enableNotifications: z.boolean(),
  defaultTheme: z.enum(['dark', 'light', 'system']),
}) satisfies z.ZodType<PreferencesStepData>

export const workspaceHubStepSchema = z
  .object({
    choice: z.enum(['join-existing', 'create-new']),
    organizationName: z.string().trim().optional(),
    divisionName: z.string().trim().optional(),
    template: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.choice === 'create-new' && !value.organizationName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Organization name is required',
        path: ['organizationName'],
      })
    }
  }) satisfies z.ZodType<WorkspaceHubStepData>

export const onboardingStepSchemas = {
  profile: profileStepSchema,
  'work-profile': workProfileStepSchema,
  tools: toolsStepSchema,
  invite: inviteStepSchema,
  preferences: preferencesStepSchema,
  'workspace-hub': workspaceHubStepSchema,
} as const

export type OnboardingSchemaMap = typeof onboardingStepSchemas
