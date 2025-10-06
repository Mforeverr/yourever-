"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Paperclip, 
  Smile, 
  AtSign, 
  Hash, 
  Phone, 
  Video, 
  Info, 
  Pin,
  Search,
  MoreVertical,
  Users,
  Settings,
  Archive,
  Bell,
  BellOff
} from "lucide-react";
import { usePathname } from "next/navigation";

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'away' | 'offline';
  };
  timestamp: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
  attachments?: { name: string; size: string; type: string }[];
  isPinned?: boolean;
  thread?: {
    count: number;
    messages: Message[];
  };
}

interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  description?: string;
  members?: number;
  isPrivate?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
}

const mockMessages: Message[] = [
  {
    id: "1",
    content: "Hey team! How's the project coming along?",
    sender: {
      id: "1",
      name: "Sarah Chen",
      avatar: "/avatars/sarah.jpg",
      status: "online"
    },
    timestamp: "10:30 AM",
    reactions: [
      { emoji: "👍", count: 3, users: ["John", "Mike", "Lisa"] },
      { emoji: "❤️", count: 1, users: ["Emma"] }
    ],
    isPinned: true
  },
  {
    id: "2",
    content: "Making great progress! The new features are almost ready for testing. 🚀",
    sender: {
      id: "2",
      name: "Mike Johnson",
      avatar: "/avatars/mike.jpg",
      status: "online"
    },
    timestamp: "10:32 AM",
    reactions: [
      { emoji: "🎉", count: 2, users: ["Sarah", "Lisa"] }
    ],
    thread: {
      count: 2,
      messages: []
    }
  },
  {
    id: "3",
    content: "That's fantastic! I've updated the documentation to reflect the new changes.",
    sender: {
      id: "3",
      name: "Emma Wilson",
      avatar: "/avatars/emma.jpg",
      status: "away"
    },
    timestamp: "10:35 AM",
    attachments: [
      { name: "documentation.pdf", size: "2.4 MB", type: "PDF" }
    ]
  },
  {
    id: "4",
    content: "Perfect timing! I'll start reviewing the changes this afternoon.",
    sender: {
      id: "4",
      name: "John Davis",
      avatar: "/avatars/john.jpg",
      status: "offline"
    },
    timestamp: "10:38 AM"
  }
];

const mockChannels: Channel[] = [
  { id: "1", name: "general", type: "channel", description: "General team discussions", members: 12 },
  { id: "2", name: "development", type: "channel", description: "Development talk", members: 8 },
  { id: "3", name: "design", type: "channel", description: "Design discussions", members: 5, isPrivate: true },
  { id: "4", name: "random", type: "channel", description: "Random conversations", members: 12, isMuted: true }
];

export function ChatInterface() {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const channelId = pathname.startsWith('/c/') ? pathname.split('/')[2] : null;
  const dmUserId = pathname.startsWith('/dm/') ? pathname.split('/')[2] : null;
  
  const currentChannel = mockChannels.find(c => c.id === channelId);
  const isDM = !!dmUserId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: {
          id: "current-user",
          name: "You",
          status: "online"
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMsg]);
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return timestamp;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isDM ? (
                <Users className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Hash className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <h2 className="font-semibold">
                  {isDM ? `Direct Message` : (currentChannel?.name || 'general')}
                </h2>
                {currentChannel?.description && (
                  <p className="text-xs text-muted-foreground">{currentChannel.description}</p>
                )}
              </div>
            </div>
            {currentChannel?.isPrivate && (
              <Badge variant="secondary" className="text-xs">Private</Badge>
            )}
            {currentChannel?.members && (
              <Badge variant="outline" className="text-xs">
                {currentChannel.members} members
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="h-8 w-8 p-0"
            >
              <Search className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Phone className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Video className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Pin className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Info className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {currentChannel?.isMuted ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-9 h-8"
              />
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="group">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender.avatar} />
                  <AvatarFallback>
                    {message.sender.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{message.sender.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.isPinned && (
                      <Pin className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="text-sm">
                    <p className="break-words">{message.content}</p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                          <Card key={index} className="p-2 bg-surface">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{attachment.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({attachment.size})
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.reactions.map((reaction, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {reaction.emoji} {reaction.count}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    {/* Thread */}
                    {message.thread && message.thread.count > 0 && (
                      <div className="mt-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {message.thread.count} replies
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
              </div>
              <span>Someone is typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-border bg-surface p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-20 h-8"
            />
            
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <AtSign className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <Hash className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            className="h-8 px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}