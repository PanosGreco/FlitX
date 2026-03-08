import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/hooks/useAIChat';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  usage: { used: number; limit: number; };
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
}

export function ChatSidebar({ conversations, activeConversation, usage, onNewChat, onSelectConversation, onDeleteConversation, onRenameConversation }: ChatSidebarProps) {
  const { t } = useTranslation('ai');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => { e.stopPropagation(); setEditingId(conv.id); setEditValue(conv.title); };
  const handleSaveEdit = (id: string, e: React.MouseEvent) => { e.stopPropagation(); if (editValue.trim()) onRenameConversation(id, editValue.trim()); setEditingId(null); setEditValue(''); };
  const handleCancelEdit = (e: React.MouseEvent) => { e.stopPropagation(); setEditingId(null); setEditValue(''); };
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') { e.preventDefault(); if (editValue.trim()) onRenameConversation(id, editValue.trim()); setEditingId(null); setEditValue(''); }
    else if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
  };

  return (
    <div className="w-64 h-full bg-white/80 backdrop-blur-xl border-r border-blue-100/50 flex flex-col">
      <div className="p-4">
        <button onClick={onNewChat} className={cn("w-full flex items-center gap-2 px-4 py-3", "bg-gradient-to-r from-blue-500 to-blue-600", "text-white font-medium", "rounded-xl", "shadow-md shadow-blue-500/20", "hover:shadow-lg hover:shadow-blue-500/30", "hover:scale-[1.02]", "active:scale-[0.98]", "transition-all duration-200")}>
          <Plus className="w-5 h-5" />
          {t('newChat')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-2">{t('history')}</div>
        <div className="space-y-1">
          {conversations.map(conv => (
            <div key={conv.id} className={cn("group relative flex items-start gap-2 px-3 py-2.5", "rounded-lg cursor-pointer", "transition-all duration-150", activeConversation === conv.id ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50 text-gray-700")} onClick={() => onSelectConversation(conv.id)}>
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                {editingId === conv.id ? (
                  <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => handleKeyDown(e, conv.id)} onClick={(e) => e.stopPropagation()} className="w-full text-sm font-medium bg-white border border-blue-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                ) : (
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                )}
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-400">{format(conv.updatedAt, 'dd/MM/yyyy')}</p>
                  {editingId === conv.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => handleSaveEdit(conv.id, e)} className="p-1 rounded-md hover:bg-green-50 text-green-500 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={handleCancelEdit} className="p-1 rounded-md hover:bg-red-50 text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleStartEdit(conv, e)} className="p-1 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {conversations.length === 0 && <p className="text-sm text-gray-400 px-3 py-4 text-center">{t('noConversations')}</p>}
        </div>
      </div>
      <div className="p-4 border-t border-blue-100/50 rounded-2xl">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{t('todayUsage')}</span>
          <span className="font-medium">{usage.used} / {usage.limit}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300" style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
