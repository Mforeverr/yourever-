'use client'

import * as React from "react"
import {
  Folder,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Search,
  Plus,
  Home,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Bot,
  User,
  Lock,
  Bell,
  Palette,
  Globe,
  CreditCard,
  BarChart3,
  Shield,
  Key,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Mail,
  MessageCircle,
  UserPlus,
  Zap,
  Database,
  Sun,
  Moon,
  Monitor,
  Languages,
  Plug
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCurrentUser } from "@/hooks/use-auth"

interface ActivityBarProps {
  activeItem?: string
  onItemChange?: (item: string) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

const activityItems = [
  { id: 'home', icon: Home, label: 'Dashboard' },
  { id: 'workspace', icon: LayoutGrid, label: 'Workspace' },
  { id: 'explorer', icon: Folder, label: 'Explorer' },
  { id: 'ai', icon: Bot, label: 'Yourever AI' },
  { id: 'channels', icon: MessageSquare, label: 'Channels & Chat' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'people', icon: Users, label: 'People' },
  { id: 'admin', icon: Settings, label: 'Admin' },
  { id: 'search', icon: Search, label: 'Search' },
]

function ActivityBar({ activeItem = 'home', onItemChange, isCollapsed = false, onToggleCollapse, className }: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col items-center gap-2 h-full bg-surface-panel border-r border-border",
        isCollapsed ? "w-12" : "w-16",
        className
      )}>
        <div className="flex flex-col items-center gap-1 p-2">
          {activityItems.map((item) => {
            const Icon = item.icon
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeItem === item.id ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "rounded-lg",
                      isCollapsed ? "h-8 w-8" : "h-10 w-10",
                      activeItem === item.id && "bg-brand"
                    )}
                    onClick={() => onItemChange?.(item.id)}
                  >
                    <Icon className={cn(isCollapsed ? "size-4" : "size-5")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        
        <div className="mt-auto flex flex-col gap-1 p-2">
          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-lg",
                    isCollapsed ? "h-8 w-8" : "h-10 w-10"
                  )}
                  onClick={onToggleCollapse}
                >
                  {isCollapsed ? (
                    <ChevronRight className={cn("size-4")} />
                  ) : (
                    <ChevronLeft className={cn("size-4")} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <SettingsDialog isCollapsed={isCollapsed} />
        </div>
      </div>
    </TooltipProvider>
  )
}

// Settings Dialog Component
interface SettingsDialogProps {
  isCollapsed: boolean
}

function SettingsDialog({ isCollapsed }: SettingsDialogProps) {
  const { user } = useCurrentUser()
  const [activeSection, setActiveSection] = React.useState('profile')
  const [open, setOpen] = React.useState(false)

  const navigationItems = [
    // YOUR ACCOUNT
    { id: 'profile', icon: User, label: 'Profile', category: 'YOUR ACCOUNT' },
    { id: 'security', icon: Shield, label: 'Security', category: 'YOUR ACCOUNT' },
    { id: 'notifications', icon: Bell, label: 'Notifications', category: 'YOUR ACCOUNT' },
    // WORKSPACE
    { id: 'general', icon: Settings, label: 'General', category: 'WORKSPACE' },
    { id: 'members', icon: Users, label: 'Members', category: 'WORKSPACE' },
    { id: 'billing', icon: CreditCard, label: 'Billing', category: 'WORKSPACE' },
    { id: 'usage', icon: BarChart3, label: 'Usage', category: 'WORKSPACE' },
    // APP SETTINGS
    { id: 'appearance', icon: Palette, label: 'Appearance', category: 'APP SETTINGS' },
    { id: 'accessibility', icon: Smartphone, label: 'Accessibility', category: 'APP SETTINGS' },
    { id: 'language', icon: Languages, label: 'Language', category: 'APP SETTINGS' },
    { id: 'integrations', icon: Plug, label: 'Integrations', category: 'APP SETTINGS' },
  ]

  const categories = Array.from(new Set(navigationItems.map(item => item.category)))

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection user={user} />
      case 'security':
        return <SecuritySection />
      case 'notifications':
        return <NotificationsSection />
      case 'general':
        return <GeneralSection />
      case 'members':
        return <MembersSection />
      case 'billing':
        return <BillingSection />
      case 'usage':
        return <UsageSection />
      case 'appearance':
        return <AppearanceSection />
      case 'accessibility':
        return <AccessibilitySection />
      case 'language':
        return <LanguageSection />
      case 'integrations':
        return <IntegrationsSection />
      default:
        return <ProfileSection user={user} />
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-lg",
                isCollapsed ? "h-8 w-8" : "h-10 w-10"
              )}
            >
              <Avatar className={cn(isCollapsed ? "h-6 w-6" : "h-8 w-8")}>
                <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
                <AvatarFallback className="text-xs">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Settings & Profile</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex h-full">
          {/* Left Navigation Sidebar */}
          <div className="w-56 border-r border-border bg-muted/30 p-4 overflow-y-auto">
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {navigationItems
                      .filter(item => item.category === category)
                      .map((item) => {
                        const Icon = item.icon
                        return (
                          <Button
                            key={item.id}
                            variant={activeSection === item.id ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "w-full justify-start",
                              activeSection === item.id && "bg-secondary"
                            )}
                            onClick={() => setActiveSection(item.id)}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </Button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="p-8 max-w-4xl">
              {renderContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Profile Section Component
function ProfileSection({ user }: { user: any }) {
  const [fullName, setFullName] = React.useState(user?.fullName || '')
  const [bio, setBio] = React.useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="text-muted-foreground">Manage your profile information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Upload a profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.avatarUrl} alt={user?.fullName} />
              <AvatarFallback className="text-lg">
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline">Change Avatar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Security Section Component
function SecuritySection() {
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false)

  const activeSessions = [
    { id: 1, device: 'Chrome on macOS', location: 'San Francisco, CA', lastLogin: '2 hours ago' },
    { id: 2, device: 'Mobile App', location: 'New York, NY', lastLogin: '1 day ago' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Security</h2>
        <p className="text-muted-foreground">Manage your account security</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password
          </CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable 2FA</p>
              <p className="text-sm text-muted-foreground">
                Require a code from your authenticator app
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Manage your active login sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{session.device}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.location} • {session.lastLogin}
                  </p>
                </div>
                <Button variant="outline" size="sm">Log out</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Notifications Section Component
function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [desktopNotifications, setDesktopNotifications] = React.useState(true)
  const [mobileNotifications, setMobileNotifications] = React.useState(false)

  const notificationTypes = [
    { id: 'mentions', label: 'When you are mentioned' },
    { id: 'comments', label: 'New comments on your posts' },
    { id: 'tasks', label: 'Task assigned to you' },
    { id: 'invites', label: 'Workspace invitations' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-muted-foreground">Manage your notification preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Channels
          </CardTitle>
          <CardDescription>Choose how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Desktop Push</p>
              <p className="text-sm text-muted-foreground">Receive desktop notifications</p>
            </div>
            <Switch
              checked={desktopNotifications}
              onCheckedChange={setDesktopNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mobile Push</p>
              <p className="text-sm text-muted-foreground">Receive mobile notifications</p>
            </div>
            <Switch
              checked={mobileNotifications}
              onCheckedChange={setMobileNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Activity
          </CardTitle>
          <CardDescription>Choose what activities trigger notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationTypes.map((type) => (
            <div key={type.id} className="flex items-center space-x-2">
              <Checkbox id={type.id} defaultChecked />
              <Label htmlFor={type.id}>{type.label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// General Section Component
function GeneralSection() {
  const [workspaceName, setWorkspaceName] = React.useState('My Workspace')
  const [workspaceUrl, setWorkspaceUrl] = React.useState('my-workspace')
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">General</h2>
        <p className="text-muted-foreground">Manage your workspace settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
          <CardDescription>Update your workspace details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workspaceName">Workspace Name</Label>
            <Input
              id="workspaceName"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="workspaceUrl">Workspace URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">yourever.app/</span>
              <Input
                id="workspaceUrl"
                value={workspaceUrl}
                onChange={(e) => setWorkspaceUrl(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="workspaceLogo">Workspace Logo</Label>
            <div className="flex items-center gap-4 mt-2">
              <div className="h-12 w-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <Button variant="outline">Upload Logo</Button>
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Workspace</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your workspace
                  and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="deleteConfirmation">
                  Type <strong>{workspaceName}</strong> to confirm
                </Label>
                <Input
                  id="deleteConfirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={workspaceName}
                  className="mt-2"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirmation !== workspaceName}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Workspace
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

// Members Section Component
function MembersSection() {
  const members = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Owner', avatar: '' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Admin', avatar: '' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Member', avatar: '' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Members</h2>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback>
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Billing Section Component
function BillingSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground">Manage your subscription and payment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">Free Plan</p>
              <p className="text-muted-foreground">Up to 10 team members</p>
            </div>
            <Button>Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No payment methods on file</p>
          <Button variant="outline" className="mt-2">Add Payment Method</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No billing history available</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Usage Section Component
function UsageSection() {
  const usageStats = [
    { name: 'Team Members', used: 3, total: 10, unit: 'members' },
    { name: 'Storage', used: 2.1, total: 5, unit: 'GB' },
    { name: 'API Calls', used: 1500, total: 10000, unit: 'calls' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usage</h2>
        <p className="text-muted-foreground">Monitor your resource usage</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usageStats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{stat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{stat.used} {stat.unit}</span>
                  <span className="text-muted-foreground">/ {stat.total} {stat.unit}</span>
                </div>
                <Progress value={(stat.used / stat.total) * 100} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Appearance Section Component
function AppearanceSection() {
  const [theme, setTheme] = React.useState('dark')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Appearance</h2>
        <p className="text-muted-foreground">Customize your workspace appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )
}

// Accessibility Section Component
function AccessibilitySection() {
  const [reduceMotion, setReduceMotion] = React.useState(false)
  const [fontSize, setFontSize] = React.useState('default')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Accessibility</h2>
        <p className="text-muted-foreground">Customize accessibility options</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motion</CardTitle>
          <CardDescription>Control animation and motion effects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reduce Motion</p>
              <p className="text-sm text-muted-foreground">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Font Size</CardTitle>
          <CardDescription>Adjust text size for better readability</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={fontSize} onValueChange={setFontSize}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="small" />
              <Label htmlFor="small">Small</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="default" />
              <Label htmlFor="default">Default</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="large" />
              <Label htmlFor="large">Large</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )
}

// Language Section Component
function LanguageSection() {
  const [language, setLanguage] = React.useState('en')

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: '日本語' },
    { value: 'zh', label: '中文' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Language</h2>
        <p className="text-muted-foreground">Select your preferred language</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interface Language</CardTitle>
          <CardDescription>Choose the language for the application interface</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}

// Integrations Section Component
function IntegrationsSection() {
  const integrations = [
    { name: 'GitHub', description: 'Connect your GitHub repositories', connected: false },
    { name: 'Slack', description: 'Sync with your Slack workspace', connected: true },
    { name: 'Google Drive', description: 'Access your Google Drive files', connected: false },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">Manage third-party connections</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{integration.name}</CardTitle>
                {integration.connected && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>
              <CardDescription className="text-sm">
                {integration.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={integration.connected ? "outline" : "default"}
                className="w-full"
              >
                {integration.connected ? 'Configure' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { ActivityBar }