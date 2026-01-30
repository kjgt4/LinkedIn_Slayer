import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Target, DollarSign, Award,
  Loader2, RefreshCw, Lightbulb, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getPerformanceMetrics, getPillarRecommendation } from '@/lib/api';
import { PILLARS, FRAMEWORKS, getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, recRes] = await Promise.all([
        getPerformanceMetrics(),
        getPillarRecommendation()
      ]);
      setMetrics(metricsRes.data);
      setRecommendation(recRes.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-72 bg-white/10" />
            <Skeleton className="h-5 w-96 mt-2 bg-white/5" />
          </div>
          <Skeleton className="h-10 w-24 bg-white/10" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-surface p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg bg-white/10" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-20 bg-white/5" />
                  <Skeleton className="h-8 w-16 mt-2 bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pillar Performance Skeleton */}
        <div className="card-surface p-6">
          <Skeleton className="h-6 w-48 mb-6 bg-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-white/5">
                <Skeleton className="h-5 w-24 bg-white/10" />
                <Skeleton className="h-4 w-32 mt-2 bg-white/5" />
                <Skeleton className="h-8 w-20 mt-3 bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pillarIcons = {
    growth: TrendingUp,
    tam: Target,
    sales: DollarSign
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white">
            Performance Analytics
          </h1>
          <p className="text-neutral-400 mt-2">Track your content performance and optimize your strategy</p>
        </div>
        <Button onClick={fetchData} variant="outline" data-testid="refresh-analytics-btn" className="border-white/10">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-electric-blue/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-electric-blue" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Posts</p>
              <p className="text-3xl font-heading font-bold text-white">{metrics?.total_posts || 0}</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Published</p>
              <p className="text-3xl font-heading font-bold text-white">{metrics?.published_posts || 0}</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Avg Engagement</p>
              <p className="text-3xl font-heading font-bold text-white">{metrics?.avg_engagement?.toFixed(1) || 0}</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Strategy Score</p>
              <p className="text-3xl font-heading font-bold text-white">
                {metrics?.published_posts > 0 ? Math.round((metrics.avg_engagement / 10) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      {recommendation && (
        <div className="card-surface p-6 border-electric-blue/30 bg-electric-blue/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-electric-blue/20 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-electric-blue" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white mb-2">
                AI Strategy Recommendation
              </h3>
              <p className="text-electric-blue font-medium mb-2">{recommendation.recommendation}</p>
              <p className="text-neutral-400 text-sm">{recommendation.insight}</p>
              
              {/* Suggested Distribution */}
              <div className="flex gap-4 mt-4">
                {Object.entries(recommendation.suggested_distribution || {}).map(([pillar, percentage]) => (
                  <div key={pillar} className="flex items-center gap-2">
                    <span className={cn(
                      "w-3 h-3 rounded-full",
                      pillar === 'growth' ? 'bg-blue-500' :
                      pillar === 'tam' ? 'bg-amber-500' : 'bg-emerald-500'
                    )} />
                    <span className="text-sm text-neutral-300">{pillar.toUpperCase()}: {percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pillar & Framework Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar Performance */}
        <div className="card-surface p-6">
          <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white mb-6">
            Performance by Content Pillar
          </h3>
          <div className="space-y-4">
            {Object.entries(metrics?.pillar_performance || {}).map(([pillar, stats]) => {
              const Icon = pillarIcons[pillar] || TrendingUp;
              const maxEngagement = Math.max(
                ...Object.values(metrics?.pillar_performance || {}).map(s => s.total_engagement || 0)
              );
              const percentage = maxEngagement > 0 ? (stats.total_engagement / maxEngagement) * 100 : 0;
              
              return (
                <div key={pillar} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn(
                        "w-4 h-4",
                        pillar === 'growth' ? 'text-blue-400' :
                        pillar === 'tam' ? 'text-amber-400' : 'text-emerald-400'
                      )} />
                      <span className="text-white font-medium">{PILLARS[pillar]?.label || pillar}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-mono">{stats.count} posts</span>
                      <span className="text-neutral-500 mx-2">|</span>
                      <span className="text-neutral-400">{stats.avg_engagement?.toFixed(1)} avg</span>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        pillar === 'growth' ? 'bg-blue-500' :
                        pillar === 'tam' ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Framework Performance */}
        <div className="card-surface p-6">
          <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white mb-6">
            Performance by Framework
          </h3>
          <div className="space-y-4">
            {Object.entries(metrics?.framework_performance || {}).map(([framework, stats]) => {
              const maxEngagement = Math.max(
                ...Object.values(metrics?.framework_performance || {}).map(s => s.total_engagement || 0)
              );
              const percentage = maxEngagement > 0 ? (stats.total_engagement / maxEngagement) * 100 : 0;
              
              return (
                <div key={framework} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium uppercase",
                        framework === 'slay' ? 'framework-slay' : 'framework-pas'
                      )}>
                        {framework}
                      </span>
                      <span className="text-neutral-400 text-sm">
                        {FRAMEWORKS[framework]?.sections.map(s => s.label[0]).join(' → ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-mono">{stats.count} posts</span>
                      <span className="text-neutral-500 mx-2">|</span>
                      <span className="text-neutral-400">{stats.avg_engagement?.toFixed(1)} avg</span>
                    </div>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        framework === 'slay' ? 'bg-purple-500' : 'bg-rose-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="card-surface p-6">
        <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white mb-6">
          Weekly Engagement Trend
        </h3>
        <div className="flex items-end gap-4 h-48">
          {(metrics?.weekly_trend || []).map((week, index) => {
            const maxEngagement = Math.max(...(metrics?.weekly_trend || []).map(w => w.total_engagement || 0));
            const height = maxEngagement > 0 ? (week.total_engagement / maxEngagement) * 100 : 0;
            const prevWeek = metrics?.weekly_trend?.[index - 1];
            const trend = prevWeek ? week.total_engagement - prevWeek.total_engagement : 0;
            
            return (
              <div key={week.week_start} className="flex-1 flex flex-col items-center">
                <div className="flex items-center gap-1 mb-2">
                  {trend > 0 ? (
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                  ) : trend < 0 ? (
                    <ArrowDown className="w-3 h-3 text-red-400" />
                  ) : null}
                  <span className="text-xs text-neutral-400">{week.total_engagement}</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-t flex-1 relative">
                  <div 
                    className="absolute bottom-0 w-full bg-gradient-to-t from-electric-blue to-electric-blue/50 rounded-t transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-neutral-400">
                    {new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-neutral-500">{week.posts} posts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best Performing Posts */}
      <div className="card-surface p-6">
        <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white mb-6">
          Top Performing Posts
        </h3>
        {metrics?.best_performing_posts?.length > 0 ? (
          <div className="space-y-3">
            {metrics.best_performing_posts.map((post, index) => (
              <div 
                key={post.id}
                className="flex items-center gap-4 p-4 bg-neutral-900/50 rounded-lg border border-white/5"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold",
                  index === 0 ? 'bg-amber-500/20 text-amber-400' :
                  index === 1 ? 'bg-neutral-500/20 text-neutral-300' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-white/5 text-neutral-500'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium line-clamp-1">{post.hook || 'Untitled'}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={cn("px-2 py-0.5 rounded text-xs", PILLARS[post.pillar]?.color)}>
                      {PILLARS[post.pillar]?.label}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded text-xs", FRAMEWORKS[post.framework]?.color)}>
                      {FRAMEWORKS[post.framework]?.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-heading font-bold text-electric-blue">{post.engagement}</p>
                  <p className="text-xs text-neutral-500">engagement score</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-neutral-500 py-8">
            No published posts yet. Publish posts and add engagement metrics to see performance data.
          </p>
        )}
      </div>
    </div>
  );
}
