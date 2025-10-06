'use client'

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Settings, 
  Check, 
  X, 
  AlertCircle, 
  Loader2,
  Globe,
  Github,
  Slack,
  Google,
  Mail,
  Calendar,
  Database,
  Shield,
  Key
} from "lucide-react"

// Form validation schema
const integrationSchema = z.object({
  name: z.string().min(1, "Integration name is required"),
  type: z.enum(["webhook", "oauth", "api_key", "database"], {
    required_error: "Please select integration type",
  }),
  baseUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  apiKey: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  webhookUrl: z.string().url("Please enter a valid webhook URL").optional().or(z.literal("")),
  events: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
})

type IntegrationValues = z.infer<typeof integrationSchema>

interface IntegrationFormProps {
  children?: React.ReactNode
  initialData?: Partial<IntegrationValues>
  mode?: "create" | "edit"
  onSuccess?: (data: IntegrationValues) => void
  onCancel?: () => void
}

const integrationTypes = [
  {
    value: "webhook",
    label: "Webhook",
    icon: Globe,
    description: "Send data to external URLs via HTTP requests",
    fields: ["webhookUrl", "events", "headers"],
  },
  {
    value: "oauth",
    label: "OAuth",
    icon: Shield,
    description: "Connect to services using OAuth authentication",
    fields: ["clientId", "clientSecret", "baseUrl"],
  },
  {
    value: "api_key",
    label: "API Key",
    icon: Key,
    description: "Authenticate using API keys",
    fields: ["apiKey", "baseUrl"],
  },
  {
    value: "database",
    label: "Database",
    icon: Database,
    description: "Connect to external databases",
    fields: ["baseUrl", "apiKey"],
  },
]

const availableEvents = [
  "task.created",
  "task.updated",
  "task.completed",
  "project.created",
  "project.updated",
  "user.created",
  "user.updated",
  "channel.created",
  "event.created",
]

const commonIntegrations = [
  {
    name: "Slack",
    type: "webhook" as const,
    icon: Slack,
    description: "Send notifications to Slack channels",
    template: {
      webhookUrl: "https://hooks.slack.com/services/...",
      events: ["task.created", "task.completed"],
    },
  },
  {
    name: "GitHub",
    type: "api_key" as const,
    icon: Github,
    description: "Connect to GitHub repositories",
    template: {
      baseUrl: "https://api.github.com",
      apiKey: "",
    },
  },
  {
    name: "Google Calendar",
    type: "oauth" as const,
    icon: Calendar,
    description: "Sync events with Google Calendar",
    template: {
      baseUrl: "https://www.googleapis.com/calendar/v3",
      clientId: "",
      clientSecret: "",
    },
  },
  {
    name: "Email Service",
    type: "api_key" as const,
    icon: Mail,
    description: "Send email notifications",
    template: {
      baseUrl: "https://api.emailservice.com",
      apiKey: "",
    },
  },
]

export function IntegrationForm({ 
  children, 
  initialData,
  mode = "create",
  onSuccess,
  onCancel
}: IntegrationFormProps) {
  const [open, setOpen] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null)
  const [events, setEvents] = React.useState<string[]>(initialData?.events || [])
  const [headers, setHeaders] = React.useState<Record<string, string>>(initialData?.headers || {})
  const [newHeaderKey, setNewHeaderKey] = React.useState("")
  const [newHeaderValue, setNewHeaderValue] = React.useState("")

  const form = useForm<IntegrationValues>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: "",
      type: "webhook",
      baseUrl: "",
      apiKey: "",
      clientId: "",
      clientSecret: "",
      webhookUrl: "",
      events: [],
      headers: {},
      enabled: true,
      description: "",
      ...initialData,
    },
  })

  const watchedType = form.watch("type")
  const watchedValues = form.watch()

  const currentTypeConfig = integrationTypes.find(t => t.value === watchedType)

  const onSubmit = (data: IntegrationValues) => {
    const finalData = { ...data, events, headers }
    console.log("Integration data:", finalData)
    onSuccess?.(finalData)
    setOpen(false)
    if (mode === "create") {
      form.reset()
      setEvents([])
      setHeaders({})
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    
    try {
      // Simulate API call to test connection
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock test result
      const success = Math.random() > 0.3
      setTestResult({
        success,
        message: success 
          ? "Connection successful! Integration is ready to use." 
          : "Connection failed. Please check your credentials and try again."
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: "Connection test failed. Please try again."
      })
    } finally {
      setTesting(false)
    }
  }

  const applyTemplate = (template: typeof commonIntegrations[0]) => {
    form.setValue("name", template.name)
    form.setValue("type", template.type)
    form.setValue("description", template.description)
    
    Object.entries(template.template).forEach(([key, value]) => {
      if (typeof value === "string") {
        form.setValue(key as any, value)
      } else if (Array.isArray(value)) {
        setEvents(value)
      }
    })
  }

  const addEvent = (event: string) => {
    if (!events.includes(event)) {
      const newEvents = [...events, event]
      setEvents(newEvents)
      form.setValue("events", newEvents)
    }
  }

  const removeEvent = (event: string) => {
    const newEvents = events.filter(e => e !== event)
    setEvents(newEvents)
    form.setValue("events", newEvents)
  }

  const addHeader = () => {
    if (newHeaderKey && newHeaderValue) {
      const newHeaders = { ...headers, [newHeaderKey]: newHeaderValue }
      setHeaders(newHeaders)
      form.setValue("headers", newHeaders)
      setNewHeaderKey("")
      setNewHeaderValue("")
    }
  }

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers }
    delete newHeaders[key]
    setHeaders(newHeaders)
    form.setValue("headers", newHeaders)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Integration" : "Edit Integration"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Integration Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Integration Type *</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {integrationTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <div
                          key={type.value}
                          className={cn(
                            "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                            field.value === type.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-accent"
                          )}
                          onClick={() => field.onChange(type.value)}
                        >
                          <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {type.description}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Common Templates */}
            {mode === "create" && (
              <div>
                <FormLabel>Common Integrations</FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {commonIntegrations.map((template) => {
                    const Icon = template.icon
                    return (
                      <Button
                        key={template.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyTemplate(template)}
                        className="justify-start"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {template.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Integration Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="My Integration"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Enabled</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Integration will be active
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this integration does..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type-specific fields */}
            {watchedType === "webhook" && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://api.example.com/webhook"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Events */}
                <div>
                  <FormLabel>Events to Send</FormLabel>
                  <div className="space-y-2">
                    {events.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {events.map((event) => (
                          <Badge
                            key={event}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {event}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => removeEvent(event)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Select onValueChange={addEvent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add events..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEvents
                          .filter(event => !events.includes(event))
                          .map((event) => (
                            <SelectItem key={event} value={event}>
                              {event}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {(watchedType === "oauth" || watchedType === "api_key" || watchedType === "database") && (
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://api.example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedType === "oauth" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your_client_id"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="your_client_secret"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {(watchedType === "api_key" || watchedType === "database") && (
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="your_api_key"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Custom Headers */}
            {watchedType === "webhook" && (
              <div>
                <FormLabel>Custom Headers</FormLabel>
                <div className="space-y-2">
                  {Object.entries(headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input value={key} disabled className="flex-1" />
                      <Input value={value} disabled className="flex-1" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeHeader(key)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Header name"
                      value={newHeaderKey}
                      onChange={(e) => setNewHeaderKey(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Header value"
                      value={newHeaderValue}
                      onChange={(e) => setNewHeaderValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addHeader}
                      disabled={!newHeaderKey || !newHeaderValue}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Connection</CardTitle>
                <CardDescription>
                  Verify that your integration is working correctly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  
                  {testResult && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      testResult.success ? "text-green-600" : "text-red-600"
                    )}>
                      {testResult.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {testResult.message}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  onCancel?.()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {mode === "create" ? "Create Integration" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}