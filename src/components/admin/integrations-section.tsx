'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Puzzle, 
  ExternalLink, 
  Check, 
  X, 
  Settings, 
  Key, 
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { IntegrationForm } from '@/components/forms/integration-form'

interface Integration {
  id: string
  name: string
  description: string
  category: 'communication' | 'project' | 'productivity' | 'storage'
  enabled: boolean
  configured: boolean
  icon: React.ReactNode
  config?: IntegrationConfig
  lastSync?: string
}

interface IntegrationConfig {
  apiKey?: string
  webhookUrl?: string
  workspaceId?: string
  clientId?: string
  clientSecret?: string
  [key: string]: any
}

const mockIntegrations: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and sync channels',
    category: 'communication',
    enabled: true,
    configured: true,
    icon: <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>,
    config: {
      webhookUrl: 'https://hooks.slack.com/services/...',
      workspaceId: 'T1234567890'
    },
    lastSync: '2 minutes ago'
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Sync tasks and projects',
    category: 'project',
    enabled: true,
    configured: true,
    icon: <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>,
    config: {
      apiKey: 'asana-api-key',
      workspaceId: '1234567890123456'
    },
    lastSync: '5 minutes ago'
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Schedule and manage meetings',
    category: 'communication',
    enabled: false,
    configured: false,
    icon: <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Z</div>
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send emails and manage contacts',
    category: 'communication',
    enabled: true,
    configured: true,
    icon: <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">G</div>,
    config: {
      clientId: 'gmail-client-id',
      clientSecret: 'gmail-client-secret'
    },
    lastSync: '1 hour ago'
  },
  {
    id: 'gcal',
    name: 'Google Calendar',
    description: 'Sync events and schedules',
    category: 'productivity',
    enabled: true,
    configured: true,
    icon: <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">C</div>,
    config: {
      clientId: 'gcal-client-id',
      clientSecret: 'gcal-client-secret'
    },
    lastSync: '30 minutes ago'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync documents and databases',
    category: 'productivity',
    enabled: false,
    configured: false,
    icon: <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">N</div>
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Manage tasks and workflows',
    category: 'project',
    enabled: false,
    configured: false,
    icon: <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold">C</div>
  }
]

const categories = [
  { id: 'all', name: 'All Integrations', icon: <Puzzle className="h-4 w-4" /> },
  { id: 'communication', name: 'Communication', icon: <div className="w-4 h-4 bg-purple-600 rounded" /> },
  { id: 'project', name: 'Project Management', icon: <div className="w-4 h-4 bg-green-600 rounded" /> },
  { id: 'productivity', name: 'Productivity', icon: <div className="w-4 h-4 bg-blue-600 rounded" /> },
  { id: 'storage', name: 'Storage', icon: <div className="w-4 h-4 bg-orange-600 rounded" /> }
]

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [showApiKeys, setShowApiKeys] = useState(false)

  const filteredIntegrations = selectedCategory === 'all' 
    ? integrations 
    : integrations.filter(integration => integration.category === selectedCategory)

  const handleToggleIntegration = (integrationId: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, enabled: !integration.enabled }
          : integration
      )
    )
  }

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
  }

  const handleSaveConfig = () => {
    if (selectedIntegration) {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === selectedIntegration.id 
            ? { ...integration, configured: true, config: selectedIntegration.config }
            : integration
        )
      )
      setSelectedIntegration(null)
    }
  }

  const handleSyncIntegration = (integrationId: string) => {
    // Simulate sync
    setTimeout(() => {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { ...integration, lastSync: 'Just now' }
            : integration
        )
      )
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {category.icon}
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {/* Add Integration Button */}
          <div className="mb-6">
            <IntegrationForm>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Integration
              </Button>
            </IntegrationForm>
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={() => handleToggleIntegration(integration.id)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {integration.configured ? (
                        <Badge variant="outline">
                          <Check className="h-3 w-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Not Configured
                        </Badge>
                      )}
                      {integration.lastSync && (
                        <span className="text-xs text-muted-foreground">
                          Synced {integration.lastSync}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleConfigureIntegration(integration)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    {integration.configured && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSyncIntegration(integration.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      {selectedIntegration && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                {selectedIntegration.icon}
                Configure {selectedIntegration.name}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedIntegration(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Common Configuration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="api-key"
                    type={showApiKeys ? "text" : "password"}
                    value={selectedIntegration.config?.apiKey || ''}
                    onChange={(e) => setSelectedIntegration(prev => ({
                      ...prev!,
                      config: { ...prev!.config, apiKey: e.target.value }
                    }))}
                    placeholder="Enter API key"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKeys(!showApiKeys)}
                  >
                    {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="workspace-id">Workspace ID</Label>
                <Input
                  id="workspace-id"
                  value={selectedIntegration.config?.workspaceId || ''}
                  onChange={(e) => setSelectedIntegration(prev => ({
                    ...prev!,
                    config: { ...prev!.config, workspaceId: e.target.value }
                  }))}
                  placeholder="Enter workspace ID"
                />
              </div>
            </div>

            {/* Service-specific Configuration */}
            {selectedIntegration.id === 'slack' && (
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={selectedIntegration.config?.webhookUrl || ''}
                  onChange={(e) => setSelectedIntegration(prev => ({
                    ...prev!,
                    config: { ...prev!.config, webhookUrl: e.target.value }
                  }))}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            )}

            {(selectedIntegration.id === 'gmail' || selectedIntegration.id === 'gcal') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input
                    id="client-id"
                    value={selectedIntegration.config?.clientId || ''}
                    onChange={(e) => setSelectedIntegration(prev => ({
                      ...prev!,
                      config: { ...prev!.config, clientId: e.target.value }
                    }))}
                    placeholder="Enter client ID"
                  />
                </div>
                <div>
                  <Label htmlFor="client-secret">Client Secret</Label>
                  <Input
                    id="client-secret"
                    type={showApiKeys ? "text" : "password"}
                    value={selectedIntegration.config?.clientSecret || ''}
                    onChange={(e) => setSelectedIntegration(prev => ({
                      ...prev!,
                      config: { ...prev!.config, clientSecret: e.target.value }
                    }))}
                    placeholder="Enter client secret"
                  />
                </div>
              </div>
            )}

            {/* Integration-specific Settings */}
            <div className="space-y-3">
              <h4 className="font-medium">Integration Settings</h4>
              
              {selectedIntegration.id === 'slack' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-post Updates</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically post project updates to Slack
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sync Channels</Label>
                      <p className="text-xs text-muted-foreground">
                        Sync workspace channels with Slack
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              )}

              {selectedIntegration.id === 'asana' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sync Tasks</Label>
                      <p className="text-xs text-muted-foreground">
                        Sync tasks between workspace and Asana
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-create Projects</Label>
                      <p className="text-xs text-muted-foreground">
                        Create Asana projects for new workspace projects
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              )}

              {selectedIntegration.id === 'gmail' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Send Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Send email notifications for important updates
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sync Contacts</Label>
                      <p className="text-xs text-muted-foreground">
                        Sync Gmail contacts with workspace
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveConfig}>
                <Check className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button variant="outline" onClick={() => setSelectedIntegration(null)}>
                Cancel
              </Button>
              <Button variant="outline" className="ml-auto">
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}