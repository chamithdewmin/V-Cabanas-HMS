import { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  CalendarCheck,
  DollarSign,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

function localYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bookingCheckInYmd(checkIn) {
  if (!checkIn) return '';
  return String(checkIn).slice(0, 10);
}

function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatTrend(pct) {
  const rounded = Math.abs(pct) >= 100 ? Math.round(pct) : Number(pct.toFixed(1));
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

function monthBounds(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function isInRange(isoStr, start, end) {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}

function MetricCard({ icon: Icon, label, value, trendPct }) {
  const positive = trendPct >= 0;
  const showTrend = Number.isFinite(trendPct);

  return (
    <div
      className={cn(
        'flex flex-1 flex-col rounded-xl border border-border bg-card p-4 sm:p-5',
        'min-w-[140px] shadow-sm'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
        {showTrend && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold',
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{formatTrend(trendPct)}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-[1.65rem]">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function FinanceDashboard() {
  const { user } = useAuth();
  const { incomes, expenses, clients, settings } = useFinance();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.bookings
      .list()
      .then((list) => setBookings(Array.isArray(list) ? list : []))
      .catch(() => setBookings([]));
  }, []);

  useEffect(() => {
    const onFocus = () => {
      api.bookings
        .list()
        .then((list) => setBookings(Array.isArray(list) ? list : []))
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const currency = settings?.currency || 'LKR';

  const metrics = useMemo(() => {
    const today = new Date();
    const todayStr = localYmd(today);
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = localYmd(yest);

    const todayBookings = bookings.filter((b) => bookingCheckInYmd(b.checkIn) === todayStr).length;
    const yesterdayBookings = bookings.filter((b) => bookingCheckInYmd(b.checkIn) === yesterdayStr).length;
    const bookingsTrend = pctChange(todayBookings, yesterdayBookings);

    const totalRevenue = incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const now = new Date();
    const thisM = monthBounds(now.getFullYear(), now.getMonth());
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevM = monthBounds(lastMonthDate.getFullYear(), lastMonthDate.getMonth());

    const sumIncomeIn = (start, end) =>
      incomes.filter((i) => i.date && isInRange(i.date, start, end)).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const sumExpenseIn = (start, end) =>
      expenses.filter((e) => e.date && isInRange(e.date, start, end)).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const revThis = sumIncomeIn(thisM.start, thisM.end);
    const revPrev = sumIncomeIn(prevM.start, prevM.end);
    const revenueTrend = pctChange(revThis, revPrev);

    const expThis = sumExpenseIn(thisM.start, thisM.end);
    const expPrev = sumExpenseIn(prevM.start, prevM.end);
    const expenseTrend = pctChange(expThis, expPrev);

    const totalCustomers = clients.length;
    const clientsThisMonth = clients.filter(
      (c) => c.createdAt && isInRange(c.createdAt, thisM.start, thisM.end)
    ).length;
    const clientsPrevMonth = clients.filter(
      (c) => c.createdAt && isInRange(c.createdAt, prevM.start, prevM.end)
    ).length;
    const customersTrend = pctChange(clientsThisMonth, clientsPrevMonth);

    return {
      todayBookings,
      bookingsTrend,
      totalRevenue,
      revenueTrend,
      totalExpenses,
      expenseTrend,
      totalCustomers,
      customersTrend,
    };
  }, [bookings, incomes, expenses, clients]);

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
        <meta name="description" content="V Cabanas HMS dashboard" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {getGreeting()}, {user?.name || 'there'}.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap lg:flex-nowrap">
          <MetricCard
            icon={CalendarCheck}
            label="Today Bookings"
            value={String(metrics.todayBookings)}
            trendPct={metrics.bookingsTrend}
          />
          <MetricCard
            icon={DollarSign}
            label="Total Revenue"
            value={`${currency} ${metrics.totalRevenue.toLocaleString()}`}
            trendPct={metrics.revenueTrend}
          />
          <MetricCard
            icon={Receipt}
            label="Total Expenses"
            value={`${currency} ${metrics.totalExpenses.toLocaleString()}`}
            trendPct={metrics.expenseTrend}
          />
          <MetricCard
            icon={Users}
            label="Total Customers"
            value={metrics.totalCustomers.toLocaleString()}
            trendPct={metrics.customersTrend}
          />
        </div>
      </div>
    </>
  );
}
