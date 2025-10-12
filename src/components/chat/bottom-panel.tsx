'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  Settings,
  Minimize2,
  Maximize2,
  Volume2,
  MessageSquare,
  ScreenShare,
  Monitor,
} from "lucide-react"
import { useBottomPanel } from "@/hooks/use-bottom-panel"
import type { HuddleParticipantState, HuddleSessionState } from "@/state/ui.store"
import { format } from "date-fns"

const FALLBACK_PARTICIPANTS: HuddleParticipantState[] = [
  {
    id: "1",
    name: "Sarah Chen",
    avatar: "/avatars/sarah.jpg",
    isSpeaking: true,
    isMuted: false,
    isVideoOn: true,
    status: "online",
  },
  {
    id: "2",
    name: "Mike Johnson",
    avatar: "/avatars/mike.jpg",
    isSpeaking: false,
    isMuted: true,
    isVideoOn: false,
    status: "online",
  },
]

const FALLBACK_SESSION: HuddleSessionState = {
  id: "fallback-huddle",
  title: "Team Huddle",
  participants: FALLBACK_PARTICIPANTS,
  startTime: new Date().toISOString(),
  isScreenSharing: false,
  isRecording: false,
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "bg-green-500"
    case "away":
      return "bg-yellow-500"
    case "offline":
    default:
      return "bg-gray-400"
  }
}

export default function BottomPanel() {
  const {
    isOpen,
    isCollapsed,
    collapse,
    expand,
    close,
    session,
    height,
    setHeight,
  } = useBottomPanel()
  const activeSession = session ?? FALLBACK_SESSION

  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [volume, setVolume] = useState(75)
  const [showParticipants, setShowParticipants] = useState(false)
  const resizeState = useRef({ isDragging: false })

  useEffect(() => {
    if (!isOpen) {
      setShowParticipants(false)
      setIsScreenSharing(false)
    }
  }, [isOpen])

  useEffect(() => {
    setIsMuted(false)
    setIsVideoOn(true)
    setIsScreenSharing(Boolean(activeSession.isScreenSharing))
  }, [activeSession.id])

  const huddleDuration = useMemo(() => {
    const start = activeSession.startTime ? new Date(activeSession.startTime) : new Date(new Date().setHours(14, 45, 0, 0))
    const now = new Date()
    const diff = Math.max(0, now.getTime() - start.getTime())
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }, [activeSession.startTime])

  const handleDrag = useCallback(
    (event: PointerEvent) => {
      if (!resizeState.current.isDragging) return
      const viewportHeight = window.innerHeight || 1
      const nextHeight = ((viewportHeight - event.clientY) / viewportHeight) * 100
      const clampedHeight = Math.min(Math.max(nextHeight, 15), 60)
      setHeight(clampedHeight)
    },
    [setHeight]
  )

  const stopDragging = useCallback(() => {
    if (!resizeState.current.isDragging) return
    resizeState.current.isDragging = false
    window.removeEventListener("pointermove", handleDrag)
    window.removeEventListener("pointerup", stopDragging)
    window.removeEventListener("pointercancel", stopDragging)
  }, [handleDrag])

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Author: Eldrie (CTO Dev) - Date: 2025-10-11 - Role: Preserve draggable huddle surface height.
      event.preventDefault()
      if (resizeState.current.isDragging) return
      resizeState.current.isDragging = true
      window.addEventListener("pointermove", handleDrag)
      window.addEventListener("pointerup", stopDragging)
      window.addEventListener("pointercancel", stopDragging)
    },
    [handleDrag, stopDragging]
  )

  useEffect(() => {
    return () => {
      stopDragging()
    }
  }, [stopDragging])

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-border shadow-lg">
      {!isCollapsed ? (
        <div className="flex flex-col" style={{ height: `${height}vh` }}>
          <div
            role="separator"
            aria-label="Resize huddle panel"
            className="h-2 cursor-row-resize bg-gradient-to-b from-border/70 to-transparent"
            onPointerDown={handleResizeStart}
          />
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-medium">{activeSession.title}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {activeSession.participants.length} participants
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {huddleDuration}
                </Badge>
                {activeSession.metadata?.scheduledFor && (
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(activeSession.metadata.scheduledFor), "PPpp")}
                  </Badge>
                )}
                {activeSession.metadata?.agenda && (
                  <Badge variant="outline" className="text-xs">
                    Agenda: {activeSession.metadata.agenda}
                  </Badge>
                )}
                {activeSession.isScreenSharing && (
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
                  onClick={() => setShowParticipants((prev) => !prev)}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={collapse}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={close}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-2 h-full">
                  {activeSession.participants.slice(0, 4).map((participant) => (
                    <Card key={participant.id} className="relative bg-surface">
                      <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                        <div className="relative w-full h-full bg-muted rounded flex items-center justify-center">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={participant.avatar} alt={participant.name} />
                            <AvatarFallback>{participant.name[0]}</AvatarFallback>
                          </Avatar>
                          {participant.isSpeaking && (
                            <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs font-medium">{participant.name}</span>
                          {participant.isMuted && <MicOff className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {showParticipants && (
                <div className="w-64 border-l border-border p-4">
                  <h3 className="font-medium mb-3">Participants</h3>
                  <div className="space-y-2">
                    {activeSession.participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3 p-2 rounded hover:bg-surface">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.avatar} alt={participant.name} />
                            <AvatarFallback className="text-xs">{participant.name[0]}</AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-background ${getStatusColor(
                              participant.status
                            )}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{participant.name}</span>
                            {participant.isSpeaking && <Volume2 className="h-3 w-3 text-green-500" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {participant.isMuted ? (
                              <>
                                <MicOff className="h-3 w-3" /> Muted
                              </>
                            ) : (
                              <>
                                <Mic className="h-3 w-3" /> Speaking
                              </>
                            )}
                            {participant.isVideoOn ? (
                              <>
                                <Video className="h-3 w-3" /> Video on
                              </>
                            ) : (
                              <>
                                <VideoOff className="h-3 w-3" /> Video off
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="icon"
                  onClick={() => setIsMuted((prev) => !prev)}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                <Button
                  variant={isVideoOn ? "secondary" : "destructive"}
                  size="icon"
                  onClick={() => setIsVideoOn((prev) => !prev)}
                >
                  {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>

                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="icon"
                  onClick={() => setIsScreenSharing((prev) => !prev)}
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

                <Button variant="destructive" size="icon" onClick={close}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-12 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-medium text-sm">{activeSession.title}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {activeSession.participants.length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {huddleDuration}
            </Badge>
            {activeSession.metadata?.scheduledFor && (
              <Badge variant="outline" className="text-xs">
                {format(new Date(activeSession.metadata.scheduledFor), "PPp")}
              </Badge>
            )}
            {activeSession.metadata?.agenda && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {activeSession.metadata.agenda}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMuted((prev) => !prev)}
            >
              {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </Button>

            <Button
              variant={isVideoOn ? "secondary" : "destructive"}
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsVideoOn((prev) => !prev)}
            >
              {isVideoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
            </Button>

            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={expand}>
              <Maximize2 className="h-3 w-3" />
            </Button>

            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={close}>
              <PhoneOff className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
