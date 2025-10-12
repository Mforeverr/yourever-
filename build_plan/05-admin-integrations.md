# Phase 5: Admin Integration Forms

**Timeline:** Week 3
**Goal:** Implement per-service integration forms and enhanced admin sections

---

## 🚀 Task 5.1: Per-Service Integration Forms
**Estimate:** 1 day
**Priority:** High

### Files to create:
```
src/app/[orgId]/[divisionId]/admin/integrations/slack/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/integrations/zoom/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/integrations/gmail/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/integrations/gcal/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/integrations/notion/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/integrations/clickup/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/integrations/asana/page.tsx (new)
src/components/forms/integrations/slack-form.tsx (new)
src/components/forms/integrations/zoom-form.tsx (new)
src/components/forms/integrations/gmail-form.tsx (new)
src/components/forms/integrations/gcal-form.tsx (new)
src/components/forms/integrations/notion-form.tsx (new)
src/components/forms/integrations/clickup-form.tsx (new)
src/components/forms/integrations/asana-form.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
// Generic integration endpoints
GET /api/integrations                     // List all integrations
GET /api/integrations/{service}          // Get specific integration config
PUT /api/integrations/{service}          // Update integration config
DELETE /api/integrations/{service}       // Remove integration
POST /api/integrations/{service}/test    // Test connection

// Service-specific endpoints
POST /api/integrations/slack/test        // Test Slack connection
GET /api/integrations/slack/workspaces   // Get Slack workspaces
GET /api/integrations/slack/channels     // Get Slack channels
POST /api/integrations/zoom/test         // Test Zoom connection
GET /api/integrations/zoom/templates     // Get Zoom meeting templates
POST /api/integrations/gmail/test         // Test Gmail connection
GET /api/integrations/gmail/labels        // Get Gmail labels
POST /api/integrations/gcal/test          // Test Google Calendar connection
GET /api/integrations/gcal/calendars      // Get Google Calendars
POST /api/integrations/notion/test        // Test Notion connection
GET /api/integrations/notion/databases    // Get Notion databases
POST /api/integrations/clickup/test       // Test ClickUp connection
GET /api/integrations/clickup/spaces      // Get ClickUp spaces
POST /api/integrations/asana/test         // Test Asana connection
GET /api/integrations/asana/workspaces    // Get Asana workspaces
```

### Implementation steps:
1. **Create individual integration form pages**
2. **Implement service-specific configuration fields**
3. **Add connection testing functionality**
4. **Include service-specific features** (Slack workspaces, Zoom templates, etc.)

### Code Structure:
```typescript
// slack-form.tsx
interface SlackIntegrationData {
  enabled: boolean
  displayName: string
  botToken: string
  workspaceName?: string
  eventSubscriptions: string[]
  defaultChannelMapping: Record<string, string>
  syncDirection: 'pull' | 'push' | 'bidirectional'
}

const SlackIntegrationForm = () => {
  const [data, setData] = useState<SlackIntegrationData>()
  const [isTesting, setIsTesting] = useState(false)
  const [workspaces, setWorkspaces] = useState([])

  const handleTestConnection = async () => {
    setIsTesting(true)
    try {
      const response = await fetch('/api/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: data.botToken })
      })

      if (response.ok) {
        const result = await response.json()
        setWorkspaces(result.workspaces)
        toast.success('Connection successful!')
      }
    } catch (error) {
      toast.error('Connection failed')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField>
            <FormLabel>Enabled</FormLabel>
            <Switch
              checked={data.enabled}
              onCheckedChange={(enabled) => setData({ ...data, enabled })}
            />
          </FormField>

          <FormField>
            <FormLabel>Display Name</FormLabel>
            <Input
              value={data.displayName}
              onChange={(e) => setData({ ...data, displayName: e.target.value })}
              placeholder="My Slack Workspace"
            />
          </FormField>

          <FormField>
            <FormLabel>Bot Token</FormLabel>
            <Input
              type="password"
              value={data.botToken}
              onChange={(e) => setData({ ...data, botToken: e.target.value })}
              placeholder="xoxb-..."
            />
          </FormField>

          <Button
            onClick={handleTestConnection}
            disabled={isTesting || !data.botToken}
            className="w-full"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>

          {workspaces.length > 0 && (
            <FormField>
              <FormLabel>Workspace</FormLabel>
              <Select onValueChange={(workspace) => setData({ ...data, workspaceName: workspace })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.name}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <FormField>
            <FormLabel>Sync Direction</FormLabel>
            <RadioGroup
              value={data.syncDirection}
              onValueChange={(value: 'pull' | 'push' | 'bidirectional') =>
                setData({ ...data, syncDirection: value })
              }
            >
              <RadioGroupItem value="pull" id="pull">
                <Label htmlFor="pull">Pull from Slack</Label>
              </RadioGroupItem>
              <RadioGroupItem value="push" id="push">
                <Label htmlFor="push">Push to Slack</Label>
              </RadioGroupItem>
              <RadioGroupItem value="bidirectional" id="bidirectional">
                <Label htmlFor="bidirectional">Bidirectional</Label>
              </RadioGroupItem>
            </RadioGroup>
          </FormField>

          <FormField>
            <FormLabel>Event Subscriptions</FormLabel>
            <div className="space-y-2">
              {['message', 'channel_created', 'member_joined'].map((event) => (
                <div key={event} className="flex items-center space-x-2">
                  <Checkbox
                    id={event}
                    checked={data.eventSubscriptions.includes(event)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setData({
                          ...data,
                          eventSubscriptions: [...data.eventSubscriptions, event]
                        })
                      } else {
                        setData({
                          ...data,
                          eventSubscriptions: data.eventSubscriptions.filter(e => e !== event)
                        })
                      }
                    }}
                  />
                  <Label htmlFor={event} className="text-sm">{event}</Label>
                </div>
              ))}
            </div>
          </FormField>
        </CardContent>
      </Card>

      <ChannelMappingSection data={data} setData={setData} />

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Integration
        </Button>
      </div>
    </div>
  )
}

// zoom-form.tsx (with Zoom-specific features)
interface ZoomIntegrationData {
  enabled: boolean
  displayName: string
  apiKey: string
  apiSecret: string
  meetingTemplates: MeetingTemplate[]
  defaultSettings: {
    duration: number
    waitingRoom: boolean
    autoRecord: boolean
    password: boolean
  }
}

const ZoomIntegrationForm = () => {
  // Implementation with Zoom-specific features like meeting templates
}

// Similar structure for other integrations...
```

### Acceptance Criteria:
- [ ] All 7 integration forms implemented
- [ ] Service-specific fields included
- [ ] Connection testing working
- [ ] Configuration validation implemented
- [ ] Save/Cancel functionality working

---

## 🚀 Task 5.2: Admin Sections Enhancement
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/app/[orgId]/[divisionId]/admin/branding/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/domain/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/usage/page.tsx (new)
src/app/[orgId]/[divisionId]/admin/audit/page.tsx (new)
src/components/admin/branding-form.tsx (new)
src/components/admin/domain-form.tsx (new)
src/components/admin/usage-dashboard.tsx (new)
src/components/admin/audit-log-table.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
// Branding
GET /api/organizations/{orgId}/branding  // Get branding settings
PUT /api/organizations/{orgId}/branding  // Update branding
POST /api/organizations/{orgId}/branding/logo // Upload logo

// Domain & Access
GET /api/organizations/{orgId}/domain    // Get domain settings
PUT /api/organizations/{orgId}/domain    // Update domain settings
GET /api/organizations/{orgId}/sso       // Get SSO config
PUT /api/organizations/{orgId}/sso       // Update SSO config

// Usage
GET /api/organizations/{orgId}/usage     // Get usage stats
GET /api/organizations/{orgId}/seats     // Get seat usage
GET /api/organizations/{orgId}/storage   // Get storage usage

// Audit
GET /api/organizations/{orgId}/audit     // Get audit logs
GET /api/organizations/{orgId}/audit/export // Export logs
```

### Implementation steps:
1. **Create dedicated admin section pages**
2. **Implement branding configuration** with preview
3. **Add domain access management interface**
4. **Create usage analytics dashboard**
5. **Build audit log interface** with filtering

### Code Structure:
```typescript
// branding-form.tsx
interface BrandingData {
  name: string
  logo?: string
  primaryColor: string
  secondaryColor: string
  favicon?: string
  customCSS?: string
}

const BrandingForm = () => {
  const [data, setData] = useState<BrandingData>()
  const [previewMode, setPreviewMode] = useState(false)

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField>
            <FormLabel>Organization Name</FormLabel>
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </FormField>

          <FormField>
            <FormLabel>Primary Color</FormLabel>
            <div className="flex items-center space-x-2">
              <Input
                type="color"
                value={data.primaryColor}
                onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                className="w-12 h-12 p-1"
              />
              <Input
                value={data.primaryColor}
                onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </FormField>

          <FormField>
            <FormLabel>Logo</FormLabel>
            <LogoUpload onLogoChange={(logo) => setData({ ...data, logo })} />
          </FormField>

          <Button onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
        </CardContent>
      </Card>

      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandingPreview branding={data} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// usage-dashboard.tsx
const UsageDashboard = () => {
  const { data: usage, isLoading } = useOrganizationUsage()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Active Users"
          value={usage?.activeUsers}
          change={usage?.activeUsersChange}
        />
        <MetricCard
          title="Storage Used"
          value={`${usage?.storageUsed}GB`}
          total={`${usage?.storageTotal}GB`}
        />
        <MetricCard
          title="API Calls"
          value={usage?.apiCalls}
          change={usage?.apiCallsChange}
        />
        <MetricCard
          title="Projects"
          value={usage?.projects}
          change={usage?.projectsChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <UserActivityChart data={usage?.userActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <StorageBreakdownChart data={usage?.storageBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// audit-log-table.tsx
const AuditLogTable = () => {
  const [filters, setFilters] = useState<AuditFilters>()
  const { data: logs, isLoading } = useAuditLogs(filters)

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      cell: (row) => format(new Date(row.timestamp), 'MMM dd, yyyy HH:mm')
    },
    {
      header: 'Actor',
      cell: (row) => row.actorName
    },
    {
      header: 'Action',
      cell: (row) => row.action
    },
    {
      header: 'Resource',
      cell: (row) => row.resourceType
    },
    {
      header: 'IP Address',
      cell: (row) => row.ipAddress
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.success ? 'default' : 'destructive'}>
          {row.success ? 'Success' : 'Failed'}
        </Badge>
      )
    }
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Audit Log</CardTitle>
          <div className="flex space-x-2">
            <AuditLogFilters filters={filters} onFiltersChange={setFilters} />
            <Button variant="outline" onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={logs?.items || []}
          isLoading={isLoading}
          pagination={logs?.pagination}
        />
      </CardContent>
    </Card>
  )
}
```

### Acceptance Criteria:
- [ ] Branding configuration functional with preview
- [ ] Domain access management implemented
- [ ] Usage dashboard showing metrics and charts
- [ ] Audit log table with filtering and export
- [ ] All admin sections accessible from navigation

---

## 🎯 Phase 5 Success Criteria

### Functional Requirements:
- [ ] All 7 per-service integration forms implemented
- [ ] All admin sections (branding, domain, usage, audit) functional
- [ ] Connection testing working for all integrations
- [ ] Configuration validation implemented everywhere
- [ ] Admin navigation working correctly

### Technical Requirements:
- [ ] FastAPI integration endpoints integrated
- [ ] Form validation using Zod schemas
- [ ] Error handling for all API calls
- [ ] Loading states implemented
- [ ] File upload working for logos/avatars

### UX Requirements:
- [ ] Intuitive form layouts with proper sections
- [ ] Clear error messages and validation feedback
- [ ] Preview functionality for branding changes
- [ ] Responsive design for mobile devices
- [ ] Accessibility compliance maintained

---

## 🔗 Dependencies

**Prerequisites:** Phase 1 (Foundation & Routing)
**Blocking:** Phase 6 (API Integration)
**Parallel:** FastAPI admin endpoints

---

## 📝 Notes

- **Security:** Validate all admin permissions before allowing access
- **Validation:** Use comprehensive form validation with helpful error messages
- **Performance:** Optimize large data tables with pagination and filtering
- **Documentation:** Add help text and tooltips for complex configurations
- **Testing:** Ensure all integrations can be tested without saving