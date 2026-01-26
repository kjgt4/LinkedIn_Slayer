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
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-white">
            Command Center
          </h1>
          <p className="text-neutral-400 mt-2">Your LinkedIn content strategy at a glance</p>
        </div>
        <Button
          onClick={() => navigate('/editor')}
          data-testid="quick-create-btn"
          className="btn-primary px-6 py-3 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Quick Create
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-6 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-electric-blue/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-electric-blue" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Weekly Goal</p>
              <p className="text-2xl font-heading font-bold text-white">4 Posts</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Strategy</p>
              <p className="text-2xl font-heading font-bold text-white">4-3-2-1</p>
            </div>
          </div>
        </div>
        <div className="card-surface p-6 hover:border-white/20 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Frameworks</p>
              <p className="text-2xl font-heading font-bold text-white">SLAY + PAS</p>
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
              <span className="font-heading font-bold text-purple-400">S</span>
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white">SLAY Framework</h3>
              <p className="text-xs text-neutral-500">For narrative authority posts</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-purple-400 w-6">S</span>
              <span>Story - Capture attention</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-purple-400 w-6">L</span>
              <span>Lesson - Provide retention</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-purple-400 w-6">A</span>
              <span>Advice - Drive conversion</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-purple-400 w-6">Y</span>
              <span>You - Prompt engagement</span>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <span className="font-heading font-bold text-rose-400">P</span>
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold uppercase tracking-wide text-white">PAS Framework</h3>
              <p className="text-xs text-neutral-500">For problem-solving posts</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-rose-400 w-6">P</span>
              <span>Problem - Identify the pain</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-rose-400 w-6">A</span>
              <span>Agitate - Create urgency</span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300">
              <span className="font-heading font-bold text-rose-400 w-6">S</span>
              <span>Solution - Provide authority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
