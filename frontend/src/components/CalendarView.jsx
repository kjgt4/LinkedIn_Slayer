import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getWeekCalendar } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PILLARS, formatDate, getDayName } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function CalendarView() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWeekCalendar(weekOffset);
      setCalendar(response.data);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleSlotClick = (date, slot, post) => {
    if (post) {
      navigate(`/editor/${post.id}`);
    } else {
      navigate(`/editor?date=${date}&slot=${slot}`);
    }
  };

  if (loading || !calendar) {
    return (
      <div className="card-surface p-8 animate-pulse">
        <div className="h-8 bg-white/10 rounded w-48 mb-6" />
        <div className="grid grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Get pillar distribution for the week
  const pillarCounts = { growth: 0, tam: 0, sales: 0 };
  calendar.days.forEach(day => {
    day.slots.forEach(post => {
      if (post) pillarCounts[post.pillar]++;
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(prev => prev - 1)}
            data-testid="calendar-prev-week-btn"
            className="text-neutral-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-heading text-xl font-semibold uppercase tracking-wide">
            {formatDate(calendar.week_start)} - {formatDate(calendar.week_end)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(prev => prev + 1)}
            data-testid="calendar-next-week-btn"
            className="text-neutral-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="text-electric-blue"
            >
              Today
            </Button>
          )}
        </div>

        {/* Pillar Balance */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">Balance:</span>
          {Object.entries(pillarCounts).map(([pillar, count]) => (
            <div key={pillar} className="flex items-center gap-1">
              <span className={cn("w-3 h-3 rounded-full", 
                pillar === 'growth' ? 'bg-blue-500' :
                pillar === 'tam' ? 'bg-amber-500' : 'bg-emerald-500'
              )} />
              <span className="text-sm text-neutral-400">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3">
        {calendar.days.map((day) => {
          const isToday = day.date === new Date().toISOString().split('T')[0];
          const filledSlots = day.slots.filter(Boolean).length;
          
          return (
            <div
              key={day.date}
              className={cn(
                "card-surface p-3 min-h-[180px]",
                isToday && "ring-1 ring-electric-blue/50"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={cn(
                    "text-xs uppercase tracking-wider",
                    isToday ? "text-electric-blue" : "text-neutral-500"
                  )}>
                    {getDayName(day.date).slice(0, 3)}
                  </p>
                  <p className={cn(
                    "font-heading text-2xl font-bold",
                    isToday ? "text-white" : "text-neutral-400"
                  )}>
                    {new Date(day.date).getDate()}
                  </p>
                </div>
                {filledSlots > 0 && (
                  <span className="text-xs text-neutral-500">{filledSlots}/4</span>
                )}
              </div>

              <div className="space-y-2">
                {day.slots.slice(0, 4).map((post, slotIndex) => (
                  <button
                    key={slotIndex}
                    onClick={() => handleSlotClick(day.date, slotIndex, post)}
                    data-testid={`calendar-slot-${day.date}-${slotIndex}`}
                    className={cn(
                      "w-full h-8 rounded border transition-all duration-200 flex items-center justify-center text-xs",
                      post
                        ? cn(PILLARS[post.pillar]?.color, "hover:opacity-80")
                        : "border-dashed border-white/10 hover:border-white/30 text-neutral-600 hover:text-neutral-400"
                    )}
                  >
                    {post ? (
                      <span className="truncate px-2">{post.hook || post.title || 'Draft'}</span>
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
