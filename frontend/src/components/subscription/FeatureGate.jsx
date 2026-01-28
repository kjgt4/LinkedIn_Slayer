import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

export function FeatureGate({ feature, children, fallback, showPrompt = true }) {
  const { hasFeature, effectiveTier } = useSubscription();
  
  const hasAccess = hasFeature(feature);
  
  if (hasAccess) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  if (showPrompt) {
    const requiredTier = getRequiredTier(feature);
    return <UpgradePrompt feature={feature} requiredTier={requiredTier} />;
  }

  return null;
}

function getRequiredTier(feature) {
  const basicFeatures = [
    'framework_editor', 'file_upload', 'knowledge_informed_ai', 'voice_matched_generation',
    'favorite_urls', 'save_url_to_vault', 'linkedin_connection', 'direct_publish',
    'engagement_timer', 'browser_notifications', 'comment_drafting', 'discovery_assistant',
    'analytics_by_pillar', 'analytics_by_framework', 'analytics_trends', 'analytics_top_posts',
    'email_support'
  ];
  
  return basicFeatures.includes(feature) ? 'basic' : 'premium';
}

export function UsageGate({ usageType, children, fallback, showPrompt = true }) {
  const { canUse, effectiveTier } = useSubscription();
  
  const hasUsage = canUse(usageType);
  
  if (hasUsage) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  if (showPrompt) {
    return <UpgradePrompt feature={usageType} requiredTier="basic" />;
  }

  return null;
}

export default FeatureGate;
