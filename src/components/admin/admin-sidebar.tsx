'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Palette, 
  Globe, 
  Puzzle, 
  BarChart3, 
  FileText,
  Shield,
  Users,
  Database,
  Activity,
  AlertTriangle,
  Check,
  Clock,
  TrendingUp,
  Download,
  RefreshCw
} from 'lucide-react'

interface AdminSidebarProps {
  className?: string
}

interface QuickStat {
  label: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
}

interface QuickAction {
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
  variant?: 'default' | 'destructive' | 'outline'
}

const mockQuickStats: QuickStat[] = [
  {
    label: 'Active Users',
    value: '72',
    change: '+12%',
    trend: 'up',
    icon: <Users className="h-4 w-4" />
  },
  {
    label: 'Storage Used',
    value: '23.7 GB',
    change: '+8.2%',
    trend: 'up',
    icon: <Database className="h-4 w-4" />
  },
  {
    label: 'API Calls',
    value: '7.5K',
    change: '+15%',
    trend: 'up',
    icon: <Activity className="h-4 w-4" />
  },
  {
    label: 'Security Alerts',
    value: '3',
    change: '-2',
    trend: 'down',
    icon: <AlertTriangle className="h-4 w-4" />
  }
]

const mockQuickActions: QuickAction[] = [
  {
    label: 'Backup Now',
    description: 'Create immediate backup',
    icon: <Download className="h-4 w-4" />,
    action: () => console.log('Backup initiated'),
    variant: 'default'
  },
  {
    label: 'Security Scan',
    description: 'Run security audit',
    icon: <Shield className="h-4 w-4" />,
    action: () => console.log('Security scan initiated'),
    variant: 'outline'
  },
  {
    label: 'Clear Cache',
    description: 'Clear system cache',
    icon: <RefreshCw className="h-4 w-4" />,
    action: () => console.log('Cache cleared'),
    variant: 'outline'
  }
]

const adminSections = [
  {
    id: 'branding',
    title: 'Branding',
    description: 'Customize workspace appearance',
    icon: <Palette className="h-4 w-4" />,
    status: 'configured'
  },
  {
    id: 'domain',
    title: 'Domain & Access',
    description: 'Manage domain and SSO settings',
    icon: <Globe className="h-4 w-4" />,
    status: 'warning'
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Configure third-party services',
    icon: <Puzzle className="h-4 w-4" />,
    status: 'partial'
  },
  {
    id: 'usage',
    title: 'Usage Analytics',
    description: 'Monitor workspace usage',
    icon: <BarChart3 className="h-4 w-4" />,
    status: 'active'
  },
  {
    id: 'audit',
    title: 'Audit Log',
    description: 'View system activity logs',
    icon: <FileText className="h-4 w-4" />,
    status: 'active'
  }
]

export function AdminSidebar({ className }: AdminSidebarProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Configured</Badge>
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800"><Activity className="h-3 w-3 mr-1" />Active</Badge>
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>
      case 'warning':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
      default:
        return <div className="h-3 w-3 bg-gray-400 rounded-full" />
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="font-semibold">Admin Panel</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          System configuration and monitoring
        </p>
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-b border-border">
        <h4 className="text-sm font-medium mb-3">Quick Stats</h4>
        <div className="grid grid-cols-2 gap-2">
          {mockQuickStats.map((stat, index) => (
            <div key={index} className="bg-surface rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                {stat.icon}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{stat.value}</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(stat.trend)}
                  <span className={`text-xs ${
                    stat.trend === 'up' ? 'text-green-600' : 
                    stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Sections */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Configuration</h4>
            <div className="space-y-2">
              {adminSections.map((section) => (
                <Card key={section.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {section.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="text-sm font-medium">{section.title}</h5>
                          {getStatusBadge(section.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
            <div className="space-y-2">
              {mockQuickActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={action.action}
                >
                  {action.icon}
                  <div className="ml-2 text-left">
                    <div className="text-sm font-medium">{action.label}</div>
                    <div className="text-xs opacity-70">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* System Health */}
          <div>
            <h4 className="text-sm font-medium mb-3">System Health</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">API Status</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Operational</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="text-sm">Storage</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">78% Full</Badge>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Last Backup</span>
                </div>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" size="sm" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Export Admin Data
        </Button>
      </div>
    </div>
  )
}