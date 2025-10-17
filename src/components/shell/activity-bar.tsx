'use client'

import * as React from "react"
import {
  Folder,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Search,
  Home,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Bot,
  User,
  Lock,
  Bell,
  Palette,
  BarChart3,
  Shield,
  Smartphone,
  AlertTriangle,
  Mail,
  Database,
  Sun,
  Moon,
  Monitor,
  Languages
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
    // AI SETTINGS
    { id: 'ai-personalization', icon: Bot, label: 'Personalization', category: 'AI SETTINGS' },
    { id: 'ai-usage', icon: BarChart3, label: 'AI Usage', category: 'AI SETTINGS' },
    { id: 'data-control', icon: Database, label: 'Data Control', category: 'AI SETTINGS' },
    // APP SETTINGS
    { id: 'appearance', icon: Palette, label: 'Appearance', category: 'APP SETTINGS' },
    { id: 'accessibility', icon: Smartphone, label: 'Accessibility', category: 'APP SETTINGS' },
    { id: 'language', icon: Languages, label: 'Language', category: 'APP SETTINGS' },
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
      case 'ai-personalization':
        return <AIPersonalizationSection />
      case 'ai-usage':
        return <AIUsageSection />
      case 'data-control':
        return <DataControlSection />
      case 'appearance':
        return <AppearanceSection />
      case 'accessibility':
        return <AccessibilitySection />
      case 'language':
        return <LanguageSection />
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
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.fullName || ''} />
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

      <DialogContent className="max-w-[95vw] sm:max-w-none md:max-w-[85vw] lg:max-w-6xl h-[85vh] overflow-hidden p-0">
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
            <div className="p-8">
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
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.fullName || ''} />
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
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('')

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

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete My Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account,
                  profile data, and all associated content.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Label htmlFor="deleteConfirmation">
                  Type <strong>DELETE MY ACCOUNT</strong> to confirm
                </Label>
                <Input
                  id="deleteConfirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="mt-2"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirmation !== 'DELETE MY ACCOUNT'}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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


// AI Settings Components
function AIPersonalizationSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Personalization</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how the AI Assistant interacts with you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Personality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup defaultValue="casual" className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="formal" id="formal" />
              <Label htmlFor="formal" className="flex-1">
                <div className="font-medium">Formal</div>
                <div className="text-sm text-muted-foreground">
                  Professional and respectful communication
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="casual" id="casual" />
              <Label htmlFor="casual" className="flex-1">
                <div className="font-medium">Casual</div>
                <div className="text-sm text-muted-foreground">
                  Friendly and conversational tone
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="concise" id="concise" />
              <Label htmlFor="concise" className="flex-1">
                <div className="font-medium">Concise</div>
                <div className="text-sm text-muted-foreground">
                  Brief and to-the-point responses
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Instructions</CardTitle>
          <CardDescription>
            Provide specific instructions on how the AI should behave for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="E.g., 'Always respond in markdown', 'Assume I have a technical background', 'Explain concepts like I'm 5 years old'"
            rows={4}
            className="resize-none"
          />
          <div className="text-xs text-muted-foreground">
            Examples: Always respond in markdown • Assume I have a technical background •
            Explain concepts like I'm 5 years old • Focus on practical examples
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save AI Preferences</Button>
      </div>
    </div>
  )
}

function AIUsageSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Usage</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review your AI feature consumption.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>AI Queries</span>
              <span className="font-medium">1,250 / 5,000</span>
            </div>
            <Progress value={25} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tokens Used</span>
              <span className="font-medium">3.5M / 10M</span>
            </div>
            <Progress value={35} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Files Processed</span>
              <span className="font-medium">847 / 2,000</span>
            </div>
            <Progress value={42} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">1,250</div>
              <div className="text-sm text-muted-foreground">Total Queries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">98.2%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">2.3s</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline">Upgrade Plan</Button>
      </div>
    </div>
  )
}

function DataControlSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Data Control</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how your data is used and stored.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Model Training</CardTitle>
          <CardDescription>
            Control how your data is used to improve AI services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ai-training" className="text-sm font-medium">
                Allow my data to be used for AI model training
              </Label>
              <p className="text-xs text-muted-foreground">
                Help improve AI services by using your anonymized data for training
              </p>
            </div>
            <Switch id="ai-training" />
          </div>
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            <strong>Privacy Note:</strong> Your data is anonymized and aggregated before being used for training.
            You can disable this at any time.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Data</CardTitle>
          <CardDescription>
            Download a copy of your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export all your personal data including tasks, documents, and comments you created.
          </p>
          <Button variant="outline">Export My Data</Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600">Delete All My Content</h4>
            <p className="text-xs text-muted-foreground">
              Permanently delete all your content, including tasks, documents, and comments.
              This action cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete All My Content
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Content</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete all your content? This action cannot be undone
                  and will permanently remove all your tasks, documents, and comments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete Everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

export { ActivityBar }