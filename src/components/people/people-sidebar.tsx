'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Crown,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'

// Types
interface Person {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'member' | 'guest' | 'owner'
  status: 'active' | 'away' | 'busy' | 'offline'
  timezone: string
  department?: string
  location?: string
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
    department: 'Engineering',
    location: 'San Francisco'
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    email: 'marcus.j@company.com',
    avatar: '/avatars/marcus.jpg',
    role: 'admin',
    status: 'active',
    timezone: 'EST (UTC-5)',
    department: 'Product',
    location: 'New York'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@company.com',
    avatar: '/avatars/emily.jpg',
    role: 'member',
    status: 'busy',
    timezone: 'CST (UTC-6)',
    department: 'Design',
    location: 'Chicago'
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@company.com',
    avatar: '/avatars/david.jpg',
    role: 'member',
    status: 'away',
    timezone: 'MST (UTC-7)',
    department: 'Engineering',
    location: 'Denver'
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa.t@company.com',
    avatar: '/avatars/lisa.jpg',
    role: 'guest',
    status: 'offline',
    timezone: 'GMT (UTC+0)',
    department: 'Marketing',
    location: 'London'
  }
]

interface PeopleSidebarProps {
  className?: string
}

export function PeopleSidebar({ className }: PeopleSidebarProps) {
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

  const getRoleIcon = (role: Person['role']) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Shield
      case 'member': return Users
      case 'guest': return Users
      default: return Users
    }
  }

  const getRoleColor = (role: Person['role']) => {
    switch (role) {
      case 'owner': return 'text-purple-600 dark:text-purple-400'
      case 'admin': return 'text-blue-600 dark:text-blue-400'
      case 'member': return 'text-green-600 dark:text-green-400'
      case 'guest': return 'text-gray-600 dark:text-gray-400'
      default: return 'text-gray-600'
    }
  }

  // Group people by role
  const groupedPeople = mockPeople.reduce((acc, person) => {
    if (!acc[person.role]) {
      acc[person.role] = []
    }
    acc[person.role].push(person)
    return acc
  }, {} as Record<string, Person[]>)

  const roleOrder = ['owner', 'admin', 'member', 'guest']

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">People</h3>
          </div>
          <Button variant="ghost" size="sm">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-surface rounded-lg p-2">
            <div className="font-medium text-green-600">
              {mockPeople.filter(p => p.status === 'active').length}
            </div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div className="bg-surface rounded-lg p-2">
            <div className="font-medium">{mockPeople.length}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
        </div>
      </div>

      {/* People List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {roleOrder.map((role) => {
            const peopleInRole = groupedPeople[role]
            if (!peopleInRole || peopleInRole.length === 0) return null

            const RoleIcon = getRoleIcon(role as Person['role'])

            return (
              <div key={role}>
                <div className="flex items-center gap-2 mb-2">
                  <RoleIcon className={`h-4 w-4 ${getRoleColor(role as Person['role'])}`} />
                  <h4 className="text-sm font-medium capitalize">{role}s</h4>
                  <Badge variant="secondary" className="text-xs">
                    {peopleInRole.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {peopleInRole.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface cursor-pointer group"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={person.avatar} alt={person.name} />
                          <AvatarFallback className="text-xs">
                            {person.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusColor(person.status)}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{person.name}</p>
                          {person.role === 'owner' && (
                            <Crown className="h-3 w-3 text-purple-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{person.department}</span>
                          {person.location && (
                            <>
                              <span>•</span>
                              <span>{person.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" size="sm" className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite People
        </Button>
      </div>
    </div>
  )
}