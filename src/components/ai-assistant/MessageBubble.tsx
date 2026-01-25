import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import type { Message } from '@/hooks/useAIChat';
import { useAuth } from '@/contexts/AuthContext';
import aiAvatar from '@/assets/ai-avatar.webp';
import ReactMarkdown from 'react-markdown';

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
          "text-sm leading-relaxed",
          isUser ? "text-white" : "text-gray-800"
        )}>
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-100 text-gray-800 p-2 rounded-lg overflow-x-auto text-xs mb-2">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
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
