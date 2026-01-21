import { TextShimmerWave } from '@/components/ui/text-shimmer-wave';
import aiAvatar from '@/assets/ai-avatar.webp';

export function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <img 
        src={aiAvatar} 
        alt="FlitX AI" 
        className="flex-shrink-0 w-10 h-10 rounded-full object-cover"
      />
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <TextShimmerWave 
          className="font-medium text-sm" 
          duration={1.2}
          spread={1.5}
          zDistance={8}
          scaleDistance={1.05}
        >
          FlitX AI is thinking
        </TextShimmerWave>
      </div>
    </div>
  );
}
