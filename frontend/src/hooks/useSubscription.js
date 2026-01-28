import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { subscriptionAPI } from '@/lib/api';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const [subRes, usageRes] = await Promise.all([
        subscriptionAPI.get(),
        subscriptionAPI.getUsage()
      ]);
      setSubscription(subRes.data);
      setUsage(usageRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await subscriptionAPI.getUsage();
      setUsage(res.data);
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }, []);

  const tier = subscription?.tier || 'free';
  const effectiveTier = subscription?.effective_tier || 'free';
  const currency = subscription?.currency || 'aud';
  const isInGracePeriod = subscription?.is_in_grace_period || false;
  const gracePeriodHours = subscription?.grace_period_hours_remaining || 0;

  const hasFeature = useCallback((featureName) => {
    const featureAccess = {
      free: {
        framework_editor: false,
        file_upload: false,
        knowledge_informed_ai: false,
        voice_matched_generation: false,
        favorite_urls: false,
        save_url_to_vault: false,
        linkedin_connection: false,
        direct_publish: false,
        engagement_timer: false,
        browser_notifications: false,
        comment_drafting: false,
        comment_variations: false,
        discovery_assistant: false,
        engagement_reminders: false,
        analytics_by_pillar: false,
        analytics_by_framework: false,
        analytics_trends: false,
        analytics_top_posts: false,
        ai_strategy_recommendations: false,
        engagement_heatmap: false,
        export_reports: false,
        email_support: false,
        priority_support: false,
        data_export: false,
        api_access: false,
      },
      basic: {
        framework_editor: true,
        file_upload: true,
        knowledge_informed_ai: true,
        voice_matched_generation: true,
        favorite_urls: true,
        save_url_to_vault: true,
        linkedin_connection: true,
        direct_publish: true,
        engagement_timer: true,
        browser_notifications: true,
        comment_drafting: true,
        comment_variations: false,
        discovery_assistant: true,
        engagement_reminders: false,
        analytics_by_pillar: true,
        analytics_by_framework: true,
        analytics_trends: true,
        analytics_top_posts: true,
        ai_strategy_recommendations: false,
        engagement_heatmap: false,
        export_reports: false,
        email_support: true,
        priority_support: false,
        data_export: false,
        api_access: false,
      },
      premium: {
        framework_editor: true,
        file_upload: true,
        knowledge_informed_ai: true,
        voice_matched_generation: true,
        favorite_urls: true,
        save_url_to_vault: true,
        linkedin_connection: true,
        direct_publish: true,
        engagement_timer: true,
        browser_notifications: true,
        comment_drafting: true,
        comment_variations: true,
        discovery_assistant: true,
        engagement_reminders: true,
        analytics_by_pillar: true,
        analytics_by_framework: true,
        analytics_trends: true,
        analytics_top_posts: true,
        ai_strategy_recommendations: true,
        engagement_heatmap: true,
        export_reports: true,
        email_support: true,
        priority_support: true,
        data_export: true,
        api_access: true,
      }
    };
    
    return featureAccess[effectiveTier]?.[featureName] ?? false;
  }, [effectiveTier]);

  const canUse = useCallback((usageType) => {
    if (!usage) return false;
    
    const usageMap = {
      posts_per_month: { current: 'posts_created', limit: 'posts_limit' },
      ai_generations_per_month: { current: 'ai_generations', limit: 'ai_generations_limit' },
      ai_hook_improvements_per_month: { current: 'ai_hook_improvements', limit: 'ai_hook_improvements_limit' },
      knowledge_items: { current: 'knowledge_items', limit: 'knowledge_items_limit' },
      voice_profiles: { current: 'voice_profiles', limit: 'voice_profiles_limit' },
      tracked_influencers: { current: 'tracked_influencers', limit: 'tracked_influencers_limit' },
      tracked_posts: { current: 'tracked_posts', limit: 'tracked_posts_limit' },
      comment_drafts_per_month: { current: 'comment_drafts', limit: 'comment_drafts_limit' },
    };

    const mapping = usageMap[usageType];
    if (!mapping) return true;

    const limit = usage[mapping.limit];
    if (limit === -1) return true; // Unlimited
    
    const current = usage[mapping.current];
    return current < limit;
  }, [usage]);

  const getUsagePercent = useCallback((usageType) => {
    if (!usage) return 0;
    
    const usageMap = {
      posts: { current: 'posts_created', limit: 'posts_limit' },
      ai_generations: { current: 'ai_generations', limit: 'ai_generations_limit' },
      ai_hook_improvements: { current: 'ai_hook_improvements', limit: 'ai_hook_improvements_limit' },
      knowledge_items: { current: 'knowledge_items', limit: 'knowledge_items_limit' },
      voice_profiles: { current: 'voice_profiles', limit: 'voice_profiles_limit' },
      tracked_influencers: { current: 'tracked_influencers', limit: 'tracked_influencers_limit' },
      tracked_posts: { current: 'tracked_posts', limit: 'tracked_posts_limit' },
      comment_drafts: { current: 'comment_drafts', limit: 'comment_drafts_limit' },
    };

    const mapping = usageMap[usageType];
    if (!mapping) return 0;

    const limit = usage[mapping.limit];
    if (limit === -1) return 0; // Unlimited shows as 0%
    if (limit === 0) return 100;
    
    const current = usage[mapping.current];
    return Math.min(100, Math.round((current / limit) * 100));
  }, [usage]);

  const value = {
    subscription,
    usage,
    isLoading,
    error,
    tier,
    effectiveTier,
    currency,
    isInGracePeriod,
    gracePeriodHours,
    hasFeature,
    canUse,
    getUsagePercent,
    refreshUsage,
    refresh: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export default useSubscription;
