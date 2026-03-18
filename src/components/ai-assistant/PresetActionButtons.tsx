import { TrendingUp, PiggyBank, BarChart3, BadgeDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface PresetButton {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: typeof TrendingUp;
  presetType: 'marketing_growth' | 'expense_optimization' | 'financial_analysis' | 'pricing_optimizer';
}

const PRESET_BUTTONS: PresetButton[] = [
  {
    id: 'marketing',
    titleKey: 'presets.marketingGrowth.title',
    descriptionKey: 'presets.marketingGrowth.description',
    icon: TrendingUp,
    presetType: 'marketing_growth'
  },
  {
    id: 'expenses',
    titleKey: 'presets.expenseOptimization.title',
    descriptionKey: 'presets.expenseOptimization.description',
    icon: PiggyBank,
    presetType: 'expense_optimization'
  },
  {
    id: 'financial_analysis',
    titleKey: 'presets.financialAnalysis.title',
    descriptionKey: 'presets.financialAnalysis.description',
    icon: BarChart3,
    presetType: 'financial_analysis'
  },
  {
    id: 'pricing_optimizer',
    titleKey: 'presets.pricingOptimizer.title',
    descriptionKey: 'presets.pricingOptimizer.description',
    icon: BadgeDollarSign,
    presetType: 'pricing_optimizer'
  }
];

interface PresetActionButtonsProps {
  onSelect: (presetType: string, displayMessage: string) => void;
  disabled?: boolean;
}

export function PresetActionButtons({ onSelect, disabled }: PresetActionButtonsProps) {
  const { t } = useTranslation('ai');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
      {PRESET_BUTTONS.map((button) => {
        const Icon = button.icon;
        const title = t(button.titleKey);
        return (
          <button
            key={button.id}
            onClick={() => onSelect(button.presetType, title)}
            disabled={disabled}
            className={cn(
              "group relative overflow-hidden rounded-2xl p-5",
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
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-snug">
                  {t(button.descriptionKey)}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
