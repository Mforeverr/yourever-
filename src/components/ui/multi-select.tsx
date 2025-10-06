import * as React from "react"
import { Button } from "./button"
import { Badge } from "./badge"
import { Input } from "./input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"
import { 
  Search,
  X,
  Check,
  ChevronDown
} from "lucide-react"

interface Option {
  value: string
  label: string
  description?: string
  disabled?: boolean
  group?: string
}

interface MultiSelectProps extends React.HTMLAttributes<HTMLDivElement> {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  maxVisible?: number
  disabled?: boolean
  emptyMessage?: string
  groups?: Record<string, string>
}

function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  searchable = true,
  clearable = true,
  maxVisible = 3,
  disabled = false,
  emptyMessage = "No options found.",
  groups = {},
  className,
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    
    const query = searchQuery.toLowerCase()
    return options.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  const selectedOptions = React.useMemo(() => {
    return options.filter(option => value.includes(option.value))
  }, [options, value])

  const handleToggle = (optionValue: string) => {
    const isSelected = value.includes(optionValue)
    if (isSelected) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleClear = () => {
    onChange([])
  }

  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue))
  }

  const visibleOptions = selectedOptions.slice(0, maxVisible)
  const remainingCount = selectedOptions.length - maxVisible

  // Group options by group
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, Option[]> = {}
    
    filteredOptions.forEach(option => {
      const groupName = option.group || 'default'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(option)
    })
    
    return groups
  }, [filteredOptions])

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
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span className="text-xs truncate max-w-20">
                        {option.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(option.value)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
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
              {clearable && selectedOptions.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            {searchable && (
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search options..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
            
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </div>
              </CommandEmpty>
              
              {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                <CommandGroup key={groupName} heading={groupName !== 'default' ? groups[groupName] || groupName : undefined}>
                  {groupOptions.map((option) => {
                    const isSelected = value.includes(option.value)
                    
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleToggle(option.value)}
                        className="flex items-center gap-3 p-2 cursor-pointer hover:bg-accent/50"
                        disabled={option.disabled}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center",
                            isSelected 
                              ? "bg-brand border-brand text-primary-foreground" 
                              : "border-border"
                          )}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{option.label}</div>
                            {option.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {option.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { MultiSelect, type Option }