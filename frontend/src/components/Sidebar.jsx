import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  FileText,
  Users,
  User,
  UserPlus,
  MessageSquare,
  Bell,
  BarChart3,
  TrendingUp,
  Settings,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  Sparkles,
  LogOut,
  LayoutDashboard,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import sidebarIcon from '@/assets/icon.png';
import {
  Sidebar as SidebarRoot,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarDivider,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarLabelGroup, AvatarWithStatus, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const reportSubItems = [
  { to: '/reports/overview', label: 'Overview Reports' },
  { to: '/reports/profit-loss', label: 'Profit & Loss' },
  { to: '/reports/cash-flow', label: 'Cash Flow' },
  { to: '/reports/tax', label: 'Tax Reports' },
  { to: '/reports/balance-sheet', label: 'Balance Sheet' },
];

const ADMIN_EMAIL = 'logozodev@gmail.com';

/** Nav config with dividers (demo-style). Use href for links, items[] for expandable sections. */
const NAV_ITEMS_WITH_DIVIDERS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Insights', href: '/ai-insights', icon: Sparkles },
  { divider: true },
  { label: 'Payments', href: '/income', icon: CreditCard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Clients', href: '/clients', icon: Users },
  { divider: true },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'Cash Flow', href: '/cash-flow', icon: TrendingUp },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Reports', icon: BarChart3, href: '/reports/overview', items: reportSubItems },
  { divider: true },
  { label: 'Reminders', href: '/reminders', icon: Bell },
  { label: 'Messages', href: '/sms', icon: MessageSquare },
  { divider: true },
  { label: 'Users', href: '/users', icon: UserPlus, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavItem({ item }) {
  const { setOpen, collapsed } = useSidebar();
  return (
    <SidebarMenuItem>
      <NavLink
        to={item.href}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 min-h-11 text-base font-medium transition-colors duration-150 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            collapsed && 'justify-center px-2.5',
            isActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
              : 'text-foreground hover:bg-secondary'
          )
        }
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="sidebar-label text-base">{item.label}</span>
      </NavLink>
    </SidebarMenuItem>
  );
}

function ExpandableNavItem({ item }) {
  const location = useLocation();
  const { setOpen, collapsed } = useSidebar();
  const basePath = item.href?.replace(/\/[^/]+$/, '') || '';
  const isActive = basePath && location.pathname.startsWith(basePath);
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 min-h-11 text-base font-medium transition-colors duration-150 touch-manipulation text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            collapsed && 'justify-center px-2.5',
            isActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent [&_svg]:text-sidebar-active-accent'
              : 'text-foreground hover:bg-secondary'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon className="w-5 h-5 shrink-0" />
            <span className="sidebar-label text-base">{item.label}</span>
          </div>
          <ChevronDown
            className={cn('sidebar-label w-5 h-5 shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </button>
        <AnimatePresence>
          {expanded && !collapsed && item.items?.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SidebarMenuSub>
                {item.items.map((sub) => (
                  <SidebarMenuSubItem key={sub.to}>
                    <NavLink
                      to={sub.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive: subActive }) =>
                        cn(
                          'flex w-full items-center gap-3 rounded-lg pl-6 pr-3 py-2.5 text-[15px] transition-colors duration-150 sidebar-label',
                          subActive
                            ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )
                      }
                    >
                      <FileText className="w-5 h-5 shrink-0" />
                      <span>{sub.label}</span>
                    </NavLink>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SidebarMenuItem>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { settings } = useFinance();
  const { open, setOpen, collapsed, toggleCollapsed } = useSidebar();
  const canManageUsers = user?.email === ADMIN_EMAIL;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <SidebarRoot collapsible="icon">
        <SidebarHeader
          className={cn(
            collapsed && 'group/header cursor-pointer relative',
            collapsed && 'lg:flex lg:justify-center lg:items-center'
          )}
          {...(collapsed && { onClick: (e) => { if (e.target.closest('button')) return; toggleCollapsed(); } })}
        >
          <div className={cn('flex items-center gap-2.5 min-w-0 flex-1', collapsed && 'justify-center')}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-sm">
              <img src={sidebarIcon} alt="" className="h-4 w-4 object-contain" />
            </div>
            {!collapsed && (
              <span className="sidebar-label text-base font-semibold text-foreground truncate">MyAccounts</span>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="lg:hidden h-7 w-7 shrink-0 flex items-center justify-center hover:bg-secondary rounded-md border border-border transition-colors touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card hover:bg-secondary transition-all touch-manipulation opacity-0 pointer-events-none group-hover/header:opacity-100 group-hover/header:pointer-events-auto absolute right-1.5 top-1/2 -translate-y-1/2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="hidden lg:flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary transition-colors touch-manipulation"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </SidebarHeader>

        <SidebarContent>
          {!collapsed && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
          <SidebarMenu>
            {NAV_ITEMS_WITH_DIVIDERS.map((entry, index) => {
              if (entry.divider) {
                return <SidebarDivider key={`divider-${index}`} />;
              }
              const item = entry;
              if (item.adminOnly && !canManageUsers) return null;
              if (item.items?.length) {
                return <ExpandableNavItem key={item.href || item.label} item={item} />;
              }
              return <NavItem key={item.href} item={item} />;
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(
              'flex w-full min-w-0 items-center gap-2.5 rounded-lg p-2 hover:bg-secondary transition-colors touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed && 'justify-center'
            )}>
              <AvatarWithStatus online className="h-7 w-7 shrink-0">
                {settings?.profileAvatar && <AvatarImage src={settings.profileAvatar} alt="Profile" />}
                <AvatarFallback className="text-xs">{(user?.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </AvatarWithStatus>
              {!collapsed && (
                <div className="sidebar-label min-w-0 flex-1 text-left">
                  <div className="text-sm font-semibold text-foreground truncate">{user?.name || 'User'}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              )}
              {!collapsed && <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56 p-2">
                  <div className="px-3 py-2 mb-1 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">My Account</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => { setOpen(false); navigate('/profile'); }}
                    className="rounded-md px-3 py-2.5 cursor-pointer focus:bg-secondary flex items-center gap-2"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-md px-3 py-2.5 cursor-pointer focus:bg-secondary flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
        </SidebarFooter>
      </SidebarRoot>
    </>
  );
}
