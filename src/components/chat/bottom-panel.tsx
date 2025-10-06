'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share,
  Users,
  Settings,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  MessageSquare,
  ScreenShare,
  Monitor,
  Music,
  Headphones
} from 'lucide-react'

// Types
interface Participant {
  id: string
  name: string
  avatar?: string
  isSpeaking: boolean
  isMuted: boolean
  isVideoOn: boolean
  status: 'online' | 'away' | 'offline'
}

interface HuddleSession {
  id: string
  title: string
  participants: Participant[]
  startTime: string
  isScreenSharing: boolean
  isRecording: boolean
}

// Mock data
const mockParticipants: Participant[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    avatar: '/avatars/sarah.jpg',
    isSpeaking: true,
    isMuted: false,
    isVideoOn: true,
    status: 'online'
  },
  {
    id: '2',
    name: 'Mike Johnson',
    avatar: '/avatars/mike.jpg',
    isSpeaking: false,
    isMuted: true,
    isVideoOn: false,
    status: 'online'
  },
  {
    id: '3',
    name: 'Emily Davis',
    avatar: '/avatars/emily.jpg',
    isSpeaking: false,
    isMuted: false,
    isVideoOn: true,
    status: 'away'
  },
  {
    id: '4',
    name: 'Alex Rivera',
    avatar: '/avatars/alex.jpg',
    isSpeaking: false,
    isMuted: false,
    isVideoOn: false,
    status: 'online'
  }
]

const mockHuddleSession: HuddleSession = {
  id: 'huddle-1',
  title: 'Design Team Huddle',
  participants: mockParticipants,
  startTime: '2:45 PM',
  isScreenSharing: false,
  isRecording: false
}

interface BottomPanelProps {
  isOpen: boolean
  onClose: () => void
  session?: HuddleSession
}

export default function BottomPanel({ isOpen, onClose, session = mockHuddleSession }: BottomPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [volume, setVolume] = useState(75)
  const [showParticipants, setShowParticipants] = useState(false)

  // Calculate duration
  const getDuration = () => {
    const start = new Date()
    start.setHours(14, 45, 0) // 2:45 PM
    const now = new Date()
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000 / 60)
    
    if (diff < 60) return `${diff}m`
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    return `${hours}h ${minutes}m`
  }

  // Get status indicator color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-border shadow-lg">
      {/* Main Panel */}
      {!isMinimized ? (
        <div className="h-64 flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-medium">{session.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {session.participants.length} participants
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getDuration()}
                </Badge>
                {session.isScreenSharing && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Monitor className="h-3 w-3" />
                    Sharing
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowParticipants(!showParticipants)}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onClose}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex">
              {/* Video Area / Participants Grid */}
              <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-2 h-full">
                  {session.participants.slice(0, 4).map(participant => (
                    <Card key={participant.id} className="relative bg-surface">
                      <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                        {participant.isVideoOn ? (
                          <div className="relative w-full h-full bg-muted rounded flex items-center justify-center">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback>{participant.name[0]}</AvatarFallback>
                            </Avatar>
                            {participant.isSpeaking && (
                              <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback>{participant.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">{participant.name}</span>
                              {participant.isMuted && <MicOff className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Participants Sidebar */}
              {showParticipants && (
                <div className="w-64 border-l border-border p-4">
                  <h3 className="font-medium mb-3">Participants</h3>
                  <div className="space-y-2">
                    {session.participants.map(participant => (
                      <div key={participant.id} className="flex items-center gap-3 p-2 rounded hover:bg-surface">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="text-xs">{participant.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${getStatusColor(participant.status)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{participant.name}</span>
                            {participant.isSpeaking && (
                              <Volume2 className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {participant.isMuted ? (
                              <><MicOff className="h-3 w-3" /> Muted</>
                            ) : (
                              <><Mic className="h-3 w-3" /> Speaking</>
                            )}
                            {participant.isVideoOn ? (
                              <><Video className="h-3 w-3" /> Video on</>
                            ) : (
                              <><VideoOff className="h-3 w-3" /> Video off</>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="border-t border-border p-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant={isVideoOn ? "secondary" : "destructive"}
                  size="icon"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                >
                  {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="icon"
                  onClick={() => setIsScreenSharing(!isScreenSharing)}
                >
                  <ScreenShare className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-2 px-3">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground w-8">{volume}%</span>
                </div>
                
                <Button variant="secondary" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                
                <Button variant="secondary" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                
                <Button variant="destruct" size="icon" onClick={onClose}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Minimized Bar */
        <div className="h-12 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-medium text-sm">{session.title}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {session.participants.length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {getDuration()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </Button>
            
            <Button
              variant={isVideoOn ? "secondary" : "destructive"}
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <PhoneOff className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}