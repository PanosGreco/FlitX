import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedBackground } from './AnimatedBackground';
import { StaticLogo } from './StaticLogo';
import { PresetActionButtons } from './PresetActionButtons';
import { ChatInput } from './ChatInput';

interface EmptyStateViewProps {
  onPresetSelect: (presetType: string, displayMessage: string) => void;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function EmptyStateView({ onPresetSelect, onSendMessage, disabled }: EmptyStateViewProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      if (data?.name) {
        const first = data.name.split(' ')[0];
        setFirstName(first);
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-0">
      <AnimatedBackground />
      
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl mx-auto px-4 py-8">
        {/* 1. Static Logo (no animation) */}
        <div className="mb-6">
          <StaticLogo />
        </div>

        {/* 2. GREETING FIRST (Title) */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2 text-center">
          Hey{firstName ? ` ${firstName}` : ''}, ready to assist you
        </h1>

        {/* 3. INSTRUCTION SECOND (Subtitle) */}
        <p className="text-base text-gray-500 mb-8 text-center">
          Ask me anything or try one of the suggestions below
        </p>

        {/* 4. CENTERED INPUT BAR */}
        <div className="w-full max-w-xl mb-6">
          <ChatInput 
            onSend={onSendMessage}
            disabled={disabled}
          />
        </div>

        {/* 5. SUGGESTION CARDS BELOW INPUT */}
        <PresetActionButtons 
          onSelect={onPresetSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
