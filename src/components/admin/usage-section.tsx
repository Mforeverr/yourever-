'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Users, 
  Database, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Download,
  Calendar,
  Filter,
  MoreHorizontal,
  AlertTriangle,
  Check,
  X
} from 'lucide-react'

interface UsageData {
  period: string
  users: number
  storage: number
  actions: number
  apiCalls: number
}

interface SeatUsage {
  total: number
  used: number
  available: number
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    lastActive: string
  }>
}

interface StorageUsage {
  total: number
  used: number
  breakdown: Array<{
    category: string
    size: number
    count: number
  }>
}

const mockUsageData: UsageData[] = [
  { period: 'Jan', users: 45, storage: 12.5, actions: 1250, apiCalls: 4500 },
  { period: 'Feb', users: 52, storage: 14.2, actions: 1480, apiCalls: 5200 },
  { period: 'Mar', users: 58, storage: 16.8, actions: 1620, apiCalls: 5800 },
  { period: 'Apr', users: 61, storage: 18.3, actions: 1750, apiCalls: 6200 },
  { period: 'May', users: 67, storage: 21.1, actions: 1890, apiCalls: 6800 },
  { period: 'Jun', users: 72, storage: 23.7, actions: 2100, apiCalls: 7500 },
]

const mockSeatUsage: SeatUsage = {
  total: 100,
  used: 72,
  available: 28,
  users: [
    { id: '1', name: 'Sarah Chen', email: 'sarah@company.com', role: 'Admin', lastActive: '2 hours ago' },
    { id: '2', name: 'Marcus Johnson', email: 'marcus@company.com', role: 'Member', lastActive: '1 day ago' },
    { id: '3', name: 'Emily Rodriguez', email: 'emily@company.com', role: 'Member', lastActive: '3 days ago' },
    { id: '4', name: 'David Kim', email: 'david@company.com', role: 'Guest', lastActive: '1 week ago' },
    { id: '5', name: 'Lisa Thompson', email: 'lisa@company.com', role: 'Member', lastActive: '2 weeks ago' },
  ]
}

const mockStorageUsage: StorageUsage = {
  total: 100, // GB
  used: 23.7,
  breakdown: [
    { category: 'Documents', size: 8.2, count: 1240 },
    { category: 'Images', size: 6.5, count: 3420 },
    { category: 'Videos', size: 5.8, count: 156 },
    { category: 'Audio', size: 2.1, count: 890 },
    { category: 'Other', size: 1.1, count: 234 },
  ]
}

export function UsageSection() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months')
  const [activeTab, setActiveTab] = useState('overview')

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getUsagePercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const renderBarChart = (data: UsageData[], dataKey: keyof UsageData, label: string) => {
    const maxValue = Math.max(...data.map(d => Number(d[dataKey])))
    
    return (
      <div className="space-y-3">
        <h4 className="font-medium">{label}</h4>
        <div className="space-y-2">
          {data.map((item, index) => {
            const value = Number(item[dataKey])
            const percentage = (value / maxValue) * 100
            
            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-sm text-muted-foreground">{item.period}</div>
                <div className="flex-1 relative">
                  <div className="h-6 bg-surface rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium">{value.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span className="font-medium">Usage Period:</span>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1 border rounded-md bg-background"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seats">Seats</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockSeatUsage.used}</div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+12%</span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStorageUsage.used} GB</div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+8.2%</span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7.5K</div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+15%</span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.1K</div>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">-3%</span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderBarChart(mockUsageData, 'users', 'Active Users')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderBarChart(mockUsageData, 'storage', 'Storage (GB)')}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seats" className="space-y-6">
          {/* Seat Usage Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Seat Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{mockSeatUsage.used} / {mockSeatUsage.total}</div>
                  <div className="text-sm text-muted-foreground">Seats used</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getUsageColor(getUsagePercentage(mockSeatUsage.used, mockSeatUsage.total))}`}>
                    {getUsagePercentage(mockSeatUsage.used, mockSeatUsage.total)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Utilization</div>
                </div>
              </div>
              
              <Progress 
                value={getUsagePercentage(mockSeatUsage.used, mockSeatUsage.total)} 
                className="h-2"
              />
              
              <div className="flex items-center gap-2 text-sm">
                {getUsagePercentage(mockSeatUsage.used, mockSeatUsage.total) >= 90 && (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className={getUsageColor(getUsagePercentage(mockSeatUsage.used, mockSeatUsage.total))}>
                  {mockSeatUsage.available} seats available
                </span>
              </div>
            </CardContent>
          </Card>

          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSeatUsage.users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{user.role}</Badge>
                      <div className="text-xs text-muted-foreground mt-1">Last active {user.lastActive}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          {/* Storage Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{mockStorageUsage.used} / {mockStorageUsage.total} GB</div>
                  <div className="text-sm text-muted-foreground">Storage used</div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getUsageColor(getUsagePercentage(mockStorageUsage.used, mockStorageUsage.total))}`}>
                    {getUsagePercentage(mockStorageUsage.used, mockStorageUsage.total)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Utilization</div>
                </div>
              </div>
              
              <Progress 
                value={getUsagePercentage(mockStorageUsage.used, mockStorageUsage.total)} 
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Storage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockStorageUsage.breakdown.map((category, index) => {
                  const percentage = (category.size / mockStorageUsage.used) * 100
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded" />
                          <span className="font-medium">{category.category}</span>
                          <Badge variant="secondary">{category.count} files</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{category.size} GB</div>
                          <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          {/* Action Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  User Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderBarChart(mockUsageData, 'actions', 'Actions')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  API Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderBarChart(mockUsageData, 'apiCalls', 'API Calls')}
              </CardContent>
            </Card>
          </div>

          {/* Action Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Action Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { category: 'File Uploads', count: 342, trend: 'up', percentage: 12 },
                  { category: 'Messages Sent', count: 1250, trend: 'up', percentage: 8 },
                  { category: 'Tasks Created', count: 89, trend: 'down', percentage: -5 },
                  { category: 'Meetings Scheduled', count: 45, trend: 'up', percentage: 15 },
                  { category: 'Documents Edited', count: 234, trend: 'up', percentage: 22 },
                  { category: 'Integrations Used', count: 567, trend: 'up', percentage: 18 },
                ].map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.category}</span>
                      {item.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className={`text-sm ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {item.trend === 'up' ? '+' : ''}{item.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}