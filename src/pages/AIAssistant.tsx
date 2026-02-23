import { MobileLayout } from '@/components/layout/MobileLayout';
import { AIAssistantLayout } from '@/components/ai-assistant/AIAssistantLayout';

export default function AIAssistant() {
  return (
    <MobileLayout>
      <div className="h-[calc(100vh-4rem)]">
        <AIAssistantLayout />
      </div>
    </MobileLayout>
  );
}
