import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import type { Message } from '@/hooks/useAIChat';
import { useAuth } from '@/contexts/AuthContext';
import aiAvatar from '@/assets/ai-avatar.webp';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const { profile } = useAuth();

  return (
    <div className={cn(
      "flex gap-3 w-full",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <img 
          src={aiAvatar} 
          alt="FlitX AI" 
          className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
        />
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20" 
          : "bg-white/80 backdrop-blur-sm text-gray-900 border border-blue-100/50 shadow-sm"
      )}>
        <div className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap",
          isUser ? "text-white" : "text-gray-800"
        )}>
          {message.content}
          {isStreaming && !message.content && (
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
      </div>

      {isUser && (
        profile?.avatar_url ? (
          <img 
            src={profile.avatar_url} 
            alt="User" 
            className="flex-shrink-0 w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        )
      )}
    </div>
  );
}
