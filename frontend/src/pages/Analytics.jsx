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
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-72 bg-muted" />
            <Skeleton className="h-5 w-96 mt-2 bg-muted/50" />
          </div>
          <Skeleton className="h-10 w-24 bg-muted" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-surface p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg bg-muted" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-20 bg-muted/50" />
                  <Skeleton className="h-8 w-16 mt-2 bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pillar Performance Skeleton */}
        <div className="card-surface p-6">
          <Skeleton className="h-6 w-48 mb-6 bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50">
                <Skeleton className="h-5 w-24 bg-muted" />
                <Skeleton className="h-4 w-32 mt-2 bg-muted/50" />
                <Skeleton className="h-8 w-20 mt-3 bg-muted" />
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground">
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-2">Track your content performance and optimize your strategy</p>
        </div>
        <Button onClick={fetchData} variant="outline" data-testid="refresh-analytics-btn">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Posts</p>
              <p className="text-3xl font-heading font-bold text-foreground">{metrics?.total_posts || 0}</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Published</p>
              <p className="text-3xl font-heading font-bold text-foreground">{metrics?.published_posts || 0}</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Engagement</p>
              <p className="text-3xl font-heading font-bold text-foreground">{metrics?.avg_engagement?.toFixed(1) || 0}</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Strategy Score</p>
              <p className="text-3xl font-heading font-bold text-foreground">
                {metrics?.published_posts > 0 ? Math.round((metrics.avg_engagement / 10) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation */}
      {recommendation && (
        <div className="card-surface p-6 border-primary/30 bg-primary/5">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground mb-2">
                AI Strategy Recommendation
              </h3>
              <p className="text-primary font-medium mb-2">{recommendation.recommendation}</p>
              <p className="text-muted-foreground text-sm">{recommendation.insight}</p>

              {/* Suggested Distribution */}
              <div className="flex flex-wrap gap-4 mt-4">
                {Object.entries(recommendation.suggested_distribution || {}).map(([pillar, percentage]) => (
                  <div key={pillar} className="flex items-center gap-2">
                    <span className={cn(
                      "w-3 h-3 rounded-full",
                      pillar === 'growth' ? 'bg-blue-500' :
                      pillar === 'tam' ? 'bg-amber-500' : 'bg-emerald-500'
                    )} />
                    <span className="text-sm text-foreground">{pillar.toUpperCase()}: {percentage}%</span>
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
          <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground mb-6">
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
                        pillar === 'growth' ? 'text-blue-600 dark:text-blue-400' :
                        pillar === 'tam' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      )} />
                      <span className="text-foreground font-medium">{PILLARS[pillar]?.label || pillar}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-foreground font-mono">{stats.count} posts</span>
                      <span className="text-muted-foreground mx-2">|</span>
                      <span className="text-muted-foreground">{stats.avg_engagement?.toFixed(1)} avg</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
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
          <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground mb-6">
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
                      <span className="text-muted-foreground text-sm">
                        {FRAMEWORKS[framework]?.sections.map(s => s.label[0]).join(' → ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-foreground font-mono">{stats.count} posts</span>
                      <span className="text-muted-foreground mx-2">|</span>
                      <span className="text-muted-foreground">{stats.avg_engagement?.toFixed(1)} avg</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
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
        <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground mb-6">
          Weekly Engagement Trend
        </h3>
        <div className="flex items-end gap-2 md:gap-4 h-48 overflow-x-auto">
          {(metrics?.weekly_trend || []).map((week, index) => {
            const maxEngagement = Math.max(...(metrics?.weekly_trend || []).map(w => w.total_engagement || 0));
            const height = maxEngagement > 0 ? (week.total_engagement / maxEngagement) * 100 : 0;
            const prevWeek = metrics?.weekly_trend?.[index - 1];
            const trend = prevWeek ? week.total_engagement - prevWeek.total_engagement : 0;

            return (
              <div key={week.week_start} className="flex-1 min-w-[60px] flex flex-col items-center">
                <div className="flex items-center gap-1 mb-2">
                  {trend > 0 ? (
                    <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : trend < 0 ? (
                    <ArrowDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                  ) : null}
                  <span className="text-xs text-muted-foreground">{week.total_engagement}</span>
                </div>
                <div className="w-full bg-muted rounded-t flex-1 relative">
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/50 rounded-t transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground/70">{week.posts} posts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best Performing Posts */}
      <div className="card-surface p-6">
        <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground mb-6">
          Top Performing Posts
        </h3>
        {metrics?.best_performing_posts?.length > 0 ? (
          <div className="space-y-3">
            {metrics.best_performing_posts.map((post, index) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold",
                  index === 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                  index === 1 ? 'bg-muted text-muted-foreground' :
                  index === 2 ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                  'bg-muted text-muted-foreground'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium line-clamp-1">{post.hook || 'Untitled'}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={cn("px-2 py-0.5 rounded text-xs", PILLARS[post.pillar]?.color)}>
                      {PILLARS[post.pillar]?.label}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded text-xs", FRAMEWORKS[post.framework]?.color)}>
                      {FRAMEWORKS[post.framework]?.label}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-heading font-bold text-primary">{post.engagement}</p>
                  <p className="text-xs text-muted-foreground">engagement score</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No published posts yet. Publish posts and add engagement metrics to see performance data.
          </p>
        )}
      </div>
    </div>
  );
}
