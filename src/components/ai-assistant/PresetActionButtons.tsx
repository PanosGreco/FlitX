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
    title: 'Marketing and Growth Suggestions',
    description: 'Get AI-powered marketing strategies and growth opportunities',
    icon: TrendingUp,
    presetType: 'marketing_growth'
  },
  {
    id: 'expenses',
    title: 'Expense Optimization and Cost Reduction',
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
              "flex-1 group relative overflow-hidden rounded-2xl p-5",
              "bg-white/80 backdrop-blur-sm",
              "border border-gray-200/60",
              "shadow-sm",
              "hover:shadow-md hover:border-gray-300/80",
              "hover:bg-white",
              "transition-all duration-200 ease-out",
              "text-left",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-4">
              {/* Icon container */}
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:shadow-md group-hover:shadow-blue-500/25 transition-shadow duration-200">
                <Icon className="w-5 h-5 text-white" />
              </div>
              
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 leading-tight">
                  {button.title}
                </h3>
                <p className="text-sm text-gray-500 leading-snug">
                  {button.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
