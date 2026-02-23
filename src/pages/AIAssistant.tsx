import { AppShell } from '@/components/layout/AppShell';
import { AIAssistantLayout } from '@/components/ai-assistant/AIAssistantLayout';

export default function AIAssistant() {
  return (
    <AppShell>
      <div className="h-[calc(100vh-4rem)]">
        <AIAssistantLayout />
      </div>
    </AppShell>
  );
}
