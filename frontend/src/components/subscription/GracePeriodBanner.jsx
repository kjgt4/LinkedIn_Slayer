import { AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function GracePeriodBanner({ className }) {
  const { isInGracePeriod, gracePeriodHours, tier } = useSubscription();
  const navigate = useNavigate();

  if (!isInGracePeriod) return null;

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/30",
      className
    )} data-testid="grace-period-banner">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-white font-medium">Payment Failed</p>
          <p className="text-sm text-neutral-400">
            We couldn't process your payment. Update within{' '}
            <span className="text-amber-400 font-medium">{gracePeriodHours} hours</span>{' '}
            to keep your {tier} features.
          </p>
        </div>
      </div>
      <Button 
        onClick={() => navigate('/settings?tab=billing')} 
        className="bg-amber-500 hover:bg-amber-600 text-black"
        data-testid="update-payment-btn"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Update Payment
      </Button>
    </div>
  );
}

export function OverLimitBanner({ resourceType, current, limit, className }) {
  const navigate = useNavigate();

  if (current <= limit || limit === -1) return null;

  const resourceLabels = {
    knowledge_items: 'knowledge items',
    voice_profiles: 'voice profiles',
    tracked_influencers: 'tracked influencers',
    tracked_posts: 'tracked posts',
  };

  const label = resourceLabels[resourceType] || resourceType;

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg bg-neutral-900/50 border border-white/10",
      className
    )} data-testid="over-limit-banner">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
          <Clock className="w-5 h-5 text-neutral-400" />
        </div>
        <div>
          <p className="text-white font-medium">Over Limit</p>
          <p className="text-sm text-neutral-400">
            You have <span className="text-white">{current}</span> {label} but your plan allows{' '}
            <span className="text-white">{limit}</span>. Your existing items are safe.
          </p>
        </div>
      </div>
      <Button 
        onClick={() => navigate('/pricing')} 
        variant="outline"
        className="border-white/10"
        data-testid="upgrade-limit-btn"
      >
        Upgrade to Add More
      </Button>
    </div>
  );
}

export default GracePeriodBanner;
