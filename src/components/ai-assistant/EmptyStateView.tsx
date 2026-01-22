import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedBackground } from './AnimatedBackground';
import { AnimatedLogo } from './AnimatedLogo';
import { PresetActionButtons } from './PresetActionButtons';

interface EmptyStateViewProps {
  onPresetSelect: (presetType: string, displayMessage: string) => void;
  disabled?: boolean;
}

export function EmptyStateView({ onPresetSelect, disabled }: EmptyStateViewProps) {
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
      
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-4 py-8">
        {/* Animated Logo */}
        <div className="mb-8">
          <AnimatedLogo />
        </div>

        {/* Instruction Text */}
        <p className="text-lg text-gray-500 mb-3 text-center">
          Ask me anything or try one of the suggestions below
        </p>

        {/* Personalized Greeting */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-10 text-center">
          Hey{firstName ? ` ${firstName}` : ''}, ready to assist you
        </h1>

        {/* Preset Action Buttons */}
        <PresetActionButtons 
          onSelect={onPresetSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
