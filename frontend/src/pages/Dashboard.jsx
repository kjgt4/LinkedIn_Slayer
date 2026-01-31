import { useNavigate } from 'react-router-dom';
import { Plus, Zap, TrendingUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarView from '@/components/CalendarView';
import TopicSuggestions from '@/components/TopicSuggestions';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleTopicSelect = (suggestion) => {
    navigate(`/editor?topic=${encodeURIComponent(suggestion.topic)}&framework=${suggestion.framework}&pillar=${suggestion.pillar}`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Command Center
          </h1>
          <p className="text-muted-foreground mt-2">Your LinkedIn content strategy at a glance</p>
        </div>
        <Button
          onClick={() => navigate('/editor')}
          data-testid="quick-create-btn"
          className="w-full sm:w-auto"
        >
          <Plus className="w-5 h-5 mr-2" />
          Quick Create
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Goal</p>
              <p className="text-2xl font-bold text-foreground">4 Posts</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Strategy</p>
              <p className="text-2xl font-bold text-foreground">4-3-2-1</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Frameworks</p>
              <p className="text-2xl font-bold text-foreground">SLAY + PAS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - Spans 2 columns */}
        <div className="lg:col-span-2">
          <CalendarView />
        </div>

        {/* Topic Suggestions */}
        <div className="card-surface p-6">
          <TopicSuggestions onSelect={handleTopicSelect} />
        </div>
      </div>

      {/* Framework Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="font-bold text-purple-600 dark:text-purple-400">S</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">SLAY Framework</h3>
              <p className="text-xs text-muted-foreground">For narrative authority posts</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-purple-600 dark:text-purple-400 w-6">S</span>
              <span>Story - Capture attention</span>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-purple-600 dark:text-purple-400 w-6">L</span>
              <span>Lesson - Provide retention</span>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-purple-600 dark:text-purple-400 w-6">A</span>
              <span>Advice - Drive conversion</span>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-purple-600 dark:text-purple-400 w-6">Y</span>
              <span>You - Prompt engagement</span>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <span className="font-bold text-rose-600 dark:text-rose-400">P</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">PAS Framework</h3>
              <p className="text-xs text-muted-foreground">For problem-solving posts</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-rose-600 dark:text-rose-400 w-6">P</span>
              <span>Problem - Identify the pain</span>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-rose-600 dark:text-rose-400 w-6">A</span>
              <span>Agitate - Create urgency</span>
            </div>
            <div className="flex items-center gap-3 text-foreground/80">
              <span className="font-bold text-rose-600 dark:text-rose-400 w-6">S</span>
              <span>Solution - Provide authority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
