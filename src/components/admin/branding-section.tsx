'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Upload, 
  Palette, 
  Eye, 
  EyeOff,
  Download,
  RotateCcw,
  Check,
  X
} from 'lucide-react'

interface BrandingSettings {
  workspaceName: string
  logo: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  customCSS: string
  favicon: string | null
}

const defaultSettings: BrandingSettings = {
  workspaceName: 'My Workspace',
  logo: null,
  primaryColor: '#3b82f6',
  secondaryColor: '#64748b',
  accentColor: '#10b981',
  customCSS: '',
  favicon: null
}

const colorPresets = [
  { name: 'Blue', primary: '#3b82f6', secondary: '#64748b', accent: '#10b981' },
  { name: 'Purple', primary: '#8b5cf6', secondary: '#6b7280', accent: '#ec4899' },
  { name: 'Green', primary: '#10b981', secondary: '#6b7280', accent: '#f59e0b' },
  { name: 'Red', primary: '#ef4444', secondary: '#6b7280', accent: '#3b82f6' },
  { name: 'Orange', primary: '#f97316', secondary: '#6b7280', accent: '#06b6d4' },
]

export function BrandingSection() {
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploadingLogo(true)
      // Simulate upload
      setTimeout(() => {
        setSettings(prev => ({
          ...prev,
          logo: URL.createObjectURL(file)
        }))
        setIsUploadingLogo(false)
      }, 1500)
    }
  }

  const handleColorChange = (colorType: keyof BrandingSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [colorType]: value
    }))
  }

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setSettings(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent
    }))
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Workspace Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={settings.workspaceName}
                  onChange={(e) => setSettings(prev => ({ ...prev, workspaceName: e.target.value }))}
                  placeholder="Enter workspace name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-surface">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-contain rounded" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG or GIF. Max 2MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Color Presets */}
              <div>
                <Label>Color Presets</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:bg-surface transition-colors"
                    >
                      <div className="flex gap-1">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <span className="text-xs">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primary-color"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      placeholder="#64748b"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="accent-color"
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      placeholder="#10b981"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom CSS</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.customCSS}
                onChange={(e) => setSettings(prev => ({ ...prev, customCSS: e.target.value }))}
                placeholder="Enter custom CSS rules..."
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Preview</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                  {isPreviewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {isPreviewMode ? 'Exit Preview' : 'Enter Preview'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg p-4 space-y-4"
                style={{
                  backgroundColor: isPreviewMode ? settings.primaryColor + '10' : 'transparent',
                  borderColor: isPreviewMode ? settings.primaryColor : 'hsl(var(--border))'
                }}
              >
                {/* Header Preview */}
                <div className="flex items-center justify-between pb-4 border-b"
                  style={{ borderColor: isPreviewMode ? settings.secondaryColor : 'hsl(var(--border))' }}>
                  <div className="flex items-center gap-3">
                    {settings.logo && (
                      <img src={settings.logo} alt="Logo" className="w-8 h-8 object-contain" />
                    )}
                    <h3 
                      className="font-semibold"
                      style={{ color: isPreviewMode ? settings.primaryColor : 'inherit' }}
                    >
                      {settings.workspaceName}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: settings.secondaryColor }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: settings.accentColor }}
                    />
                  </div>
                </div>

                {/* Content Preview */}
                <div className="space-y-3">
                  <div className="p-3 rounded"
                    style={{ backgroundColor: isPreviewMode ? settings.secondaryColor + '20' : 'hsl(var(--muted))' }}>
                    <h4 className="font-medium mb-2">Sample Content</h4>
                    <p className="text-sm text-muted-foreground">
                      This is how your content will appear with the selected theme.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      Primary Action
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      style={{ borderColor: settings.secondaryColor, color: settings.secondaryColor }}
                    >
                      Secondary Action
                    </Button>
                    <Button 
                      size="sm"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      Accent Action
                    </Button>
                  </div>
                </div>

                {/* CSS Preview */}
                {settings.customCSS && (
                  <div className="mt-4 p-3 bg-surface rounded border">
                    <h4 className="font-medium mb-2">Custom CSS Applied:</h4>
                    <pre className="text-xs text-muted-foreground overflow-x-auto">
                      {settings.customCSS}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Apply Changes
              </Button>
              <Button variant="outline" className="w-full" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Theme
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}