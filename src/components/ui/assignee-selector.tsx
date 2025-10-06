import * as React from "react"
import { Button } from "./button"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { Input } from "./input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"
import { 
  Search,
  Users,
  X,
  Plus,
  Check
} from "lucide-react"

interface User {
  id: string
  name: string
  email?: string
  avatar?: string
  status?: 'online' | 'away' | 'offline'
  role?: string
}

interface AssigneeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  users: User[]
  selectedUsers: User[]
  onSelectionChange: (users: User[]) => void
  placeholder?: string
  searchable?: boolean
  multiSelect?: boolean
  showStatus?: boolean
  showRole?: boolean
  maxVisible?: number
  disabled?: boolean
}

function AssigneeSelector({
  users,
  selectedUsers,
  onSelectionChange,
  placeholder = "Select assignees...",
  searchable = true,
  multiSelect = true,
  showStatus = true,
  showRole = false,
  maxVisible = 3,
  disabled = false,
  className,
  ...props
}: AssigneeSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users
    
    const query = searchQuery.toLowerCase()
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  const handleUserSelect = (user: User) => {
    if (multiSelect) {
      const isSelected = selectedUsers.some(u => u.id === user.id)
      if (isSelected) {
        onSelectionChange(selectedUsers.filter(u => u.id !== user.id))
      } else {
        onSelectionChange([...selectedUsers, user])
      }
    } else {
      onSelectionChange([user])
      setOpen(false)
    }
  }

  const handleRemoveUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter(u => u.id !== userId))
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const visibleUsers = selectedUsers.slice(0, maxVisible)
  const remainingCount = selectedUsers.length - maxVisible

  return (
    <div className={cn("w-full", className)} {...props}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-auto min-h-10 p-2",
              "hover:bg-accent/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {selectedUsers.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{placeholder}</span>
                </div>
              ) : (
                <>
                  {visibleUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate max-w-20">
                          {user.name}
                        </span>
                      </div>
                      {multiSelect && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveUser(user.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </Badge>
                  ))}
                  {remainingCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      +{remainingCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {searchable && (
                <Search className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            {searchable && (
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search users..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
            
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              </CommandEmpty>
              
              <CommandGroup>
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.some(u => u.id === user.id)
                  
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => handleUserSelect(user)}
                      className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          {showStatus && user.status && (
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                                getStatusColor(user.status)
                              )}
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{user.name}</span>
                            {showRole && user.role && (
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <Check className="h-4 w-4 text-brand" />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { AssigneeSelector, type User }