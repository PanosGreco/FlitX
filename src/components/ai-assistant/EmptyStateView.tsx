import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedBackground } from './AnimatedBackground';
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
        // Get first name only
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
        {/* Greeting */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
            <span className="inline-block animate-wave origin-bottom-right">👋</span>
            {' '}Hey{firstName ? ` ${firstName}` : ''},
          </h1>
          <p className="text-2xl sm:text-3xl text-gray-600 font-medium">
            How can I help you today?
          </p>
        </div>

        {/* Preset Action Buttons */}
        <PresetActionButtons 
          onSelect={onPresetSelect}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
