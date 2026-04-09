import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';

export default function FinanceDashboard() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - V Cabanas HMS</title>
        <meta name="description" content="V Cabanas HMS home" />
      </Helmet>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {getGreeting()}, {user?.name || 'there'}. Use the sidebar for Invoices, Clients, Expenses, Cash Flow, Booking,
          Calendar, and Reports.
        </p>
      </div>
    </>
  );
}
