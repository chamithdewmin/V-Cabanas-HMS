import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

const SidebarContext = createContext(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('Sidebar components must be used within SidebarProvider');
  return ctx;
}

export function SidebarProvider({ children, defaultCollapsed = false }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggleCollapsed = () => setCollapsed((p) => !p);
  return (
    <SidebarContext.Provider
      value={{
        open,
        setOpen,
        collapsed,
        setCollapsed,
        toggleCollapsed,
      }}
    >
      <div
        className="group/sidebar-wrapper flex min-h-screen w-full bg-background dark:bg-[#0C0E14]"
        data-state={collapsed ? 'collapsed' : 'expanded'}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export const Sidebar = React.forwardRef(
  ({ children, collapsible = 'off', className, ...props }, ref) => {
    const { open, collapsed } = useSidebar();
    const isIconOnly = collapsible === 'icon' && collapsed;
    return (
      <aside
        ref={ref}
        data-collapsible={collapsible}
        data-state={isIconOnly ? 'collapsed' : 'expanded'}
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-card dark:bg-[#13161e] transition-[width] duration-300 ease-sidebar pt-[env(safe-area-inset-top)]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isIconOnly ? 'w-[56px]' : 'w-[240px] max-w-[85vw]',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    );
  }
);
Sidebar.displayName = 'Sidebar';

export function SidebarHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 pt-4 pb-3 min-h-14',
        className
      )}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }) {
  const { collapsed } = useSidebar();
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-0 py-2 min-h-0',
        'group-data-[state=collapsed]/sidebar-wrapper:[&_.sidebar-label]:hidden',
        className
      )}
      data-state={collapsed ? 'collapsed' : 'expanded'}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }) {
  return (
    <div
      className={cn('shrink-0 border-t border-border p-3', className)}
      {...props}
    />
  );
}

export function SidebarRail() {
  const { toggleCollapsed, collapsed } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-secondary bg-card shadow transition-colors hover:bg-secondary lg:flex"
    >
      <span
        className={cn(
          'h-2 w-0.5 rounded-full bg-muted-foreground transition-transform',
          collapsed ? 'rotate-0' : 'rotate-180'
        )}
      />
    </button>
  );
}

export function SidebarInset({ className, ...props }) {
  return (
    <main
      className={cn(
        'flex flex-1 flex-col min-w-0 transition-[margin] duration-300 ease-sidebar',
        'lg:ml-[240px] group-data-[state=collapsed]/sidebar-wrapper:lg:ml-[56px]',
        className
      )}
      {...props}
    />
  );
}

export function SidebarTrigger({ className, ...props }) {
  const { setOpen } = useSidebar();
  return (
    <button
      type="button"
      onClick={() => setOpen((p) => !p)}
      aria-label="Toggle sidebar"
      className={cn(
        'lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-lg transition-colors touch-manipulation',
        className
      )}
      {...props}
    />
  );
}

export function SidebarDivider({ className, ...props }) {
  return <div className={cn('my-1 border-t border-border', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }) {
  return <div className={cn('space-y-0.5', className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }) {
  return (
    <div
      className={cn(
        'sidebar-label pt-2 px-4 pb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }) {
  return <div className={cn('flex flex-col gap-px px-2', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }) {
  return <div className={cn('relative my-px', className)} {...props} />;
}

export const SidebarMenuButton = React.forwardRef(
  ({ className, asChild = false, isActive, children, ...props }, ref) => {
    const comp = asChild ? 'span' : 'button';
    const base = cn(
      'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 min-h-9 text-[15px] font-medium transition-colors duration-150 touch-manipulation text-left',
      isActive
        ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
        : 'text-foreground hover:bg-secondary',
      className
    );
    return React.createElement(comp, { ref, className: base, ...props }, children);
  }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

export function SidebarMenuSub({ className, ...props }) {
  return (
    <div
      className={cn('sidebar-label ml-2 border-l border-border pl-2 space-y-0.5', className)}
      {...props}
    />
  );
}

export function SidebarMenuSubItem({ className, ...props }) {
  return <div className={cn('relative', className)} {...props} />;
}

export const SidebarMenuSubButton = React.forwardRef(
  ({ className, asChild = false, isActive, ...props }, ref) => {
    const comp = asChild ? 'span' : 'button';
    const base = cn(
      'flex w-full items-center gap-2.5 rounded-lg pl-6 pr-2 py-2 text-[14px] transition-colors duration-150',
      isActive
        ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      className
    );
    return React.createElement(comp, { ref, className: base, ...props });
  }
);
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';
