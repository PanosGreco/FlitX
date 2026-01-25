import { useState } from 'react';
import { Menu } from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { useAIChat } from '@/hooks/useAIChat';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function AIAssistantLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const {
    messages,
    isLoading,
    error,
    usage,
    conversations,
    activeConversation,
    sendMessage,
    createNewChat,
    switchConversation,
    deleteConversation,
    renameConversation
  } = useAIChat();

  const handleSendMessage = (content: string, presetType?: string) => {
    sendMessage(content, presetType);
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Mobile menu button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isMobile ? "fixed inset-y-0 left-0 z-40" : "relative",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ChatSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          usage={usage}
          onNewChat={() => {
            createNewChat();
            if (isMobile) setSidebarOpen(false);
          }}
          onSelectConversation={(id) => {
            switchConversation(id);
            if (isMobile) setSidebarOpen(false);
          }}
          onDeleteConversation={deleteConversation}
          onRenameConversation={renameConversation}
        />
      </div>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
