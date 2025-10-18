'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  Shield,
  Clock,
  Filter,
  Download,
  Settings
} from 'lucide-react'
import { InviteModal } from '@/components/people/invite-modal'
import { DeactivateModal } from '@/components/people/deactivate-modal'

// Types
interface Person {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'member' | 'guest' | 'owner'
  status: 'active' | 'away' | 'busy' | 'offline'
  timezone: string
  lastSeen: string
  joinedAt: string
}

// Mock data
const mockPeople: Person[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    avatar: '/avatars/sarah.jpg',
    role: 'owner',
    status: 'active',
    timezone: 'PST (UTC-8)',
    lastSeen: 'Online now',
    joinedAt: '2023-01-15'
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus.j@company.com',
    avatar: '/avatars/marcus.jpg',
    role: 'admin',
    status: 'active',
    timezone: 'EST (UTC-5)',
    lastSeen: '2 min ago',
    joinedAt: '2023-02-20'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@company.com',
    avatar: '/avatars/emily.jpg',
    role: 'member',
    status: 'busy',
    timezone: 'CST (UTC-6)',
    lastSeen: '5 min ago',
    joinedAt: '2023-03-10'
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@company.com',
    avatar: '/avatars/david.jpg',
    role: 'member',
    status: 'away',
    timezone: 'MST (UTC-7)',
    lastSeen: '30 min ago',
    joinedAt: '2023-04-05'
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa.t@company.com',
    avatar: '/avatars/lisa.jpg',
    role: 'guest',
    status: 'offline',
    timezone: 'GMT (UTC+0)',
    lastSeen: '2 hours ago',
    joinedAt: '2023-05-12'
  },
  {
    id: '6',
    name: 'Alex Rivera',
    email: 'alex.r@company.com',
    avatar: '/avatars/alex.jpg',
    role: 'member',
    status: 'active',
    timezone: 'CET (UTC+1)',
    lastSeen: 'Online now',
    joinedAt: '2023-06-18'
  }
]

// Helper functions
const getStatusColor = (status: Person['status']) => {
  switch (status) {
    case 'active': return 'bg-green-500'
    case 'away': return 'bg-yellow-500'
    case 'busy': return 'bg-red-500'
    case 'offline': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

const getRoleColor = (role: Person['role']) => {
  switch (role) {
    case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'member': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'guest': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getRoleIcon = (role: Person['role']) => {
  switch (role) {
    case 'owner': return Shield
    case 'admin': return Settings
    default: return null
  }
}

// Main Component
export default function PeoplePage({ params }: { params: Promise<{ orgId: string; divisionId: string }> }) {
  const [orgId, setOrgId] = useState<string>('')
  const [divisionId, setDivisionId] = useState<string>('')
  const [paramsResolved, setParamsResolved] = useState(false)

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setOrgId(resolvedParams.orgId)
      setDivisionId(resolvedParams.divisionId)
      setParamsResolved(true)
    }
    resolveParams()
  }, [params])

  // Don't render until params are resolved
  if (!paramsResolved) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <PeoplePageContent orgId={orgId} divisionId={divisionId} />
}

// Component that contains all the state and UI logic
function PeoplePageContent({ orgId, divisionId }: { orgId: string; divisionId: string }) {
  const [people, setPeople] = useState<Person[]>(mockPeople)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  // Filter people
  const filteredPeople = people.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         person.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === 'all' || person.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || person.status === selectedStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  // Handle actions
  const handleInvite = () => {
    setInviteModalOpen(true)
  }

  const handleDeactivate = (person: Person) => {
    setSelectedPerson(person)
    setDeactivateModalOpen(true)
  }

  const handleSendEmail = (person: Person) => {
    window.open(`mailto:${person.email}`, '_blank')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">People</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage team members and their permissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleInvite} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite People
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-surface p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-1 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1 rounded-md border border-border bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* People Table */}
      <div className="flex-1 overflow-auto">
        <Card className="m-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.map((person) => {
                  const RoleIcon = getRoleIcon(person.role)
                  return (
                    <TableRow key={person.id} className="hover:bg-surface/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.avatar} alt={person.name} />
                              <AvatarFallback>
                                {person.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(person.status)}`} />
                          </div>
                          <div>
                            <div className="font-medium">{person.name}</div>
                            <div className="text-sm text-muted-foreground">{person.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(person.role)}>
                            {RoleIcon && <RoleIcon className="h-3 w-3 mr-1" />}
                            {person.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {person.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {person.timezone}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {person.lastSeen}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(person.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSendEmail(person)}>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeactivate(person)}
                              className="text-destructive"
                            >
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <InviteModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        orgId={orgId}
      />
      
      <DeactivateModal 
        open={deactivateModalOpen} 
        onOpenChange={setDeactivateModalOpen}
        person={selectedPerson}
      />
    </div>
  )
}