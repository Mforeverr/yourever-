'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Globe, 
  Shield, 
  Key, 
  Users, 
  Check, 
  X, 
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  Settings,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react'

interface DomainSettings {
  customDomain: string
  isVerified: boolean
  sslEnabled: boolean
  dnsRecords: DNSRecord[]
}

interface SSOProvider {
  id: string
  name: string
  enabled: boolean
  configured: boolean
  icon: React.ReactNode
  config?: any
}

interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX'
  name: string
  value: string
  status: 'pending' | 'verified' | 'error'
}

const mockDNSRecords: DNSRecord[] = [
  {
    type: 'A',
    name: '@',
    value: '76.76.21.21',
    status: 'verified'
  },
  {
    type: 'CNAME',
    name: 'www',
    value: 'your-workspace.app.com',
    status: 'pending'
  },
  {
    type: 'TXT',
    name: '_dmarc',
    value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@your-workspace.com',
    status: 'pending'
  }
]

const mockSSOProviders: SSOProvider[] = [
  {
    id: 'google',
    name: 'Google Workspace',
    enabled: true,
    configured: true,
    icon: <div className="w-5 h-5 bg-blue-500 rounded" />,
    config: {
      clientId: 'google-client-id',
      domain: 'your-company.com'
    }
  },
  {
    id: 'microsoft',
    name: 'Microsoft Azure AD',
    enabled: false,
    configured: false,
    icon: <div className="w-5 h-5 bg-orange-500 rounded" />
  },
  {
    id: 'okta',
    name: 'Okta',
    enabled: false,
    configured: false,
    icon: <div className="w-5 h-5 bg-green-500 rounded" />
  },
  {
    id: 'saml',
    name: 'Custom SAML',
    enabled: false,
    configured: false,
    icon: <Shield className="w-5 h-5" />
  }
]

export function DomainAccessSection() {
  const [domainSettings, setDomainSettings] = useState<DomainSettings>({
    customDomain: 'workspace.yourcompany.com',
    isVerified: false,
    sslEnabled: true,
    dnsRecords: mockDNSRecords
  })

  const [ssoProviders, setSSOProviders] = useState<SSOProvider[]>(mockSSOProviders)
  const [activeTab, setActiveTab] = useState('domain')

  const handleVerifyDomain = () => {
    // Simulate domain verification
    setTimeout(() => {
      setDomainSettings(prev => ({ ...prev, isVerified: true }))
    }, 2000)
  }

  const handleToggleSSO = (providerId: string) => {
    setSSOProviders(prev => 
      prev.map(provider => 
        provider.id === providerId 
          ? { ...provider, enabled: !provider.enabled }
          : provider
      )
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Verified</Badge>
      case 'pending':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>
      case 'error':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="domain">Custom Domain</TabsTrigger>
          <TabsTrigger value="sso">SSO Providers</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="domain" className="space-y-6">
          {/* Domain Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom-domain">Custom Domain</Label>
                <Input
                  id="custom-domain"
                  value={domainSettings.customDomain}
                  onChange={(e) => setDomainSettings(prev => ({ ...prev, customDomain: e.target.value }))}
                  placeholder="workspace.yourcompany.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your custom domain to brand your workspace.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SSL Certificate</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable HTTPS for your custom domain
                  </p>
                </div>
                <Switch
                  checked={domainSettings.sslEnabled}
                  onCheckedChange={(checked) => 
                    setDomainSettings(prev => ({ ...prev, sslEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-surface rounded-lg">
                {domainSettings.isVerified ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    Domain Status: {domainSettings.isVerified ? 'Verified' : 'Not Verified'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {domainSettings.isVerified 
                      ? 'Your custom domain is properly configured and active.'
                      : 'Please configure your DNS records to verify domain ownership.'
                    }
                  </p>
                </div>
                {!domainSettings.isVerified && (
                  <Button onClick={handleVerifyDomain}>
                    Verify Domain
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DNS Records */}
          <Card>
            <CardHeader>
              <CardTitle>DNS Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {domainSettings.dnsRecords.map((record, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge variant="outline">{record.type}</Badge>
                    <div className="flex-1">
                      <div className="font-mono text-sm">{record.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{record.value}</div>
                    </div>
                    {getStatusBadge(record.status)}
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Add these DNS records to your domain provider to complete setup.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sso" className="space-y-6">
          {/* SSO Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Single Sign-On (SSO) Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ssoProviders.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {provider.icon}
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {provider.configured 
                            ? 'Configured and ready to use' 
                            : 'Not configured yet'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {provider.configured && (
                        <Badge variant="outline">
                          <Check className="h-3 w-3 mr-1" />
                          Configured
                        </Badge>
                      )}
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={() => handleToggleSSO(provider.id)}
                        disabled={!provider.configured}
                      />
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SSO Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>SSO Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default SSO Provider</Label>
                <select className="w-full mt-1 p-2 border rounded-md bg-background">
                  <option>None (Email/Password)</option>
                  {ssoProviders.filter(p => p.configured).map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-provision Users</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create user accounts on first SSO login
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require SSO for All Users</Label>
                  <p className="text-xs text-muted-foreground">
                    Disable email/password authentication
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">
                    Require 2FA for all admin users
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Timeout</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically log out inactive users
                  </p>
                </div>
                <select className="w-32 p-2 border rounded-md bg-background">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                  <option>8 hours</option>
                  <option>24 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>IP Whitelist</Label>
                  <p className="text-xs text-muted-foreground">
                    Restrict access to specific IP addresses
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>API Rate Limiting</Label>
                  <p className="text-xs text-muted-foreground">
                    Limit API requests per user
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Access Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Invite-Only Registration</Label>
                  <p className="text-xs text-muted-foreground">
                    Only admins can invite new users
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Domain Verification</Label>
                  <p className="text-xs text-muted-foreground">
                    Only allow company email domains
                  </p>
                </div>
                <Switch />
              </div>

              <div>
                <Label>Allowed Email Domains</Label>
                <Input 
                  placeholder="yourcompany.com, partner.com"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list of allowed domains
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}