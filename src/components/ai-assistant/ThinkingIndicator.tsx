import { Sparkles } from 'lucide-react';
import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';

export function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
        <Sparkles className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <TextShimmerWave 
          className="font-medium text-sm" 
          duration={1.2}
          spread={1.5}
          zDistance={8}
          scaleDistance={1.05}
        >
          FleetX AI is thinking
        </TextShimmerWave>
      </div>
    </div>
  );
}
