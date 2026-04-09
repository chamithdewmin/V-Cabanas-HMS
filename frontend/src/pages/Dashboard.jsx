import { useMemo, useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

/** Matches app theme `--primary` / `--destructive` (see index.css) */
const CHART_BLUE = 'hsl(221 100% 53%)';
const CHART_RED = 'hsl(0 72% 51%)';
/** Subtle grid in SVG (theme-independent; reads well on light & dark cards) */
const CHART_GRID = 'hsl(215 16% 47% / 0.22)';

function formatAxisMoney(v) {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) {
    const k = n / 1000;
    // Avoid duplicate ticks (e.g. 1500 and 2000 both rounding to "2K")
    const decimals = Number.isInteger(k) ? 0 : 1;
    return `${k.toFixed(decimals)}K`;
  }
  return String(Math.round(n));
}

/** Total LKR for a booking: room price + add-on lines (matches booking detail totals). */
function bookingTotalRevenue(b) {
  const room = Number(b?.price) || 0;
  const addons = Array.isArray(b?.addons)
    ? b.addons.reduce((s, a) => s + (Number(a.unitPrice) || 0) * (Number(a.quantity) || 1), 0)
    : 0;
  return room + addons;
}

function sumBookingRevenueForCalendarMonth(bookings, year, monthIndex) {
  let s = 0;
  bookings.forEach((b) => {
    const ymd = bookingCheckInYmd(b.checkIn);
    if (!ymd) return;
    const parts = ymd.split('-').map(Number);
    const yy = parts[0];
    const mm = parts[1];
    if (yy === year && mm - 1 === monthIndex) s += bookingTotalRevenue(b);
  });
  return s;
}

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

function buildMonthlySeries(monthsBack, bookings, incomes, expenses) {
  const rows = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = date.getFullYear();
    const m = date.getMonth();
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

    let bookingCount = 0;
    bookings.forEach((b) => {
      const ymd = bookingCheckInYmd(b.checkIn);
      if (!ymd) return;
      const parts = ymd.split('-').map(Number);
      const yy = parts[0];
      const mm = parts[1];
      if (yy === y && mm - 1 === m) bookingCount += 1;
    });

    let revenue = 0;
    bookings.forEach((b) => {
      const ymd = bookingCheckInYmd(b.checkIn);
      if (!ymd) return;
      const parts = ymd.split('-').map(Number);
      const yy = parts[0];
      const mm = parts[1];
      if (yy === y && mm - 1 === m) revenue += bookingTotalRevenue(b);
    });
    incomes.forEach((inc) => {
      if (!inc?.date) return;
      const d = new Date(inc.date);
      if (d.getFullYear() === y && d.getMonth() === m) revenue += Number(inc.amount) || 0;
    });

    let expense = 0;
    expenses.forEach((ex) => {
      if (!ex?.date) return;
      const d = new Date(ex.date);
      if (d.getFullYear() === y && d.getMonth() === m) expense += Number(ex.amount) || 0;
    });

    rows.push({ month: monthLabel, bookings: bookingCount, revenue, expense });
  }
  return rows;
}

function DashboardTooltip({ active, payload, label, valuePrefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-6 tabular-nums">
          <span className="text-foreground/90">{p.name}</span>
          <span className="font-semibold text-foreground">
            {valuePrefix}
            {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
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
  const [chartMonths, setChartMonths] = useState(12);

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

  const monthlyChartData = useMemo(
    () => buildMonthlySeries(chartMonths, bookings, incomes, expenses),
    [chartMonths, bookings, incomes, expenses]
  );

  const metrics = useMemo(() => {
    const today = new Date();
    const todayStr = localYmd(today);
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = localYmd(yest);

    const todayBookings = bookings.filter((b) => bookingCheckInYmd(b.checkIn) === todayStr).length;
    const yesterdayBookings = bookings.filter((b) => bookingCheckInYmd(b.checkIn) === yesterdayStr).length;
    const bookingsTrend = pctChange(todayBookings, yesterdayBookings);

    const totalRevenue =
      bookings.reduce((s, b) => s + bookingTotalRevenue(b), 0) +
      incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const now = new Date();
    const thisM = monthBounds(now.getFullYear(), now.getMonth());
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevM = monthBounds(lastMonthDate.getFullYear(), lastMonthDate.getMonth());

    const sumIncomeIn = (start, end) =>
      incomes.filter((i) => i.date && isInRange(i.date, start, end)).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const sumExpenseIn = (start, end) =>
      expenses.filter((e) => e.date && isInRange(e.date, start, end)).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const revThis =
      sumBookingRevenueForCalendarMonth(bookings, now.getFullYear(), now.getMonth()) +
      sumIncomeIn(thisM.start, thisM.end);
    const revPrev =
      sumBookingRevenueForCalendarMonth(
        bookings,
        lastMonthDate.getFullYear(),
        lastMonthDate.getMonth()
      ) + sumIncomeIn(prevM.start, prevM.end);
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Bookings</h2>
                <p className="text-sm text-muted-foreground">Check-ins by month</p>
              </div>
              <label className="sr-only" htmlFor="dash-chart-period-bookings">
                Chart period
              </label>
              <select
                id="dash-chart-period-bookings"
                value={chartMonths}
                onChange={(e) => setChartMonths(Number(e.target.value))}
                className="w-full shrink-0 rounded-lg border border-border bg-secondary/80 px-3 py-2 text-xs font-medium text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashBookingsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215 15% 45%)', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215 15% 45%)', fontSize: 11 }}
                    allowDecimals={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ stroke: CHART_GRID }}
                    content={<DashboardTooltip />}
                  />
                  <Area
                    type="natural"
                    dataKey="bookings"
                    name="Bookings"
                    stroke={CHART_BLUE}
                    strokeWidth={2}
                    fill="url(#dashBookingsFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: CHART_BLUE }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Revenue &amp; Expenses</h2>
                <p className="text-sm text-muted-foreground">
                  Booking totals by check-in month, plus income entries
                </p>
              </div>
              <label className="sr-only" htmlFor="dash-chart-period-rev">
                Chart period
              </label>
              <select
                id="dash-chart-period-rev"
                value={chartMonths}
                onChange={(e) => setChartMonths(Number(e.target.value))}
                className="w-full shrink-0 rounded-lg border border-border bg-secondary/80 px-3 py-2 text-xs font-medium text-foreground shadow-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
              >
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
            </div>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} barCategoryGap="18%" barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215 15% 45%)', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215 15% 45%)', fontSize: 11 }}
                    tickFormatter={formatAxisMoney}
                    width={44}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(221 100% 53% / 0.06)' }}
                    content={<DashboardTooltip valuePrefix={`${currency} `} />}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill={CHART_BLUE} radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="expense" name="Expenses" fill={CHART_RED} radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
