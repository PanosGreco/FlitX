import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import type { Message } from '@/hooks/useAIChat';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show thinking indicator when loading and last message is from user (waiting for AI response)
  const showThinking = isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
        />
      ))}
      {showThinking && <ThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
