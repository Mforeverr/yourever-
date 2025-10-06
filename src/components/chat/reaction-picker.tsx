'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Smile,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  AlertCircle,
  Plus
} from 'lucide-react'

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  onCustom?: () => void
  className?: string
}

// Common reactions with their emojis
const commonReactions = [
  { emoji: '👍', icon: ThumbsUp, label: 'Thumbs up' },
  { emoji: '👎', icon: ThumbsDown, label: 'Thumbs down' },
  { emoji: '❤️', icon: Heart, label: 'Heart' },
  { emoji: '😊', icon: Smile, label: 'Smile' },
  { emoji: '😂', icon: Laugh, label: 'Laugh' },
  { emoji: '🤔', icon: AlertCircle, label: 'Thinking' }
]

// More emojis for expanded view
const moreEmojis = [
  '🎉', '🔥', '💯', '🚀', '✨', '🙌', '💪', '🎯', '🌟', '💡',
  '👏', '🤝', '🙏', '💰', '🎈', '🎁', '🏆', '🌈', '☀️', '🌙',
  '⭐', '✅', '❌', '⚠️', '📌', '🔗', '📎', '📷', '🎵', '🎮'
]

export default function ReactionPicker({ onSelect, onCustom, className = "" }: ReactionPickerProps) {
  const [showMore, setShowMore] = useState(false)

  return (
    <div className={`bg-popover border border-border rounded-lg shadow-lg p-2 ${className}`}>
      {/* Common Reactions */}
      <div className="flex items-center gap-1 mb-2">
        {commonReactions.map(({ emoji, icon: Icon, label }) => (
          <Button
            key={emoji}
            variant="ghost"
            size="sm"
            className="h-8 w-8 text-lg hover:bg-surface"
            onClick={() => onSelect(emoji)}
            title={label}
          >
            {emoji}
          </Button>
        ))}
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8"
          onClick={() => setShowMore(!showMore)}
          title="More reactions"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* More Emojis */}
      {showMore && (
        <div className="grid grid-cols-10 gap-1 pt-2 border-t border-border">
          {moreEmojis.map(emoji => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              className="h-6 w-6 text-sm hover:bg-surface"
              onClick={() => {
                onSelect(emoji)
                setShowMore(false)
              }}
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {/* Custom Emoji Button */}
      {onCustom && (
        <div className="pt-2 border-t border-border mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-6 text-xs"
            onClick={onCustom}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add custom emoji
          </Button>
        </div>
      )}
    </div>
  )
}