import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import { useAuth } from '@/contexts/AuthContext';
import { isPathAllowedForStaff, isStaffRestrictedRole } from '@/lib/navAccess';

function StaffRouteGuard() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const role = user?.role;
  if (!isStaffRestrictedRole(role)) {
    return <Outlet />;
  }
  if (isPathAllowedForStaff(pathname)) {
    return <Outlet />;
  }
  return <Navigate to="/invoices" replace />;
}

const Layout = () => {
  return (
    <SidebarProvider defaultCollapsed={false}>
      <Sidebar />
      <SidebarInset>
        <Topbar />
        <main className="px-6 py-2 sm:px-8 sm:py-3 lg:px-10 lg:py-4 min-w-0 max-w-full flex-1 bg-background">
          <StaffRouteGuard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
