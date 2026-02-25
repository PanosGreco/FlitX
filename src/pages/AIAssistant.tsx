import { AppLayout } from '@/components/layout/AppLayout';
import { AIAssistantLayout } from '@/components/ai-assistant/AIAssistantLayout';

export default function AIAssistant() {
  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)]">
        <AIAssistantLayout />
      </div>
    </AppLayout>
  );
}
