'use client'

import * as React from "react"
import { ChevronDown, Building2, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Organization {
  id: string
  name: string
  divisions: Division[]
}

interface Division {
  id: string
  name: string
}

interface ScopeSwitcherProps {
  organizations: Organization[]
  currentOrgId?: string
  currentDivisionId?: string
  onScopeChange?: (orgId: string, divisionId: string) => void
  onDivisionChange?: (divisionId: string) => void
  className?: string
}

function ScopeSwitcher({ 
  organizations,
  currentOrgId,
  currentDivisionId,
  onScopeChange,
  onDivisionChange,
  className 
}: ScopeSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const currentOrg = organizations.find(org => org.id === currentOrgId)
  const currentDivision = currentOrg?.divisions.find(div => div.id === currentDivisionId)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start gap-2 h-8 px-3 bg-surface-elevated border-border",
            className
          )}
        >
          <Building2 className="size-4" />
          <span className="truncate">
            {currentOrg?.name || 'Select Organization'}
          </span>
          {currentDivision && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">
                {currentDivision.name}
              </span>
            </>
          )}
          <ChevronDown className="size-4 ml-auto shrink-0" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-96">
          <div className="p-2">
            {organizations.map((org) => (
              <div key={org.id} className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  <Building2 className="size-4" />
                  {org.name}
                </div>
                <div className="ml-6 space-y-1">
                  {org.divisions.map((division) => (
                    <button
                      key={division.id}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors",
                        currentOrgId === org.id && currentDivisionId === division.id && "bg-accent"
                      )}
                      onClick={() => {
                        if (currentOrgId === org.id) {
                          onDivisionChange?.(division.id)
                        }
                        onScopeChange?.(org.id, division.id)
                        setIsOpen(false)
                      }}
                    >
                      <MapPin className="size-3 text-muted-foreground" />
                      {division.name}
                      {currentOrgId === org.id && currentDivisionId === division.id && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-brand"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export { ScopeSwitcher }
