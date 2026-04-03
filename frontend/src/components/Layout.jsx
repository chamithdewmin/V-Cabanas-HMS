import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';

const Layout = () => {
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
