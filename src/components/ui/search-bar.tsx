import * as React from "react"
import { Button } from "./button"
import { Input } from "./input"
import { Badge } from "./badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"
import { 
  Search,
  Filter,
  X,
  Clock,
  TrendingUp,
  FileText,
  User,
  Hash,
  Calendar,
  ChevronDown
} from "lucide-react"

interface SearchSuggestion {
  id: string
  title: string
  type: 'recent' | 'trending' | 'document' | 'user' | 'tag' | 'date'
  description?: string
  icon?: React.ReactNode
  action?: () => void
}

interface SearchFilter {
  key: string
  label: string
  value: string
  removable?: boolean
}

interface SearchBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  suggestions?: SearchSuggestion[]
  filters?: SearchFilter[]
  onFilterAdd?: (key: string, value: string) => void
  onFilterRemove?: (key: string) => void
  onClear?: () => void
  showFilters?: boolean
  showSuggestions?: boolean
  showRecentSearches?: boolean
  disabled?: boolean
  loading?: boolean
  compact?: boolean
}

function SearchBar({
  value = "",
  onChange,
  onSubmit,
  placeholder = "Search...",
  suggestions = [],
  filters = [],
  onFilterAdd,
  onFilterRemove,
  onClear,
  showFilters = true,
  showSuggestions = true,
  showRecentSearches = true,
  disabled = false,
  loading = false,
  compact = false,
  className,
  ...props
}: SearchBarProps) {
  const [inputValue, setInputValue] = React.useState(value)
  const [open, setOpen] = React.useState(false)
  const [showFilterMenu, setShowFilterMenu] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSubmit?.(inputValue.trim())
      setOpen(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange?.(newValue)
    setOpen(newValue.length > 0 && showSuggestions)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.title)
    onChange?.(suggestion.title)
    onSubmit?.(suggestion.title)
    setOpen(false)
    suggestion.action?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    setInputValue("")
    onChange?.("")
    onClear?.()
    inputRef.current?.focus()
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent': return <Clock className="h-4 w-4" />
      case 'trending': return <TrendingUp className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      case 'user': return <User className="h-4 w-4" />
      case 'tag': return <Hash className="h-4 w-4" />
      case 'date': return <Calendar className="h-4 w-4" />
      default: return <Search className="h-4 w-4" />
    }
  }

  const getSuggestionGroup = (type: string) => {
    switch (type) {
      case 'recent': return 'Recent Searches'
      case 'trending': return 'Trending'
      case 'document': return 'Documents'
      case 'user': return 'People'
      case 'tag': return 'Tags'
      case 'date': return 'Dates'
      default: return 'Suggestions'
    }
  }

  const groupedSuggestions = React.useMemo(() => {
    const groups: Record<string, SearchSuggestion[]> = {}
    
    suggestions.forEach(suggestion => {
      const group = getSuggestionGroup(suggestion.type)
      if (!groups[group]) groups[group] = []
      groups[group].push(suggestion)
    })
    
    return groups
  }, [suggestions])

  const availableFilters = [
    { key: 'type', label: 'Type', options: ['Document', 'Image', 'Video', 'Audio'] },
    { key: 'date', label: 'Date', options: ['Today', 'This Week', 'This Month', 'This Year'] },
    { key: 'author', label: 'Author', options: ['Me', 'Team', 'External'] },
    { key: 'status', label: 'Status', options: ['Active', 'Archived', 'Draft'] }
  ]

  return (
    <div className={cn("w-full max-w-2xl", className)} {...props}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Main Search Input */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(inputValue.length > 0 && showSuggestions)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pl-10 pr-20",
              compact && "h-9 text-sm",
              "focus:ring-2 focus:ring-brand/50"
            )}
          />
          
          {/* Right Side Actions */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {showFilters && (
              <Popover open={showFilterMenu} onOpenChange={setShowFilterMenu}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <Filter className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search filters..." />
                    <CommandList>
                      <CommandEmpty>No filters found.</CommandEmpty>
                      {availableFilters.map((filter) => (
                        <CommandGroup key={filter.key} heading={filter.label}>
                          {filter.options.map((option) => (
                            <CommandItem
                              key={`${filter.key}-${option}`}
                              onSelect={() => {
                                onFilterAdd?.(filter.key, option)
                                setShowFilterMenu(false)
                              }}
                            >
                              {option}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Active Filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {filters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <span>{filter.label}: {filter.value}</span>
                {filter.removable !== false && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => onFilterRemove?.(filter.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </form>
      
      {/* Suggestions Dropdown */}
      {open && suggestions.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start" sideOffset={4}>
            <Command>
              <CommandList>
                {Object.entries(groupedSuggestions).map(([groupName, groupSuggestions]) => (
                  <CommandGroup key={groupName} heading={groupName}>
                    {groupSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        onSelect={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 p-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-elevated">
                          {suggestion.icon || getSuggestionIcon(suggestion.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{suggestion.title}</div>
                          {suggestion.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

export { SearchBar, type SearchSuggestion, type SearchFilter }