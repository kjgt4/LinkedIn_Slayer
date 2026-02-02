import { FRAMEWORKS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { BookOpen, AlertTriangle } from 'lucide-react';

const icons = {
  slay: BookOpen,
  pas: AlertTriangle,
};

export default function FrameworkSelector({ value, onChange }) {
  return (
    <div className="flex gap-3">
      {Object.entries(FRAMEWORKS).map(([key, { label, color, sections }]) => {
        const Icon = icons[key];
        const isSelected = value === key;
        
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            data-testid={`framework-${key}-btn`}
            className={cn(
              "flex-1 p-4 rounded-lg border transition-all duration-200",
              isSelected
                ? color
                : "border-border bg-muted/50 hover:bg-muted text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-5 h-5" />
              <span className="font-heading text-lg font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-xs opacity-70">
              {sections.map(s => s.label[0]).join(' → ')}
            </p>
          </button>
        );
      })}
    </div>
  );
}
