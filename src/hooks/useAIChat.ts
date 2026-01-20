import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
}

interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  usage: { used: number; limit: number };
  conversations: Conversation[];
  activeConversation: string | null;
  sendMessage: (content: string, presetType?: string) => Promise<void>;
  createNewChat: () => void;
  switchConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const SAVE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-save`;

export function useAIChat(): UseAIChatReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 10 });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchUsage();
    }
  }, [user]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('ai_chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data.map(c => ({
        id: c.id,
        title: c.title,
        updatedAt: new Date(c.updated_at)
      })));
    }
  };

  const fetchUsage = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('ai_chat_usage')
      .select('message_count')
      .eq('date', today)
      .single();

    if (data) {
      setUsage({ used: data.message_count, limit: 10 });
    }
  };

  const createNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversation(null);
    setError(null);
  }, []);

  const switchConversation = useCallback(async (id: string) => {
    setActiveConversation(id);
    setError(null);

    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: new Date(m.created_at)
      })));
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('ai_chat_conversations')
      .delete()
      .eq('id', id);

    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversation === id) {
        createNewChat();
      }
      toast.success('Conversation deleted');
    }
  }, [activeConversation, createNewChat]);

  const sendMessage = useCallback(async (content: string, presetType?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Build messages for API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: apiMessages,
          conversationId: activeConversation,
          presetType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          if (errorData.error === 'Daily limit reached') {
            setError('You have reached your daily message limit. Try again tomorrow!');
            setUsage({ used: errorData.used || 10, limit: errorData.limit || 10 });
          } else {
            setError('Rate limit exceeded. Please wait a moment.');
          }
          setMessages(prev => prev.filter(m => m.id !== userMessage.id));
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          setError('Service temporarily unavailable.');
          setMessages(prev => prev.filter(m => m.id !== userMessage.id));
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date()
      }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => prev.map(m => 
                m.id === assistantId ? { ...m, content: assistantContent } : m
              ));
            }
          } catch {
            // Incomplete JSON, put back in buffer
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Save conversation
      await fetch(SAVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversationId: activeConversation,
          userMessage: content,
          assistantMessage: assistantContent,
          title: presetType === 'marketing_growth' 
            ? 'Marketing & Growth Suggestions' 
            : presetType === 'expense_optimization'
            ? 'Expense Optimization'
            : undefined
        })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          if (!activeConversation && data.conversationId) {
            setActiveConversation(data.conversationId);
            fetchConversations();
          }
        }
      });

      // Update usage
      setUsage(prev => ({ ...prev, used: prev.used + 1 }));

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [user, messages, activeConversation]);

  return {
    messages,
    isLoading,
    error,
    usage,
    conversations,
    activeConversation,
    sendMessage,
    createNewChat,
    switchConversation,
    deleteConversation
  };
}
