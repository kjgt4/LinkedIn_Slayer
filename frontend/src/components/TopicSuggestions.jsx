import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ArrowRight, Link, Loader2 } from 'lucide-react';
import { suggestTopics } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PILLARS, FRAMEWORKS } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function TopicSuggestions({ onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspirationUrl, setInspirationUrl] = useState('');

  const fetchSuggestions = async (url = inspirationUrl) => {
    setLoading(true);
    try {
      const response = await suggestTopics(null, url || null);
      setSuggestions(response.data);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      // Fallback suggestions
      setSuggestions([
        { topic: "The one hiring mistake that cost me $50k", pillar: "growth", framework: "slay", angle: "Personal failure story" },
        { topic: "Why your LinkedIn posts get 12 views", pillar: "tam", framework: "pas", angle: "Algorithm pain point" },
        { topic: "How I closed $200k from one LinkedIn post", pillar: "sales", framework: "slay", angle: "Case study" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions('');
  }, []);

  const handleRefresh = () => {
    fetchSuggestions(inspirationUrl);
  };

  const handleUrlKeyDown = (e) => {
    if (e.key === 'Enter' && inspirationUrl.trim()) {
      fetchSuggestions(inspirationUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-electric-blue" />
          <h3 className="font-heading text-lg font-semibold uppercase tracking-wide">Topic Ideas</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          data-testid="refresh-topics-btn"
          className="text-neutral-400 hover:text-white"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Inspiration URL Input */}
      <div className="space-y-2">
        <label className="text-xs text-neutral-500 uppercase tracking-wider flex items-center gap-1">
          <Link className="w-3 h-3" />
          Inspiration
        </label>
        <div className="flex gap-2">
          <Input
            value={inspirationUrl}
            onChange={(e) => setInspirationUrl(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="Paste URL for content inspiration..."
            data-testid="inspiration-url-input"
            className="bg-black/30 border-white/10 focus:border-electric-blue text-sm"
          />
          {inspirationUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              data-testid="generate-inspired-topics-btn"
              className="text-electric-blue hover:bg-electric-blue/10 shrink-0"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-neutral-600">
          Add a URL to steer AI suggestions towards specific topics
        </p>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {loading && suggestions.length === 0 ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-electric-blue mx-auto mb-2" />
            <p className="text-sm text-neutral-500">
              {inspirationUrl ? 'Analyzing content...' : 'Generating ideas...'}
            </p>
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion)}
              data-testid={`topic-suggestion-${index}`}
              className="w-full p-4 card-surface hover:border-white/20 transition-all duration-200 text-left group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-white group-hover:text-electric-blue transition-colors">
                    {suggestion.topic}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">{suggestion.angle}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-electric-blue transition-colors mt-1" />
              </div>
              <div className="flex gap-2 mt-3">
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
