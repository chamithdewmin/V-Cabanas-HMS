import React, { useMemo, useState } from 'react';
import { Search, CalendarDays, Bell, X } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  return (
    <header className="sticky top-0 z-30 border-b border-secondary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 pt-[env(safe-area-inset-top)]">
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
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-secondary bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            aria-label="Calendar"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-secondary bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;