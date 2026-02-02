import { PILLARS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TrendingUp, Target, DollarSign } from 'lucide-react';

const icons = {
  growth: TrendingUp,
  tam: Target,
  sales: DollarSign,
};

export default function PillarSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {Object.entries(PILLARS).map(([key, { label, color, description }]) => {
        const Icon = icons[key];
        const isSelected = value === key;
        
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            data-testid={`pillar-${key}-btn`}
            className={cn(
              "flex-1 p-3 rounded-lg border transition-all duration-200",
              isSelected
                ? color
                : "border-border bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{label}</span>
            </div>
            <p className="text-xs mt-1 opacity-70 hidden sm:block">{description}</p>
          </button>
        );
      })}
    </div>
  );
}
