'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Settings, 
  Palette, 
  Globe, 
  Puzzle, 
  BarChart3, 
  FileText,
  Upload,
  Download,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Filter,
  Search,
  ChevronRight,
  Shield,
  Users,
  Database,
  Activity
} from 'lucide-react'
import { BrandingSection } from './branding-section'
import { DomainAccessSection } from './domain-access-section'
import { IntegrationsSection } from './integrations-section'
import { UsageSection } from './usage-section'
import { AuditLogSection } from './audit-log-section'

export function AdminInterface() {
  const [activeTab, setActiveTab] = useState('branding')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Admin Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your workspace configuration and settings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <Button size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b border-border bg-surface px-4">
            <TabsList className="grid w-full grid-cols-5 bg-transparent">
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="domain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain & Access
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Puzzle className="h-4 w-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Audit Log
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 p-6">
            <TabsContent value="branding" className="mt-0 h-full">
              <BrandingSection />
            </TabsContent>
            
            <TabsContent value="domain" className="mt-0 h-full">
              <DomainAccessSection />
            </TabsContent>
            
            <TabsContent value="integrations" className="mt-0 h-full">
              <IntegrationsSection />
            </TabsContent>
            
            <TabsContent value="usage" className="mt-0 h-full">
              <UsageSection />
            </TabsContent>
            
            <TabsContent value="audit" className="mt-0 h-full">
              <AuditLogSection />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}