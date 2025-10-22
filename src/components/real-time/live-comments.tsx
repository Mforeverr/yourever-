/**
 * Live Comments Component with Real-time Threading and @Mentions
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Real-time comment system with threading, mentions, reactions,
 * and live typing indicators for collaborative task discussions.
 */

"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "@/hooks/use-toast"
import { useScope } from "@/contexts/scope-context"
import type { KanbanComment, KanbanUser, Mention } from "@/types/kanban"
import {
  parseMentions,
  formatMentions,
  findMentionableUsers,
  type UserPresence,
  type NotificationPreferences
} from "@/lib/collaboration-utils"
import {
  MessageSquare,
  Reply,
  Send,
  AtSign,
  Smile,
  MoreHorizontal,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  AlertCircle,
  Edit3,
  Trash2,
  Pin,
  Clock,
  User
} from "lucide-react"

interface CommentReaction {
  id: string
  userId: string
  userName: string
  emoji: string
  createdAt: string
}

interface LiveComment extends KanbanComment {
  reactions: CommentReaction[]
  isPinned: boolean
  isEdited: boolean
  editedAt?: string
  thread?: Array<LiveComment>
  parentCommentId?: string
}

interface TypingUser {
  userId: string
  userName: string
  userAvatar?: string
  timestamp: string
}

interface LiveCommentsProps {
  taskId: string
  taskTitle?: string
  comments: LiveComment[]
  currentUser: KanbanUser
  boardUsers: KanbanUser[]
  onAddComment: (content: string, parentCommentId?: string) => Promise<void>
  onEditComment: (commentId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onAddReaction: (commentId: string, emoji: string) => Promise<void>
  onRemoveReaction: (commentId: string, reactionId: string) => Promise<void>
  onPinComment: (commentId: string) => Promise<void>
  typingUsers?: TypingUser[]
  presence?: Record<string, UserPresence>
  className?: string
}

const REACTION_EMOJIS = ["❤️", "👍", "👎", "😄", "😮", "😢", "🔥", "🎉"]

export function LiveComments({
  taskId,
  taskTitle,
  comments,
  currentUser,
  boardUsers,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onAddReaction,
  onRemoveReaction,
  onPinComment,
  typingUsers = [],
  presence = {},
  className
}: LiveCommentsProps) {
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [mentionIndex, setMentionIndex] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const { currentOrgId, currentDivisionId } = useScope()

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  // Focus textarea when starting to reply
  useEffect(() => {
    if (replyingTo && replyTextareaRef.current) {
      replyTextareaRef.current.focus()
    }
  }, [replyingTo])

  // Focus textarea when editing
  useEffect(() => {
    if (editingComment && editTextareaRef.current) {
      editTextareaRef.current.focus()
      editTextareaRef.current.select()
    }
  }, [editingComment])

  const handleMentionInput = useCallback((text: string, textareaRef: React.RefObject<HTMLTextAreaElement>) => {
    const cursorPos = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = text.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setShowMentions(true)

      // Filter users for mentions
      const mentionableUsers = findMentionableUsers(
        mentionMatch[1],
        boardUsers.filter(u => u.id !== currentUser.id),
        [currentUser.id]
      )

      if (mentionableUsers.length > 0) {
        setMentionIndex(0)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
      setMentionQuery("")
    }
  }, [boardUsers, currentUser.id])

  const handleCommentChange = useCallback((value: string) => {
    setNewComment(value)
    handleMentionInput(value, textareaRef)
  }, [handleMentionInput])

  const handleReplyChange = useCallback((value: string) => {
    setReplyContent(value)
    handleMentionInput(value, replyTextareaRef)
  }, [handleMentionInput])

  const handleEditChange = useCallback((value: string) => {
    setEditContent(value)
    handleMentionInput(value, editTextareaRef)
  }, [handleMentionInput])

  const insertMention = useCallback((user: KanbanUser, textareaRef: React.RefObject<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart || 0
    const text = textarea.value
    const textBeforeCursor = text.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index)
      const afterCursor = text.substring(cursorPos)
      const newText = `${beforeMention}@${user.name} ${afterCursor}`
      const newCursorPos = beforeMention.length + user.name.length + 2

      textarea.value = newText
      textarea.selectionStart = textarea.selectionEnd = newCursorPos
      textarea.focus()

      // Update the appropriate state
      if (textareaRef === textareaRef) {
        setNewComment(newText)
      } else if (textareaRef === replyTextareaRef) {
        setReplyContent(newText)
      } else if (textareaRef === editTextareaRef) {
        setEditContent(newText)
      }
    }

    setShowMentions(false)
    setMentionQuery("")
    setMentionIndex(0)
  }, [])

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return

    try {
      await onAddComment(newComment, replyingTo || undefined)
      setNewComment("")
      setReplyingTo(null)
      setReplyContent("")

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully."
      })
    } catch (error) {
      toast({
        title: "Failed to add comment",
        description: error.message || "An error occurred while adding your comment.",
        variant: "destructive"
      })
    }
  }

  const handleReplySubmit = async (parentCommentId: string) => {
    if (!replyContent.trim()) return

    try {
      await onAddComment(replyContent, parentCommentId)
      setReplyContent("")
      setReplyingTo(null)

      toast({
        title: "Reply added",
        description: "Your reply has been posted successfully."
      })
    } catch (error) {
      toast({
        title: "Failed to add reply",
        description: error.message || "An error occurred while adding your reply.",
        variant: "destructive"
      })
    }
  }

  const handleEditSubmit = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      await onEditComment(commentId, editContent)
      setEditingComment(null)
      setEditContent("")

      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully."
      })
    } catch (error) {
      toast({
        title: "Failed to update comment",
        description: error.message || "An error occurred while updating your comment.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await onDeleteComment(commentId)

      toast({
        title: "Comment deleted",
        description: "The comment has been deleted successfully."
      })
    } catch (error) {
      toast({
        title: "Failed to delete comment",
        description: error.message || "An error occurred while deleting the comment.",
        variant: "destructive"
      })
    }
  }

  const handleAddReaction = async (commentId: string, emoji: string) => {
    try {
      await onAddReaction(commentId, emoji)
      setShowEmojiPicker(null)
    } catch (error) {
      toast({
        title: "Failed to add reaction",
        description: error.message || "An error occurred while adding your reaction.",
        variant: "destructive"
      })
    }
  }

  const handlePinComment = async (commentId: string) => {
    try {
      await onPinComment(commentId)
    } catch (error) {
      toast({
        title: "Failed to pin comment",
        description: error.message || "An error occurred while pinning the comment.",
        variant: "destructive"
      })
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return "just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  const isUserOnline = (userId: string) => {
    const userPresence = presence[userId]
    return userPresence?.status === 'online'
  }

  const getTypingUsersForComment = (excludeUserId?: string) => {
    return typingUsers.filter(
      typing => typing.userId !== excludeUserId &&
      Date.now() - new Date(typing.timestamp).getTime() < 5000
    )
  }

  const mentionableUsers = showMentions
    ? findMentionableUsers(mentionQuery, boardUsers, [currentUser.id])
    : []

  const CommentCard = ({ comment, isReply = false }: { comment: LiveComment; isReply?: boolean }) => {
    const [showActions, setShowActions] = useState(false)
    const isAuthor = comment.author.id === currentUser.id
    const isPinned = comment.isPinned
    const isOnline = isUserOnline(comment.author.id)

    const groupedReactions = comment.reactions.reduce((acc, reaction) => {
      const existing = acc.find(r => r.emoji === reaction.emoji)
      if (existing) {
        existing.users.push(reaction)
        existing.count++
      } else {
        acc.push({
          emoji: reaction.emoji,
          count: 1,
          users: [reaction]
        })
      }
      return acc
    }, [] as Array<{ emoji: string; count: number; users: CommentReaction[] }>)

    const userReactions = comment.reactions.filter(r => r.userId === currentUser.id)

    return (
      <div
        className={`relative group ${isReply ? 'ml-8 border-l-2 border-border pl-4' : ''}`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {isPinned && !isReply && (
          <div className="absolute -top-2 left-0 z-10">
            <Badge variant="secondary" className="text-xs px-2 py-0">
              <Pin className="h-3 w-3 mr-1" />
              Pinned
            </Badge>
          </div>
        )}

        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
            <AvatarFallback className="text-xs">
              {comment.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.author.name}</span>
              {isOnline && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
              {!isReply && comment.author.email && (
                <span className="text-xs text-muted-foreground">
                  {comment.author.email}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(comment.createdAt)}
              </span>
              {comment.isEdited && comment.editedAt && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Edit3 className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edited {formatTimestamp(comment.editedAt)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {editingComment === comment.id ? (
              <div className="space-y-2 mb-2">
                <Textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={(e) => handleEditChange(e.target.value)}
                  placeholder="Edit your comment..."
                  className="min-h-20 resize-none"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleEditSubmit(comment.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingComment(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="text-sm whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            )}

            {/* Reactions */}
            {groupedReactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {groupedReactions.map(({ emoji, count, users }, index) => {
                  const hasReacted = userReactions.some(r => r.emoji === emoji)
                  return (
                    <TooltipProvider key={index}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={hasReacted ? "secondary" : "ghost"}
                            size="sm"
                            className={`h-6 px-2 text-xs ${hasReacted ? 'bg-primary/10' : ''}`}
                            onClick={() => hasReacted
                              ? users.find(r => r.userId === currentUser.id) &&
                                onRemoveReaction(comment.id, users.find(r => r.userId === currentUser.id)!.id)
                              : handleAddReaction(comment.id, emoji)
                            }
                          >
                            {emoji} {count}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            {users.map(u => u.userName).join(', ')}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            {(showActions || isReply) && (
              <div className="flex items-center gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Smile className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="grid grid-cols-4 gap-1">
                      {REACTION_EMOJIS.map(emoji => {
                        const hasReacted = userReactions.some(r => r.emoji === emoji)
                        return (
                          <Button
                            key={emoji}
                            variant={hasReacted ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => hasReacted
                              ? users.find(r => r.emoji === emoji && r.userId === currentUser.id) &&
                                onRemoveReaction(comment.id, users.find(r => r.emoji === emoji && r.userId === currentUser.id)!.id)
                              : handleAddReaction(comment.id, emoji)
                            }
                          >
                            {emoji}
                          </Button>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handlePinComment(comment.id)}
                    disabled={isPinned}
                  >
                    <Pin className="h-3 w-3" />
                  </Button>
                )}

                {isAuthor && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setEditingComment(comment.id)
                        setEditContent(comment.content)
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Typing indicators for replies */}
            {getTypingUsersForComment(comment.author.id).length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                {getTypingUsersForComment(comment.author.id).map(u => u.userName).join(', ')}
                {getTypingUsersForComment(comment.author.id).length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            {/* Thread replies */}
            {comment.thread && comment.thread.length > 0 && (
              <div className="mt-3 space-y-3">
                {comment.thread.map(reply => (
                  <CommentCard key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <Badge variant="secondary">{comments.length}</Badge>
          )}
        </CardTitle>
        {taskTitle && (
          <p className="text-sm text-muted-foreground">Discussion for: {taskTitle}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comments list */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground">Start the discussion with a comment</p>
            </div>
          ) : (
            <>
              {comments.map(comment => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
              <div ref={commentsEndRef} />
            </>
          )}
        </div>

        {/* Global typing indicator */}
        {getTypingUsersForComment().length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted rounded">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            {getTypingUsersForComment().map(u => u.userName).join(', ')}
            {getTypingUsersForComment().length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* New comment form */}
        <div className="space-y-2">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="text-xs">
                {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={replyingTo ? replyContent : newComment}
                onChange={(e) => replyingTo ? handleReplyChange(e.target.value) : handleCommentChange(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                className="min-h-20 resize-none pr-20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    replyingTo ? handleReplySubmit(replyingTo) : handleCommentSubmit()
                  }
                }}
              />

              {/* Mentions popup */}
              {showMentions && mentionableUsers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-md shadow-lg z-50">
                  <div className="p-1">
                    {mentionableUsers.map((user, index) => (
                      <button
                        key={user.id}
                        className={`w-full flex items-center gap-2 p-2 rounded-sm hover:bg-accent ${
                          index === mentionIndex ? 'bg-accent' : ''
                        }`}
                        onClick={() => {
                          insertMention(user, replyingTo ? replyTextareaRef : textareaRef)
                        }}
                        onMouseEnter={() => setMentionIndex(index)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-[8px]">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        {isUserOnline(user.id) && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    const cursorPos = textareaRef.current?.selectionStart || 0
                    const text = replyingTo ? replyContent : newComment
                    const newText = text.substring(0, cursorPos) + '@' + text.substring(cursorPos)
                    replyingTo ? setReplyContent(newText) : setNewComment(newText)
                    setTimeout(() => {
                      textareaRef.current?.focus()
                      textareaRef.current?.setSelectionRange(cursorPos + 1, cursorPos + 1)
                    }, 0)
                  }}
                >
                  <AtSign className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  className="h-6 px-2"
                  onClick={replyingTo ? () => handleReplySubmit(replyingTo) : handleCommentSubmit}
                  disabled={!replyingTo ? !newComment.trim() : !replyContent.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {replyingTo && (
            <div className="ml-11 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Replying to {comments.find(c => c.id === replyingTo)?.author.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 px-1 text-xs"
                onClick={() => {
                  setReplyingTo(null)
                  setReplyContent("")
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}