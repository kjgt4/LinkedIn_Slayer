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
      <div className="card-surface p-4 md:p-8 animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 rounded" />
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(prev => prev - 1)}
            data-testid="calendar-prev-week-btn"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-heading text-base md:text-xl font-semibold uppercase tracking-wide text-foreground">
            {formatDate(calendar.week_start)} - {formatDate(calendar.week_end)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(prev => prev + 1)}
            data-testid="calendar-next-week-btn"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          {weekOffset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="text-primary"
            >
              Today
            </Button>
          )}
        </div>

        {/* Pillar Balance */}
        <div className="flex items-center gap-3 md:gap-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance:</span>
          {Object.entries(pillarCounts).map(([pillar, count]) => (
            <div key={pillar} className="flex items-center gap-1">
              <span className={cn("w-3 h-3 rounded-full",
                pillar === 'growth' ? 'bg-blue-500' :
                pillar === 'tam' ? 'bg-amber-500' : 'bg-emerald-500'
              )} />
              <span className="text-sm text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid - Horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="grid grid-cols-7 gap-2 md:gap-3 min-w-[640px] md:min-w-0">
          {calendar.days.map((day) => {
            const isToday = day.date === new Date().toISOString().split('T')[0];
            const filledSlots = day.slots.filter(Boolean).length;

            return (
              <div
                key={day.date}
                className={cn(
                  "card-surface p-2 md:p-3 min-h-[160px] md:min-h-[180px]",
                  isToday && "ring-1 ring-primary/50"
                )}
              >
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div>
                    <p className={cn(
                      "text-xs uppercase tracking-wider",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}>
                      {getDayName(day.date).slice(0, 3)}
                    </p>
                    <p className={cn(
                      "font-heading text-xl md:text-2xl font-bold",
                      isToday ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {new Date(day.date).getDate()}
                    </p>
                  </div>
                  {filledSlots > 0 && (
                    <span className="text-xs text-muted-foreground">{filledSlots}/4</span>
                  )}
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  {day.slots.slice(0, 4).map((post, slotIndex) => (
                    <button
                      key={slotIndex}
                      onClick={() => handleSlotClick(day.date, slotIndex, post)}
                      data-testid={`calendar-slot-${day.date}-${slotIndex}`}
                      className={cn(
                        "w-full h-8 md:h-8 rounded border transition-all duration-200 flex items-center justify-center text-xs",
                        post
                          ? cn(PILLARS[post.pillar]?.color, "hover:opacity-80")
                          : "border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {post ? (
                        <span className="truncate px-1 md:px-2">{post.hook || post.title || 'Draft'}</span>
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
    </div>
  );
}
