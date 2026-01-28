import { cn } from '@/lib/utils';

export function UsageBar({ 
  label, 
  current, 
  limit, 
  className,
  showPercent = true,
  variant = 'default'
}) {
  const isUnlimited = limit === -1;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const isNearLimit = percent >= 80;
  const isAtLimit = percent >= 100;

  const barColors = {
    default: isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-electric-blue',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  const barColor = variant === 'default' ? barColors.default : barColors[variant];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className={cn(
          "font-medium",
          isAtLimit ? "text-red-400" : isNearLimit ? "text-amber-400" : "text-neutral-300"
        )}>
          {isUnlimited ? (
            <span className="text-emerald-400">Unlimited</span>
          ) : (
            <>
              {current} / {limit}
              {showPercent && <span className="text-neutral-500 ml-1">({percent}%)</span>}
            </>
          )}
        </span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: isUnlimited ? '0%' : `${percent}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-400">Limit reached. Upgrade for more.</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-amber-400">Near limit</p>
      )}
    </div>
  );
}

export default UsageBar;
