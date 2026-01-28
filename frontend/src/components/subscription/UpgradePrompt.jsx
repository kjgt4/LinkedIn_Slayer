import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function UpgradePrompt({ 
  feature, 
  requiredTier = 'basic',
  trigger,
  variant = 'inline',
  className
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const featureLabels = {
    framework_editor: 'Framework Editor',
    file_upload: 'File Upload',
    linkedin_connection: 'LinkedIn Integration',
    direct_publish: 'Direct Publishing',
    engagement_timer: 'Engagement Timer',
    comment_drafting: 'AI Comment Drafting',
    analytics_trends: 'Analytics Trends',
    ai_strategy_recommendations: 'AI Strategy Recommendations',
    export_reports: 'Export Reports',
    knowledge_informed_ai: 'Knowledge-Informed AI',
    voice_matched_generation: 'Voice-Matched Generation',
  };

  const featureLabel = featureLabels[feature] || feature?.replace(/_/g, ' ');

  const handleUpgrade = () => {
    setOpen(false);
    navigate('/pricing');
  };

  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-electric-blue/10 to-purple-500/10 border border-electric-blue/20",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <p className="text-white font-medium">{featureLabel}</p>
            <p className="text-sm text-neutral-400">
              Upgrade to {requiredTier} to unlock
            </p>
          </div>
        </div>
        <Button onClick={handleUpgrade} className="btn-primary" data-testid="upgrade-prompt-btn">
          <Sparkles className="w-4 h-4 mr-2" />
          Upgrade
        </Button>
      </div>
    );
  }

  // Modal variant
  return (
    <>
      {trigger && (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-charcoal border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-electric-blue" />
              Upgrade Required
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              <span className="font-medium text-white">{featureLabel}</span> is available on the{' '}
              <span className="text-electric-blue capitalize">{requiredTier}</span> plan and above.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 rounded-lg bg-neutral-900/50 border border-white/5">
            <p className="text-sm text-neutral-300">
              Unlock premium features to supercharge your LinkedIn content strategy:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-400">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-electric-blue" />
                More posts and AI generations
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-electric-blue" />
                LinkedIn integration
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-electric-blue" />
                Advanced analytics
              </li>
            </ul>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={handleUpgrade} className="flex-1 btn-primary" data-testid="upgrade-modal-btn">
              <Sparkles className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default UpgradePrompt;
