import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, ArrowRight, Link, Loader2, Star, History, Database, ChevronDown, X } from 'lucide-react';
import { suggestTopics, getInspirationUrls, saveInspirationUrl, toggleFavoriteUrl, deleteInspirationUrl, saveInspirationToVault } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { PILLARS, FRAMEWORKS } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TopicSuggestions({ onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspirationUrl, setInspirationUrl] = useState('');
  const [urlHistory, setUrlHistory] = useState([]);
  const [savingToVault, setSavingToVault] = useState(null);

  const fetchUrlHistory = useCallback(async () => {
    try {
      const response = await getInspirationUrls();
      setUrlHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch URL history:', error);
    }
  }, []);

  const fetchSuggestions = useCallback(async (url = '') => {
    setLoading(true);
    try {
      // Save URL to history if provided
      if (url && url.trim()) {
        await saveInspirationUrl(url.trim());
        fetchUrlHistory();
      }

      const response = await suggestTopics(null, url || null);
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([
        { topic: "The one hiring mistake that cost me $50k", pillar: "growth", framework: "slay", angle: "Personal failure story" },
        { topic: "Why your LinkedIn posts get 12 views", pillar: "tam", framework: "pas", angle: "Algorithm pain point" },
        { topic: "How I closed $200k from one LinkedIn post", pillar: "sales", framework: "slay", angle: "Case study" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchUrlHistory]);

  useEffect(() => {
    fetchSuggestions('');
    fetchUrlHistory();
  }, [fetchSuggestions, fetchUrlHistory]);

  const handleRefresh = () => {
    fetchSuggestions(inspirationUrl);
  };

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter' && inspirationUrl.trim()) {
      fetchSuggestions(inspirationUrl);
    }
  };

  const handleSelectFromHistory = (url) => {
    setInspirationUrl(url);
    fetchSuggestions(url);
  };

  const handleToggleFavorite = async (e, urlItem) => {
    e.stopPropagation();
    try {
      await toggleFavoriteUrl(urlItem.id);
      fetchUrlHistory();
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  };

  const handleDeleteUrl = async (e, urlItem) => {
    e.stopPropagation();
    try {
      await deleteInspirationUrl(urlItem.id);
      fetchUrlHistory();
      toast.success('URL removed from history');
    } catch (error) {
      toast.error('Failed to delete URL');
    }
  };

  const handleSaveToVault = async (urlItem) => {
    setSavingToVault(urlItem.id);
    try {
      await saveInspirationToVault(urlItem.id);
      toast.success('Saved to Knowledge Vault!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save to vault');
    } finally {
      setSavingToVault(null);
    }
  };

  const favoriteUrls = urlHistory.filter(u => u.is_favorite);
  const recentUrls = urlHistory.filter(u => !u.is_favorite).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-foreground">Topic Ideas</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          data-testid="refresh-topics-btn"
          className="text-muted-foreground hover:text-foreground"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Inspiration URL Input with History Dropdown */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Link className="w-3 h-3" />
          Inspiration
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={inspirationUrl}
              onChange={(e) => setInspirationUrl(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="Paste URL for content inspiration..."
              data-testid="inspiration-url-input"
              className="text-sm pr-10"
            />
            {inspirationUrl && (
              <button
                onClick={() => setInspirationUrl('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* History Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid="url-history-btn"
              >
                <History className="w-4 h-4" />
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {favoriteUrls.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Favorites
                  </DropdownMenuLabel>
                  {favoriteUrls.map((urlItem) => (
                    <DropdownMenuItem
                      key={urlItem.id}
                      onClick={() => handleSelectFromHistory(urlItem.url)}
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate text-sm flex-1">{urlItem.title || urlItem.url}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleFavorite(e, urlItem)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <Star className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-current" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveToVault(urlItem);
                            }}
                            disabled={savingToVault === urlItem.id}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {savingToVault === urlItem.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            ) : (
                              <Database className="w-3 h-3 text-primary" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteUrl(e, urlItem)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              {recentUrls.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Recent
                  </DropdownMenuLabel>
                  {recentUrls.map((urlItem) => (
                    <DropdownMenuItem
                      key={urlItem.id}
                      onClick={() => handleSelectFromHistory(urlItem.url)}
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate text-sm flex-1">{urlItem.title || urlItem.url}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleFavorite(e, urlItem)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <Star className="w-3 h-3 text-muted-foreground hover:text-amber-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveToVault(urlItem);
                            }}
                            disabled={savingToVault === urlItem.id}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {savingToVault === urlItem.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            ) : (
                              <Database className="w-3 h-3 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteUrl(e, urlItem)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {urlHistory.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No URL history yet
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Generate button */}
          {inspirationUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              data-testid="generate-inspired-topics-btn"
              className="text-primary hover:bg-primary/10 shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70">
          Add a URL to steer AI suggestions • Click <History className="w-3 h-3 inline" /> for history
        </p>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {loading && suggestions.length === 0 ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 card-surface">
                <Skeleton className="h-5 w-full mb-2 bg-muted" />
                <Skeleton className="h-4 w-2/3 mb-3 bg-muted/50" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded bg-muted" />
                  <Skeleton className="h-5 w-14 rounded bg-muted" />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center pt-2">
              {inspirationUrl ? 'Analyzing content...' : 'Generating ideas...'}
            </p>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion)}
              data-testid={`topic-suggestion-${index}`}
              className="w-full p-4 card-surface hover:border-primary/30 transition-all duration-200 text-left group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {suggestion.topic}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{suggestion.angle}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={cn("px-2 py-0.5 rounded text-xs", PILLARS[suggestion.pillar]?.color)}>
                  {PILLARS[suggestion.pillar]?.label}
                </span>
                <span className={cn("px-2 py-0.5 rounded text-xs", FRAMEWORKS[suggestion.framework]?.color)}>
                  {FRAMEWORKS[suggestion.framework]?.label}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
