'use client'

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { DialogTitle } from "@/components/ui/dialog"
import { QuickAddModal } from "@/components/global/quick-add-modal"
import { toast } from "@/hooks/use-toast"
import {
  ArrowRight,
  Calendar,
  Folder,
  Hash,
  Home,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Users,
  FileText,
  ListChecks,
  Building2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { usePaletteStore } from "@/state/palette.store"
import { useScopeStore } from "@/state/scope.store"
import { ApiError, searchWorkspace, quickCreate } from "@/lib/api"
import type {
  ApiSearchResult,
  GlobalEntityType,
  PaletteSearchResult,
  QuickAddSubmitPayload,
  QuickAddType,
} from "@/types/command-palette"

const RESULT_ICON_CLASS = "h-4 w-4 text-muted-foreground"
const BADGE_ICON_CLASS = "h-3 w-3 text-muted-foreground"
const ENABLE_GLOBAL_COMMAND_API =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_ENABLE_GLOBAL_COMMAND_API !== "false"
    : true

const typeBadgeLabel: Record<GlobalEntityType, string> = {
  task: "Task",
  project: "Project",
  doc: "Document",
  channel: "Channel",
  event: "Event",
  user: "Teammate",
  organization: "Organization",
  division: "Division",
}

const typeIconComponents: Record<GlobalEntityType, LucideIcon> = {
  task: ListChecks,
  project: Folder,
  doc: FileText,
  channel: MessageSquare,
  event: Calendar,
  user: Users,
  organization: Building2,
  division: Hash,
}

interface CommandPaletteAction {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  keywords?: string[]
  run: () => void
}

const getTypeIcon = (type: GlobalEntityType, className: string) => {
  const Icon = typeIconComponents[type]
  if (!Icon) {
    return <Search className={className} />
  }
  return <Icon className={className} />
}

const resolveWorkspaceHref = (path: string | undefined, basePath: string) => {
  const normalizedBase = basePath || "/workspace-hub"
  const trimmedBase = normalizedBase.replace(/\/$/, "") || "/workspace-hub"
  const isWorkspaceHubBase = trimmedBase === "/workspace-hub"

  if (!path) {
    return trimmedBase
  }

  if (path.startsWith("http")) {
    return path
  }

  if (path.startsWith("/")) {
    return path
  }

  const sanitized = path.replace(/^\//, "")

  if (isWorkspaceHubBase) {
    if (!sanitized || sanitized === "dashboard") {
      return "/workspace-hub"
    }
    return `/workspace-hub/${sanitized}`
  }

  if (!trimmedBase || trimmedBase === "/") {
    return `/${sanitized}`
  }

  return `${trimmedBase}/${sanitized}`
}

const mapSearchResults = (
  items: ApiSearchResult[],
  basePath: string
): PaletteSearchResult[] =>
  items.map((item) => ({
    ...item,
    badgeLabel: typeBadgeLabel[item.type] ?? item.type,
    href: resolveWorkspaceHref(item.href, basePath),
  }))

function CommandPaletteInternal() {
  const router = useRouter()
  const pathname = usePathname()
  const previousPathnameRef = React.useRef(pathname)
  const workspaceBasePath = useScopeStore((state) => state.workspaceBasePath)
  const currentOrgId = useScopeStore((state) => state.currentOrgId)
  const currentDivisionId = useScopeStore((state) => state.currentDivisionId)

  const isOpen = usePaletteStore((state) => state.isOpen)
  const query = usePaletteStore((state) => state.query)
  const results = usePaletteStore((state) => state.results)
  const isSearching = usePaletteStore((state) => state.isSearching)
  const error = usePaletteStore((state) => state.error)
  const setQuery = usePaletteStore((state) => state.setQuery)
  const setResults = usePaletteStore((state) => state.setResults)
  const setIsSearching = usePaletteStore((state) => state.setIsSearching)
  const setError = usePaletteStore((state) => state.setError)
  const openQuickAdd = usePaletteStore((state) => state.openQuickAdd)
  const closePalette = usePaletteStore((state) => state.closePalette)

  React.useEffect(() => {
    if (pathname === previousPathnameRef.current) {
      return
    }
    previousPathnameRef.current = pathname
    if (usePaletteStore.getState().isOpen) {
      usePaletteStore.getState().closePalette()
    }
  }, [pathname])

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setIsSearching(false)
      setError(undefined)
      return
    }

    if (!ENABLE_GLOBAL_COMMAND_API) {
      setIsSearching(false)
      setError("Global search is disabled. Set NEXT_PUBLIC_ENABLE_GLOBAL_COMMAND_API to enable it.")
      setResults([])
      return
    }

    const controller = new AbortController()
    let disposed = false

    const runSearch = async () => {
      setIsSearching(true)
      setError(undefined)

      const params = new URLSearchParams({ q: trimmed })
      if (currentOrgId) params.append("orgId", currentOrgId)
      if (currentDivisionId) params.append("divisionId", currentDivisionId)

      try {
        const payload = await searchWorkspace({
          query: trimmed,
          orgId: currentOrgId ?? undefined,
          divisionId: currentDivisionId ?? undefined,
          signal: controller.signal,
        })
        if (!disposed) {
          setResults(mapSearchResults(payload, workspaceBasePath))
        }
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === "AbortError")) {
          return
        }
        setError(
          error instanceof ApiError
            ? error.message
            : "We couldn't search the workspace. Please try again."
        )
        setResults([])
      } finally {
        if (!disposed) {
          setIsSearching(false)
        }
      }
    }

    const timeout = window.setTimeout(runSearch, 150)

    return () => {
      disposed = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [
    isOpen,
    query,
    currentOrgId,
    currentDivisionId,
    setResults,
    setIsSearching,
    setError,
    workspaceBasePath,
  ])

  const handleQuickAdd = React.useCallback(
    (type: QuickAddType) => {
      openQuickAdd({ type })
    },
    [openQuickAdd]
  )

  const quickActions = React.useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "quick-add-task",
        title: "New Task",
        description: "Create a task in the current workspace",
        icon: <Plus className="w-4 h-4" />,
        shortcut: "⌘⇧T",
        keywords: ["create", "task", "todo"],
        run: () => handleQuickAdd("task"),
      },
      {
        id: "quick-add-project",
        title: "New Project",
        description: "Spin up a new project",
        icon: <Folder className="w-4 h-4" />,
        shortcut: "⌘⇧P",
        keywords: ["create", "project"],
        run: () => handleQuickAdd("project"),
      },
      {
        id: "quick-add-channel",
        title: "New Channel",
        description: "Start a conversation channel",
        icon: <MessageSquare className="w-4 h-4" />,
        shortcut: "⌘⇧C",
        keywords: ["create", "channel", "chat"],
        run: () => handleQuickAdd("channel"),
      },
      {
        id: "quick-add-event",
        title: "New Event",
        description: "Schedule workspace event",
        icon: <Calendar className="w-4 h-4" />,
        shortcut: "⌘⇧E",
        keywords: ["create", "event", "calendar"],
        run: () => handleQuickAdd("event"),
      },
      {
        id: "quick-add-doc",
        title: "New Document",
        description: "Capture notes and briefs",
        icon: <FileText className="w-4 h-4" />,
        shortcut: "⌘⇧D",
        keywords: ["doc", "note", "document"],
        run: () => handleQuickAdd("doc"),
      },
    ],
    [handleQuickAdd]
  )

  const navigationItems = React.useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "navigate-dashboard",
        title: "Go to Workspace Home",
        description: "Jump to your last active scope",
        icon: <Home className="w-4 h-4" />,
        keywords: ["home", "dashboard"],
        run: () => {
          const href = resolveWorkspaceHref("dashboard", workspaceBasePath)
          closePalette()
          router.push(href)
        },
      },
      {
        id: "navigate-workspace-hub",
        title: "Switch Organization",
        description: "Manage organizations and divisions",
        icon: <Building2 className="w-4 h-4" />,
        keywords: ["organization", "switch"],
        run: () => {
          closePalette()
          router.push("/workspace-hub")
        },
      },
      {
        id: "navigate-invite",
        title: "Invite Teammates",
        description: "Send workspace invitations",
        icon: <Users className="w-4 h-4" />,
        keywords: ["invite", "team"],
        run: () => {
          closePalette()
          router.push("/o/invite")
        },
      },
      {
        id: "navigate-settings",
        title: "Workspace Settings",
        description: "Manage workspace configuration",
        icon: <Settings className="w-4 h-4" />,
        keywords: ["settings", "preferences"],
        run: () => {
          closePalette()
          router.push("/settings")
        },
      },
    ],
    [closePalette, router, workspaceBasePath]
  )

  const filteredQuickActions = React.useMemo(() => {
    if (!query) {
      return quickActions
    }
    const lowered = query.toLowerCase()
    return quickActions.filter((action) => {
      const matchesTitle = action.title.toLowerCase().includes(lowered)
      const matchesDescription = action.description?.toLowerCase().includes(lowered)
      const matchesKeyword = action.keywords?.some((keyword) => keyword.includes(lowered))
      return matchesTitle || matchesDescription || matchesKeyword
    })
  }, [quickActions, query])

  const hasSearchQuery = query.trim().length > 0
  const showQuickActions = filteredQuickActions.length > 0
  const showNavigation = !hasSearchQuery && navigationItems.length > 0

  const handleSearchSelect = React.useCallback(
    (result: PaletteSearchResult) => {
      closePalette()
      if (result.href) {
        router.push(result.href)
      }
    },
    [closePalette, router]
  )

  const handleActionSelect = React.useCallback((action: CommandPaletteAction) => {
    action.run()
  }, [])

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => (open ? usePaletteStore.getState().openPalette() : closePalette())}>
      <DialogTitle className="sr-only">Command Palette</DialogTitle>
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search tasks, projects, channels…"
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <CommandList>
        <CommandEmpty>
          {error
            ? error
            : hasSearchQuery
              ? `No results found for “${query}”.`
              : "Start typing to search your workspace."}
        </CommandEmpty>

        {showQuickActions && (
          <CommandGroup heading="Quick Actions">
            {filteredQuickActions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => handleActionSelect(action)}
                className="flex items-center gap-3 px-2 py-2"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{action.title}</div>
                  {action.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </div>
                  )}
                </div>
                {action.shortcut && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {action.shortcut}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showNavigation && (
          <>
            {showQuickActions && <CommandSeparator />}
            <CommandGroup heading="Navigate">
              {navigationItems.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleActionSelect(action)}
                  className="flex items-center gap-3 px-2 py-2"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{action.title}</div>
                    {action.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {action.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {hasSearchQuery && (
          <>
            {(showQuickActions || showNavigation) && <CommandSeparator />}
            <CommandGroup heading="Search Results">
              {isSearching && (
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching workspace…
                </div>
              )}

              {!isSearching && error && (
                <div className="px-2 py-3 text-xs text-destructive">
                  {error}
                </div>
              )}

              {!isSearching &&
                !error &&
                results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSearchSelect(result)}
                    className="flex items-center gap-3 px-2 py-2"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      {getTypeIcon(result.type, RESULT_ICON_CLASS)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{result.title}</div>
                      {result.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs ml-auto flex items-center gap-1">
                      {getTypeIcon(result.type, BADGE_ICON_CLASS)}
                      {result.badgeLabel}
                    </Badge>
                  </CommandItem>
                ))}

              {!isSearching && !error && results.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  We could not find anything for “{query}”. Try a different term.
                </div>
              )}
            </CommandGroup>
          </>
        )}

        <div className="border-t px-3 py-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">⌘K</kbd>
                <span>Toggle</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                <span>Run</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              <span>Use quick add for faster workflows</span>
            </div>
          </div>
        </div>
      </CommandList>
    </CommandDialog>
  )
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const quickAddOptions = usePaletteStore((state) => state.quickAdd)
  const closeQuickAdd = usePaletteStore((state) => state.closeQuickAdd)

  const currentOrgId = useScopeStore((state) => state.currentOrgId)
  const currentDivisionId = useScopeStore((state) => state.currentDivisionId)

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const target = event.target as HTMLElement | null
        if (target) {
          const tagName = target.tagName
          const isInteractive =
            target.isContentEditable ||
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            tagName === "SELECT"
          if (isInteractive) {
            return
          }
        }
        event.preventDefault()
        usePaletteStore.getState().togglePalette()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleQuickAddCreate = React.useCallback(
    async (payload: QuickAddSubmitPayload) => {
      const scopedPayload: QuickAddSubmitPayload = {
        ...payload,
        orgId: currentOrgId ?? undefined,
        divisionId: currentDivisionId ?? undefined,
      }

      if (!ENABLE_GLOBAL_COMMAND_API) {
        console.info("[CommandPalette] Quick add recorded (API disabled)", scopedPayload)
        return
      }

      await quickCreate(scopedPayload)
    },
    [currentDivisionId, currentOrgId]
  )

  const handleQuickAddSuccess = React.useCallback((payload: QuickAddSubmitPayload) => {
    toast({
      title: "Created successfully",
      description: `Created ${payload.type} “${payload.title}”.`,
    })
  }, [])

  const handleQuickAddError = React.useCallback((error: Error) => {
    toast({
      title: "Quick add failed",
      description: error.message || "Unable to create the requested item.",
      variant: "destructive",
    })
  }, [])

  return (
    <>
      {children}
      <CommandPaletteInternal />
      <QuickAddModal
        key={quickAddOptions?.type ?? "quick-add"}
        open={Boolean(quickAddOptions)}
        type={quickAddOptions?.type ?? "task"}
        defaultContext={quickAddOptions?.defaultContext}
        initialValues={quickAddOptions?.initialValues}
        onClose={closeQuickAdd}
        onCreate={handleQuickAddCreate}
        onSuccess={handleQuickAddSuccess}
        onError={handleQuickAddError}
      />
    </>
  )
}

export function useCommandPalette() {
  const openPalette = usePaletteStore((state) => state.openPalette)
  const closePalette = usePaletteStore((state) => state.closePalette)
  const togglePalette = usePaletteStore((state) => state.togglePalette)
  const openQuickAdd = usePaletteStore((state) => state.openQuickAdd)

  return React.useMemo(
    () => ({
      openPalette,
      closePalette,
      togglePalette,
      openQuickAdd,
    }),
    [openPalette, closePalette, togglePalette, openQuickAdd]
  )
}
