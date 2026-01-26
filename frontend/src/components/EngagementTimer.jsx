import { useState, useEffect } from 'react';
import { Clock, Bell, MessageCircle, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getActiveEngagement } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function EngagementTimer() {
  const [activePosts, setActivePosts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchActivePosts();
    const interval = setInterval(fetchActivePosts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchActivePosts = async () => {
    try {
      const response = await getActiveEngagement();
      setActivePosts(response.data);
      
      // Show notification if there are active posts
      if (response.data.length > 0 && Notification.permission === 'granted') {
        const urgentPosts = response.data.filter(p => p.engagement_remaining_minutes < 10);
        if (urgentPosts.length > 0) {
          new Notification('Engagement Timer Alert!', {
            body: `${urgentPosts.length} post(s) need engagement NOW!`,
            icon: '/favicon.ico'
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch active engagement:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  if (activePosts.length === 0) return null;

  const formatTime = (minutes) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          data-testid="engagement-timer-toggle"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all",
            "bg-signal-red text-white animate-pulse-glow"
          )}
        >
          <Clock className="w-5 h-5" />
          <span className="font-heading font-bold">
            {activePosts.length} Active
          </span>
          <Bell className="w-4 h-4" />
        </button>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="w-80 card-surface shadow-2xl border-signal-red/30">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-signal-red/10">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-signal-red" />
              <span className="font-heading font-bold text-white uppercase tracking-wide">
                30-Min Engagement
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {activePosts.map((post) => {
              const remaining = post.engagement_remaining_minutes || 0;
              const isUrgent = remaining < 10;
              const percentage = (remaining / 30) * 100;

              return (
                <div
                  key={post.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isUrgent 
                      ? "border-signal-red/50 bg-signal-red/10" 
                      : "border-white/10 bg-white/5"
                  )}
                >
                  <p className="text-sm text-white font-medium line-clamp-1 mb-2">
                    {post.hook || 'Published Post'}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          isUrgent ? "bg-signal-red" : "bg-neon-green"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className={cn(
                      "font-mono text-sm font-bold",
                      isUrgent ? "text-signal-red" : "text-neon-green"
                    )}>
                      {formatTime(remaining)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs text-neutral-400 hover:text-white"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Reply to comments
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-white/10 bg-black/20">
            <p className="text-xs text-neutral-500 text-center">
              The first 30 minutes after posting are critical for algorithm engagement
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
