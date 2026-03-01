import React from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

const RESTRICTED_ROLES = ['manager', 'receptionist'];
const RESTRICTED_ALLOWED_PATHS = ['/invoices', '/clients', '/booking'];

const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const role = (user?.role || '').toLowerCase();
  const isRestricted = RESTRICTED_ROLES.includes(role);
  const pathAllowed = RESTRICTED_ALLOWED_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
  if (isRestricted && !pathAllowed) {
    return <Navigate to="/invoices" replace />;
  }
  return (
    <SidebarProvider defaultCollapsed={false}>
      <Sidebar />
      <SidebarInset>
        <main className="px-6 py-2 sm:px-8 sm:py-3 lg:px-10 lg:py-4 min-w-0 max-w-full flex-1 pt-[env(safe-area-inset-top)] bg-background">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
