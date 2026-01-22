import { EmptyStateView } from './EmptyStateView';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { Message } from '@/hooks/useAIChat';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string, presetType?: string) => void;
}

export function ChatArea({ messages, isLoading, error, onSendMessage }: ChatAreaProps) {
  const isEmpty = messages.length === 0;

  const handlePresetSelect = (presetType: string, displayMessage: string) => {
    // When preset is clicked, send the display message but include presetType
    onSendMessage(displayMessage, presetType);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-slate-50 to-white">
      {isEmpty ? (
        // INTRO STATE: Everything centered, input embedded in EmptyStateView
        <EmptyStateView 
          onPresetSelect={handlePresetSelect}
          onSendMessage={(msg) => onSendMessage(msg)}
          disabled={isLoading}
        />
      ) : (
        // ACTIVE CHAT STATE: Normal layout with input at bottom
        <>
          <MessageList messages={messages} isLoading={isLoading} />
          
          {error && (
            <div className="px-4 py-2">
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            </div>
          )}
          
          <ChatInput 
            onSend={(msg) => onSendMessage(msg)}
            disabled={isLoading}
          />
        </>
      )}
    </div>
  );
}
