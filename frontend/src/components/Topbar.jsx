import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CalendarDays, Bell, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarWrapRef = useRef(null);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!calendarWrapRef.current) return;
      if (!calendarWrapRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const todayLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [selectedDate]
  );

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i += 1) days.push(null);
    for (let d = 1; d <= totalDays; d += 1) days.push(new Date(year, month, d));
    return days;
  }, [calendarMonth]);

  const isSameDate = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <SidebarTrigger className="shrink-0 lg:hidden" />
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search clients, invoices, payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 pl-9 pr-14 py-2.5 bg-secondary border border-secondary rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center rounded-full border border-secondary bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground">
            {todayLabel}
          </div>
          <div className="relative" ref={calendarWrapRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-secondary bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              aria-label="Calendar"
            >
              <CalendarDays className="h-5 w-5" />
            </button>
            {isCalendarOpen && (
              <div className="absolute right-0 mt-2 w-[280px] rounded-2xl border border-secondary bg-card p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (p) => new Date(p.getFullYear(), p.getMonth() - 1, 1)
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-base font-semibold">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(
                        (p) => new Date(p.getFullYear(), p.getMonth() + 1, 1)
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 px-1 pb-1">
                  {weekDays.map((d) => (
                    <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((d, i) => (
                    <div key={`${d ? d.toISOString() : `empty-${i}`}`} className="flex justify-center">
                      {d ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(d);
                            setIsCalendarOpen(false);
                          }}
                          className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                            isSameDate(d, selectedDate)
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-secondary/70'
                          }`}
                        >
                          {d.getDate()}
                        </button>
                      ) : (
                        <span className="h-8 w-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-secondary bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;