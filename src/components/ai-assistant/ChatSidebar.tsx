import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/hooks/useAIChat';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  usage: { used: number; limit: number };
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeConversation,
  usage,
  onNewChat,
  onSelectConversation,
  onDeleteConversation
}: ChatSidebarProps) {
  const { language } = useLanguage();

  return (
    <div className="w-64 h-full bg-white/80 backdrop-blur-xl border-r border-blue-100/50 flex flex-col">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-3",
            "bg-gradient-to-r from-blue-500 to-blue-600",
            "text-white font-medium",
            "rounded-xl",
            "shadow-md shadow-blue-500/20",
            "hover:shadow-lg hover:shadow-blue-500/30",
            "hover:scale-[1.02]",
            "active:scale-[0.98]",
            "transition-all duration-200"
          )}
        >
          <Plus className="w-5 h-5" />
          {language === 'el' ? 'Νέα Συνομιλία' : 'New Chat'}
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-2">
          {language === 'el' ? 'Ιστορικό' : 'History'}
        </div>
        
        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2.5",
                "rounded-lg cursor-pointer",
                "transition-all duration-150",
                activeConversation === conv.id
                  ? "bg-blue-50 text-blue-900"
                  : "hover:bg-gray-50 text-gray-700"
              )}
              onClick={() => onSelectConversation(conv.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conv.title}</p>
                <p className="text-xs text-gray-400">
                  {format(conv.updatedAt, 'dd/MM/yyyy')}
                </p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv.id);
                }}
                className={cn(
                  "absolute right-2 opacity-0 group-hover:opacity-100",
                  "p-1.5 rounded-md",
                  "hover:bg-red-50 text-gray-400 hover:text-red-500",
                  "transition-all duration-150"
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-4 text-center">
              {language === 'el' ? 'Δεν υπάρχουν συνομιλίες' : 'No conversations yet'}
            </p>
          )}
        </div>
      </div>

      {/* Usage Meter */}
      <div className="p-4 border-t border-blue-100/50">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{language === 'el' ? 'Σημερινή χρήση' : 'Today\'s usage'}</span>
          <span className="font-medium">{usage.used} / {usage.limit}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${(usage.used / usage.limit) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
