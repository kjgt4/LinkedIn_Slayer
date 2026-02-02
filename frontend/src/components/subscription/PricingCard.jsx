import { Check, Star, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tierIcons = {
  free: Zap,
  basic: Star,
  premium: Crown,
};

const tierColors = {
  free: 'text-muted-foreground',
  basic: 'text-primary',
  premium: 'text-amber-600 dark:text-amber-400',
};

const tierBgColors = {
  free: 'bg-muted/50',
  basic: 'bg-primary/10 border-primary/30',
  premium: 'bg-amber-500/10 border-amber-500/30',
};

const features = {
  free: [
    '5 posts per month',
    '3 AI generations',
    '1 voice profile',
    'SLAY & PAS frameworks',
    'Mobile preview',
    'Copy to clipboard',
  ],
  basic: [
    '30 posts per month',
    '20 AI generations',
    '3 voice profiles',
    'LinkedIn integration',
    'Knowledge Vault (50 items)',
    'Full analytics',
    'Email support',
  ],
  premium: [
    'Unlimited posts',
    'Unlimited AI generations',
    'Unlimited voice profiles',
    'AI comment drafting',
    'Strategy recommendations',
    'Export reports',
    'Priority support',
  ],
};

export function PricingCard({
  tier,
  pricing,
  billingCycle,
  currentTier,
  onSelect,
  isLoading,
}) {
  const Icon = tierIcons[tier];
  const isCurrentPlan = currentTier === tier;
  const isFree = tier === 'free';
  const isPopular = tier === 'basic';
  
  const price = billingCycle === 'annual' 
    ? pricing?.annual_price || 0 
    : pricing?.monthly_price || 0;
  
  const displayPrice = billingCycle === 'annual'
    ? pricing?.annual_monthly_equivalent || `${pricing?.currency_symbol || '$'}${(price / 12).toFixed(2)}/mo`
    : pricing?.monthly_display || `${pricing?.currency_symbol || '$'}${price}/mo`;

  return (
    <div 
      className={cn(
        "relative flex flex-col p-6 rounded-2xl border transition-all",
        tierBgColors[tier],
        isPopular && "ring-2 ring-primary scale-105 z-10",
        !isPopular && "border-border"
      )}
      data-testid={`pricing-card-${tier}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
          Most Popular
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tierBgColors[tier])}>
          <Icon className={cn("w-5 h-5", tierColors[tier])} />
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-foreground capitalize">{tier}</h3>
          {tier === 'free' && <p className="text-xs text-muted-foreground">Get started</p>}
          {tier === 'basic' && <p className="text-xs text-muted-foreground">For active creators</p>}
          {tier === 'premium' && <p className="text-xs text-muted-foreground">Power users</p>}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-foreground">
            {isFree ? 'Free' : displayPrice.replace('/mo', '')}
          </span>
          {!isFree && <span className="text-muted-foreground">/mo</span>}
        </div>
        {!isFree && billingCycle === 'annual' && (
          <p className="text-sm text-emerald-400 mt-1">
            {pricing?.annual_savings || 'Save 17%'}
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-6 flex-1">
        {features[tier].map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <Check className={cn("w-4 h-4 mt-0.5 shrink-0", tierColors[tier])} />
            <span className="text-foreground/80">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => !isFree && !isCurrentPlan && onSelect(tier)}
        disabled={isLoading || isCurrentPlan || isFree}
        data-testid={`select-${tier}-btn`}
        className={cn(
          "w-full",
          isCurrentPlan && "bg-muted cursor-default",
          !isCurrentPlan && !isFree && "btn-primary",
          isFree && "bg-muted text-muted-foreground cursor-default"
        )}
      >
        {isCurrentPlan ? 'Current Plan' : isFree ? 'Free Forever' : `Upgrade to ${tier}`}
      </Button>
    </div>
  );
}

export default PricingCard;
