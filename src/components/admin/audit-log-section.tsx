'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  MoreHorizontal,
  User,
  Settings,
  Shield,
  Database,
  Mail,
  Key,
  AlertTriangle,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  timestamp: string
  actor: {
    id: string
    name: string
    email: string
  }
  action: string
  resource: string
  details: string
  ipAddress: string
  userAgent: string
  status: 'success' | 'failure' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    actor: { id: '1', name: 'Sarah Chen', email: 'sarah@company.com' },
    action: 'User Login',
    resource: 'Authentication System',
    details: 'Successful login from new device',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    status: 'success',
    severity: 'low'
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:25:00Z',
    actor: { id: '2', name: 'Marcus Johnson', email: 'marcus@company.com' },
    action: 'Settings Updated',
    resource: 'Workspace Settings',
    details: 'Updated workspace name and logo',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    status: 'success',
    severity: 'medium'
  },
  {
    id: '3',
    timestamp: '2024-01-15T10:20:00Z',
    actor: { id: '3', name: 'Emily Rodriguez', email: 'emily@company.com' },
    action: 'User Invited',
    resource: 'User Management',
    details: 'Invited new user: david@company.com',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    status: 'success',
    severity: 'medium'
  },
  {
    id: '4',
    timestamp: '2024-01-15T10:15:00Z',
    actor: { id: 'system', name: 'System', email: 'system@company.com' },
    action: 'Backup Completed',
    resource: 'Backup System',
    details: 'Automated backup completed successfully',
    ipAddress: '127.0.0.1',
    userAgent: 'System Process',
    status: 'success',
    severity: 'low'
  },
  {
    id: '5',
    timestamp: '2024-01-15T10:10:00Z',
    actor: { id: '4', name: 'David Kim', email: 'david@company.com' },
    action: 'Failed Login Attempt',
    resource: 'Authentication System',
    details: 'Invalid password provided',
    ipAddress: '192.168.1.103',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    status: 'failure',
    severity: 'medium'
  },
  {
    id: '6',
    timestamp: '2024-01-15T10:05:00Z',
    actor: { id: '5', name: 'Lisa Thompson', email: 'lisa@company.com' },
    action: 'API Key Generated',
    resource: 'API Management',
    details: 'Generated new API key for third-party integration',
    ipAddress: '192.168.1.104',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    status: 'success',
    severity: 'high'
  },
  {
    id: '7',
    timestamp: '2024-01-15T10:00:00Z',
    actor: { id: 'system', name: 'System', email: 'system@company.com' },
    action: 'Security Alert',
    resource: 'Security System',
    details: 'Multiple failed login attempts detected',
    ipAddress: '127.0.0.1',
    userAgent: 'System Process',
    status: 'warning',
    severity: 'high'
  },
  {
    id: '8',
    timestamp: '2024-01-15T09:55:00Z',
    actor: { id: '1', name: 'Sarah Chen', email: 'sarah@company.com' },
    action: 'File Uploaded',
    resource: 'File System',
    details: 'Uploaded project-document.pdf (2.5 MB)',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    status: 'success',
    severity: 'low'
  }
]

const actionTypes = [
  { value: 'all', label: 'All Actions' },
  { value: 'login', label: 'Authentication' },
  { value: 'settings', label: 'Settings' },
  { value: 'user', label: 'User Management' },
  { value: 'file', label: 'File Operations' },
  { value: 'api', label: 'API Operations' },
  { value: 'security', label: 'Security' },
  { value: 'system', label: 'System' }
]

const severityLevels = [
  { value: 'all', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

export function AuditLogSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(mockAuditLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState('all')
  const [selectedSeverity, setSelectedSeverity] = useState('all')
  const [selectedActor, setSelectedActor] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = selectedAction === 'all' || 
      log.action.toLowerCase().includes(selectedAction.toLowerCase())
    
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity
    
    const matchesActor = selectedActor === '' || 
      log.actor.name === selectedActor || 
      log.actor.email === selectedActor
    
    return matchesSearch && matchesAction && matchesSeverity && matchesActor
  })

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />
      case 'failure':
        return <X className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case 'failure':
        return <Badge variant="destructive">Failure</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge variant="secondary">Low</Badge>
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('login') || action.toLowerCase().includes('auth')) {
      return <Key className="h-4 w-4" />
    }
    if (action.toLowerCase().includes('setting')) {
      return <Settings className="h-4 w-4" />
    }
    if (action.toLowerCase().includes('user')) {
      return <User className="h-4 w-4" />
    }
    if (action.toLowerCase().includes('file')) {
      return <Database className="h-4 w-4" />
    }
    if (action.toLowerCase().includes('api')) {
      return <Shield className="h-4 w-4" />
    }
    if (action.toLowerCase().includes('security')) {
      return <AlertTriangle className="h-4 w-4" />
    }
    if (action.toLowerCase().includes('system')) {
      return <Settings className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const uniqueActors = Array.from(new Set(logs.map(log => log.actor.name)))

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Action Type</label>
              <select 
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                {actionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Severity</label>
              <select 
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                {severityLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Actor</label>
              <select 
                value={selectedActor}
                onChange={(e) => setSelectedActor(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                <option value="">All Actors</option>
                {uniqueActors.map(actor => (
                  <option key={actor} value={actor}>{actor}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Log
              <Badge variant="secondary">{filteredLogs.length} entries</Badge>
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-surface/50">
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.actor.name}</div>
                        <div className="text-sm text-muted-foreground">{log.actor.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span>{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.resource}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.details}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Export Entry
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            Investigate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}