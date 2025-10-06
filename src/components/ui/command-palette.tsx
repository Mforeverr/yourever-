'use client'

import * as React from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { DialogTitle } from "@/components/ui/dialog"
import { 
  Search,
  Plus,
  FileText,
  Folder,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Home,
  ArrowRight,
  Clock
} from "lucide-react"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: string
  shortcut?: string
}

function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = React.useState("")
  
  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      icon: <Home className="size-4" />,
      action: () => console.log('Navigate to dashboard'),
      category: 'Navigation',
      shortcut: '⌘D'
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      icon: <Folder className="size-4" />,
      action: () => console.log('Navigate to projects'),
      category: 'Navigation',
      shortcut: '⌘P'
    },
    {
      id: 'nav-calendar',
      title: 'Go to Calendar',
      icon: <Calendar className="size-4" />,
      action: () => console.log('Navigate to calendar'),
      category: 'Navigation',
      shortcut: '⌘C'
    },
    
    // Create
    {
      id: 'create-task',
      title: 'New Task',
      description: 'Create a new task',
      icon: <Plus className="size-4" />,
      action: () => console.log('Create new task'),
      category: 'Create',
      shortcut: '⌘⇧T'
    },
    {
      id: 'create-project',
      title: 'New Project',
      description: 'Create a new project',
      icon: <Folder className="size-4" />,
      action: () => console.log('Create new project'),
      category: 'Create',
      shortcut: '⌘⇧P'
    },
    {
      id: 'create-doc',
      title: 'New Document',
      description: 'Create a new document',
      icon: <FileText className="size-4" />,
      action: () => console.log('Create new document'),
      category: 'Create',
      shortcut: '⌘⇧D'
    },
    {
      id: 'create-channel',
      title: 'New Channel',
      description: 'Create a new channel',
      icon: <MessageSquare className="size-4" />,
      action: () => console.log('Create new channel'),
      category: 'Create',
      shortcut: '⌘⇧C'
    },
    {
      id: 'create-event',
      title: 'New Event',
      description: 'Create a new calendar event',
      icon: <Calendar className="size-4" />,
      action: () => console.log('Create new event'),
      category: 'Create',
      shortcut: '⌘⇧E'
    },
    
    // Recent
    {
      id: 'recent-task-1',
      title: 'Design new landing page',
      description: 'Task in Website Revamp',
      icon: <FileText className="size-4" />,
      action: () => console.log('Open recent task'),
      category: 'Recent'
    },
    {
      id: 'recent-project-1',
      title: 'Website Revamp',
      description: 'Project in Marketing',
      icon: <Folder className="size-4" />,
      action: () => console.log('Open recent project'),
      category: 'Recent'
    },
    {
      id: 'recent-channel-1',
      title: '#general',
      description: 'Channel',
      icon: <MessageSquare className="size-4" />,
      action: () => console.log('Open recent channel'),
      category: 'Recent'
    },
    
    // Settings
    {
      id: 'settings-profile',
      title: 'Profile Settings',
      icon: <Settings className="size-4" />,
      action: () => console.log('Open profile settings'),
      category: 'Settings'
    },
    {
      id: 'settings-workspace',
      title: 'Workspace Settings',
      icon: <Settings className="size-4" />,
      action: () => console.log('Open workspace settings'),
      category: 'Settings'
    }
  ]

  const filteredCommands = React.useMemo(() => {
    if (!search) return commands

    const searchLower = search.toLowerCase()
    return commands.filter(command => 
      command.title.toLowerCase().includes(searchLower) ||
      command.description?.toLowerCase().includes(searchLower) ||
      command.category.toLowerCase().includes(searchLower)
    )
  }, [search, commands])

  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    
    filteredCommands.forEach(command => {
      if (!groups[command.category]) {
        groups[command.category] = []
      }
      groups[command.category].push(command)
    })
    
    return groups
  }, [filteredCommands])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Command Palette</DialogTitle>
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput
          placeholder="Type a command or search..."
          value={search}
          onValueChange={setSearch}
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {Object.entries(groupedCommands).map(([category, items]) => (
          <CommandGroup key={category} heading={category}>
            {items.map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => {
                  command.action()
                  onOpenChange(false)
                }}
                className="flex items-center gap-2 px-2 py-2"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  {command.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{command.title}</div>
                  {command.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {command.description}
                    </div>
                  )}
                </div>
                {command.shortcut && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {command.shortcut}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        
        {/* Footer */}
        <div className="border-t p-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">ESC</kbd>
                <span>Close</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>Recent</span>
            </div>
          </div>
        </div>
      </CommandList>
    </CommandDialog>
  )
}

export { CommandPalette }