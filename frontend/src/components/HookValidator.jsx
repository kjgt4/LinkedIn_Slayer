import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Lightbulb, Loader2 } from 'lucide-react';
import { validateHook, improveHook } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HookValidator({ hook, onSuggestionSelect }) {
  const [validation, setValidation] = useState(null);
  const [improvements, setImprovements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [improvementLoading, setImprovementLoading] = useState(false);

  useEffect(() => {
    if (!hook || hook.trim().length < 3) {
      setValidation(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await validateHook(hook);
        setValidation(response.data);
      } catch (error) {
        console.error('Validation error:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [hook]);

  const handleGetImprovements = async () => {
    if (!hook) return;
    setImprovementLoading(true);
    try {
      const response = await improveHook(hook);
      setImprovements(response.data.suggestions);
    } catch (error) {
      console.error('Improvement error:', error);
    } finally {
      setImprovementLoading(false);
    }
  };

  if (!hook || hook.trim().length < 3) return null;

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      {validation && (
        <div className={cn(
          "p-4 rounded-lg border",
          validation.is_valid
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        )}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {validation.is_valid ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium text-foreground">
              {validation.word_count} words
              {validation.is_valid ? ' - Perfect!' : ' - Consider shortening'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Score:</span>
              <span className={cn(
                "font-mono font-bold",
                validation.score >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                validation.score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
              )}>
                {validation.score}
              </span>
            </div>
          </div>

          {validation.suggestions.length > 0 && (
            <ul className="mt-3 space-y-1">
              {validation.suggestions.map((suggestion, i) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Get AI Improvements */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGetImprovements}
          disabled={improvementLoading}
          data-testid="get-hook-improvements-btn"
        >
          {improvementLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Lightbulb className="w-4 h-4 mr-2" />
          )}
          Get AI Suggestions
        </Button>
      </div>

      {/* AI Improvements */}
      {improvements && (
        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <p className="text-sm text-purple-600 dark:text-purple-300 mb-3 font-medium">AI Hook Improvements:</p>
          <div className="whitespace-pre-wrap text-sm text-foreground/80">
            {improvements}
          </div>
        </div>
      )}
    </div>
  );
}
