import { useSubscription } from '@/hooks/useSubscription';
import { UsageBar } from './UsageBar';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UsageDashboard({ compact = false }) {
  const { usage, isLoading, refreshUsage, effectiveTier } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-electric-blue" />
      </div>
    );
  }

  if (!usage) return null;

  const usageItems = [
    { label: 'Posts Created', current: usage.posts_created, limit: usage.posts_limit },
    { label: 'AI Generations', current: usage.ai_generations, limit: usage.ai_generations_limit },
    { label: 'Hook Improvements', current: usage.ai_hook_improvements, limit: usage.ai_hook_improvements_limit },
    { label: 'Knowledge Items', current: usage.knowledge_items, limit: usage.knowledge_items_limit },
    { label: 'Voice Profiles', current: usage.voice_profiles, limit: usage.voice_profiles_limit },
    { label: 'Tracked Influencers', current: usage.tracked_influencers, limit: usage.tracked_influencers_limit },
    { label: 'Tracked Posts', current: usage.tracked_posts, limit: usage.tracked_posts_limit },
    { label: 'Comment Drafts', current: usage.comment_drafts, limit: usage.comment_drafts_limit },
  ];

  // Filter out items with 0 limit (not available for tier)
  const visibleItems = compact 
    ? usageItems.filter(item => item.limit !== 0).slice(0, 4)
    : usageItems.filter(item => item.limit !== 0);

  return (
    <div className="space-y-4" data-testid="usage-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Usage This Month
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Resets in {usage.period_resets_in_days} days
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshUsage}
          className="text-neutral-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-4 md:grid-cols-2"}>
        {visibleItems.map((item, idx) => (
          <UsageBar
            key={idx}
            label={item.label}
            current={item.current}
            limit={item.limit}
            showPercent={!compact}
          />
        ))}
      </div>

      {compact && visibleItems.length < usageItems.filter(item => item.limit !== 0).length && (
        <p className="text-xs text-neutral-500 text-center">
          View all usage in Settings
        </p>
      )}
    </div>
  );
}

export default UsageDashboard;
