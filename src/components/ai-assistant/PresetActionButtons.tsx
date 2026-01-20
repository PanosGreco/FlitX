import { TrendingUp, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PresetButton {
  id: string;
  title: string;
  description: string;
  icon: typeof TrendingUp;
  presetType: 'marketing_growth' | 'expense_optimization';
}

const PRESET_BUTTONS: PresetButton[] = [
  {
    id: 'marketing',
    title: 'Marketing & Growth Suggestions',
    description: 'Get AI-powered marketing strategies and growth opportunities',
    icon: TrendingUp,
    presetType: 'marketing_growth'
  },
  {
    id: 'expenses',
    title: 'Expense Optimization & Cost Reduction',
    description: 'Analyze expenses and find cost-saving opportunities',
    icon: PiggyBank,
    presetType: 'expense_optimization'
  }
];

interface PresetActionButtonsProps {
  onSelect: (presetType: string, displayMessage: string) => void;
  disabled?: boolean;
}

export function PresetActionButtons({ onSelect, disabled }: PresetActionButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl px-4">
      {PRESET_BUTTONS.map((button) => {
        const Icon = button.icon;
        return (
          <button
            key={button.id}
            onClick={() => onSelect(button.presetType, button.title)}
            disabled={disabled}
            className={cn(
              "flex-1 group relative overflow-hidden rounded-2xl p-6",
              "bg-white/70 backdrop-blur-xl",
              "border border-blue-100/50",
              "shadow-lg shadow-blue-500/5",
              "hover:shadow-xl hover:shadow-blue-500/10",
              "hover:border-blue-200/80",
              "hover:bg-white/90",
              "transition-all duration-300 ease-out",
              "text-left",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/50 group-hover:to-blue-100/30 transition-all duration-300" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                {button.title}
              </h3>
              
              <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                {button.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
