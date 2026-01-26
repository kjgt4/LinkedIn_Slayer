import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { suggestTopics } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PILLARS, FRAMEWORKS } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function TopicSuggestions({ onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await suggestTopics();
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
    fetchSuggestions();
  }, []);

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
          onClick={fetchSuggestions}
          disabled={loading}
          data-testid="refresh-topics-btn"
          className="text-neutral-400 hover:text-white"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
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
        ))}
      </div>
    </div>
  );
}
