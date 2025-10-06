"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Video,
  AlertTriangle,
  CheckCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Share
} from "lucide-react";

// Import forms
import { EventForm } from "@/components/forms/event-form";

// Types
interface Attendee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: Attendee[];
  location?: string;
  isVirtual: boolean;
  isRecurring: boolean;
  color: string;
  hasConflict: boolean;
  conflictEvents?: string[];
  organizer: {
    id: string;
    name: string;
    email: string;
  };
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

// Mock data
const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Weekly Team Standup",
    description: "Weekly sync to discuss project progress and blockers",
    startTime: new Date(2024, 10, 14, 10, 0),
    endTime: new Date(2024, 10, 14, 10, 30),
    attendees: [
      { id: "1", name: "Sarah Chen", email: "sarah@company.com", status: "accepted" },
      { id: "2", name: "Mike Johnson", email: "mike@company.com", status: "accepted" },
      { id: "3", name: "Emma Davis", email: "emma@company.com", status: "tentative" },
      { id: "4", name: "Alex Kim", email: "alex@company.com", status: "pending" }
    ],
    location: "Conference Room A",
    isVirtual: false,
    isRecurring: true,
    color: "bg-blue-500",
    hasConflict: false,
    organizer: { id: "1", name: "Sarah Chen", email: "sarah@company.com" }
  },
  {
    id: "2",
    title: "Design Review Meeting",
    description: "Review new landing page designs and provide feedback",
    startTime: new Date(2024, 10, 14, 14, 0),
    endTime: new Date(2024, 10, 14, 15, 30),
    attendees: [
      { id: "5", name: "Lisa Wang", email: "lisa@company.com", status: "accepted" },
      { id: "6", name: "Tom Wilson", email: "tom@company.com", status: "accepted" },
      { id: "1", name: "Sarah Chen", email: "sarah@company.com", status: "accepted" }
    ],
    location: "Virtual - Zoom",
    isVirtual: true,
    isRecurring: false,
    color: "bg-purple-500",
    hasConflict: true,
    conflictEvents: ["Client Presentation"],
    organizer: { id: "5", name: "Lisa Wang", email: "lisa@company.com" }
  },
  {
    id: "3",
    title: "Client Presentation",
    description: "Q4 results presentation to key stakeholders",
    startTime: new Date(2024, 10, 14, 15, 0),
    endTime: new Date(2024, 10, 14, 16, 0),
    attendees: [
      { id: "7", name: "John Smith", email: "john@client.com", status: "accepted" },
      { id: "8", name: "Jane Doe", email: "jane@client.com", status: "accepted" },
      { id: "1", name: "Sarah Chen", email: "sarah@company.com", status: "accepted" },
      { id: "2", name: "Mike Johnson", email: "mike@company.com", status: "accepted" }
    ],
    location: "Client Office",
    isVirtual: false,
    isRecurring: false,
    color: "bg-green-500",
    hasConflict: true,
    conflictEvents: ["Design Review Meeting"],
    organizer: { id: "1", name: "Sarah Chen", email: "sarah@company.com" }
  },
  {
    id: "4",
    title: "1:1 with Manager",
    description: "Monthly check-in and performance discussion",
    startTime: new Date(2024, 10, 15, 11, 0),
    endTime: new Date(2024, 10, 15, 12, 0),
    attendees: [
      { id: "9", name: "David Brown", email: "david@company.com", status: "accepted" },
      { id: "1", name: "Sarah Chen", email: "sarah@company.com", status: "accepted" }
    ],
    location: "Virtual - Teams",
    isVirtual: true,
    isRecurring: true,
    color: "bg-orange-500",
    hasConflict: false,
    organizer: { id: "9", name: "David Brown", email: "david@company.com" }
  },
  {
    id: "5",
    title: "Sprint Planning",
    description: "Plan next sprint tasks and allocate resources",
    startTime: new Date(2024, 10, 16, 9, 0),
    endTime: new Date(2024, 10, 16, 11, 0),
    attendees: [
      { id: "2", name: "Mike Johnson", email: "mike@company.com", status: "accepted" },
      { id: "3", name: "Emma Davis", email: "emma@company.com", status: "accepted" },
      { id: "4", name: "Alex Kim", email: "alex@company.com", status: "pending" },
      { id: "10", name: "Rachel Green", email: "rachel@company.com", status: "accepted" }
    ],
    location: "Dev Team Room",
    isVirtual: false,
    isRecurring: true,
    color: "bg-red-500",
    hasConflict: false,
    organizer: { id: "2", name: "Mike Johnson", email: "mike@company.com" }
  }
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 10, 14)); // November 2024
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper functions
  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayEvents = mockEvents.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      days.push({
        date: currentDate,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === today.toDateString(),
        events: dayEvents
      });
    }

    return days;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500';
      case 'declined': return 'bg-red-500';
      case 'tentative': return 'bg-yellow-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const filteredEvents = mockEvents.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const monthDays = getDaysInMonth(currentDate);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Calendar</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[150px] text-center font-medium">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events..."
                className="pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="rounded-r-none"
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="rounded-none border-l border-r border-border"
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="rounded-l-none"
              >
                Day
              </Button>
            </div>
            
            <EventForm>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
            </EventForm>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day}>{day}</div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 gap-px bg-border">
                {monthDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 bg-background ${
                      !day.isCurrentMonth ? 'opacity-50' : ''
                    } ${day.isToday ? 'bg-surface' : ''}`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.events.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${event.color} text-white`}
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className="truncate font-medium">
                            {formatTime(event.startTime)} {event.title}
                          </div>
                          {event.hasConflict && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs">Conflict</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.events.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Details Sidebar */}
        {selectedEvent && (
          <div className="w-80 border-l border-border bg-surface">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Event Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <h3 className="font-medium text-lg mb-2">{selectedEvent.title}</h3>
                  {selectedEvent.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.description}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <div>
                      {selectedEvent.startTime.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div>
                      {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                    </div>
                  </div>
                </div>

                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    {selectedEvent.isVirtual ? (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{selectedEvent.location}</span>
                  </div>
                )}

                {/* Conflict Warning */}
                {selectedEvent.hasConflict && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-800">
                        Scheduling Conflict
                      </div>
                      <div className="text-xs text-red-600">
                        Conflicts with: {selectedEvent.conflictEvents?.join(', ')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Organizer */}
                <div>
                  <div className="text-sm font-medium mb-2">Organizer</div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        {selectedEvent.organizer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{selectedEvent.organizer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedEvent.organizer.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendees */}
                <div>
                  <div className="text-sm font-medium mb-2">
                    Attendees ({selectedEvent.attendees.length})
                  </div>
                  <div className="space-y-2">
                    {selectedEvent.attendees.map(attendee => (
                      <div key={attendee.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(attendee.status)}`} />
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>
                              {attendee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{attendee.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {attendee.email}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {attendee.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}