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
  ChevronDown,
  DollarSign,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { bookingNetRevenueLkr } from '@/lib/bookingNetLkr';
import { bookingFinancialAttributionYmd, toLocalYmd } from '@/lib/bookingRevenueDate';
import { cn } from '@/lib/utils';

/** Matches app theme `--primary` / `--destructive` (see index.css) */
const CHART_BLUE = 'hsl(221 100% 53%)';
const CHART_RED = 'hsl(0 72% 51%)';
/** Subtle grid in SVG (theme-independent; reads well on light & dark cards) */
const CHART_GRID = 'hsl(215 16% 47% / 0.22)';

const CHART_RANGE_OPTIONS = [
  { id: '12w', label: 'Last 12 weeks' },
  { id: '6m', label: 'Last 6 months' },
  { id: '12m', label: 'Last 12 months' },
];

function atMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

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

function sumBookingRevenueForCalendarMonth(bookings, year, monthIndex) {
  let s = 0;
  bookings.forEach((b) => {
    const ymd = bookingFinancialAttributionYmd(b);
    if (!ymd) return;
    const parts = ymd.split('-').map(Number);
    const yy = parts[0];
    const mm = parts[1];
    if (yy === year && mm - 1 === monthIndex) s += bookingNetRevenueLkr(b);
  });
  return s;
}

function localYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthlySeries(monthsBack, bookings, incomes, expenses) {
  const rows = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = date.getFullYear();
    const m = date.getMonth();
    const period = date.toLocaleDateString('en-US', { month: 'short' });

    let bookingCount = 0;
    bookings.forEach((b) => {
      const ymd = bookingFinancialAttributionYmd(b);
      if (!ymd) return;
      const parts = ymd.split('-').map(Number);
      const yy = parts[0];
      const mm = parts[1];
      if (yy === y && mm - 1 === m) bookingCount += 1;
    });

    let revenue = 0;
    bookings.forEach((b) => {
      const ymd = bookingFinancialAttributionYmd(b);
      if (!ymd) return;
      const parts = ymd.split('-').map(Number);
      const yy = parts[0];
      const mm = parts[1];
      if (yy === y && mm - 1 === m) revenue += bookingNetRevenueLkr(b);
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

    rows.push({ period, bookings: bookingCount, revenue, expense });
  }
  return rows;
}

function buildWeeklySeries(weeksBack, bookings, incomes, expenses) {
  const rows = [];
  const now = new Date();
  const startOfToday = atMidnight(now);

  for (let i = 0; i < weeksBack; i += 1) {
    const weekEndDay = new Date(startOfToday);
    weekEndDay.setDate(weekEndDay.getDate() - (weeksBack - 1 - i) * 7);
    const weekStartDay = new Date(weekEndDay);
    weekStartDay.setDate(weekStartDay.getDate() - 6);
    const ws = atMidnight(weekStartDay);
    const we = atMidnight(weekEndDay);

    const fmt = (d) =>
      `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const period =
      ws.getFullYear() === we.getFullYear() && ws.getMonth() === we.getMonth()
        ? `${fmt(ws)}–${we.getDate()}`
        : `${fmt(ws)}–${fmt(we)}`;

    const inWeek = (d) => {
      const t = atMidnight(d).getTime();
      return t >= ws.getTime() && t <= we.getTime();
    };

    let bookingCount = 0;
    let revenue = 0;
    bookings.forEach((b) => {
      const ymd = bookingFinancialAttributionYmd(b);
      if (!ymd) return;
      const parts = ymd.split('-').map(Number);
      const cd = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!inWeek(cd)) return;
      bookingCount += 1;
      revenue += bookingNetRevenueLkr(b);
    });

    incomes.forEach((inc) => {
      if (!inc?.date) return;
      const d = new Date(inc.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!inWeek(day)) return;
      revenue += Number(inc.amount) || 0;
    });

    let expense = 0;
    expenses.forEach((ex) => {
      if (!ex?.date) return;
      const d = new Date(ex.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (!inWeek(day)) return;
      expense += Number(ex.amount) || 0;
    });

    rows.push({ period, bookings: bookingCount, revenue, expense });
  }
  return rows;
}

function buildChartSeries(range, bookings, incomes, expenses) {
  if (range === '12w') return buildWeeklySeries(12, bookings, incomes, expenses);
  if (range === '6m') return buildMonthlySeries(6, bookings, incomes, expenses);
  return buildMonthlySeries(12, bookings, incomes, expenses);
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

function ChartRangeSelect({ id, value, onChange }) {
  return (
    <div className="relative w-full sm:w-auto sm:min-w-[11rem]">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full cursor-pointer appearance-none rounded-full border border-border bg-secondary/90 py-2.5 pl-4 pr-10',
          'text-sm font-medium text-foreground shadow-sm outline-none transition-colors',
          'hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
      >
        {CHART_RANGE_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/80"
        aria-hidden
      />
    </div>
  );
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
  const [chartRange, setChartRange] = useState('12m');

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

  const chartData = useMemo(
    () => buildChartSeries(chartRange, bookings, incomes, expenses),
    [chartRange, bookings, incomes, expenses]
  );

  const isWeeklyChart = chartRange === '12w';

  const metrics = useMemo(() => {
    const today = new Date();
    const todayStr = localYmd(today);
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = localYmd(yest);

    const todayBookings = bookings.filter((b) => (b.checkIn ? toLocalYmd(b.checkIn) : '') === todayStr).length;
    const yesterdayBookings = bookings.filter((b) => (b.checkIn ? toLocalYmd(b.checkIn) : '') === yesterdayStr).length;
    const bookingsTrend = pctChange(todayBookings, yesterdayBookings);

    const totalRevenue =
      bookings.reduce((s, b) => s + bookingNetRevenueLkr(b), 0) +
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
                <p className="text-sm text-muted-foreground">
                  {isWeeklyChart ? 'Check-ins by week' : 'Check-ins by month'}
                </p>
              </div>
              <ChartRangeSelect
                id="dash-chart-period-bookings"
                value={chartRange}
                onChange={(v) => setChartRange(v)}
              />
            </div>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: isWeeklyChart ? 8 : 0 }}>
                  <defs>
                    <linearGradient id="dashBookingsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_BLUE} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215 15% 45%)', fontSize: isWeeklyChart ? 10 : 12 }}
                    angle={isWeeklyChart ? -38 : 0}
                    textAnchor={isWeeklyChart ? 'end' : 'middle'}
                    height={isWeeklyChart ? 68 : 28}
                    interval={isWeeklyChart ? 0 : 'preserveStartEnd'}
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
                  {isWeeklyChart
                    ? 'Booking totals by check-in week, plus income entries'
                    : 'Booking totals by check-in month, plus income entries'}
                </p>
              </div>
              <ChartRangeSelect
                id="dash-chart-period-rev"
                value={chartRange}
                onChange={(v) => setChartRange(v)}
              />
            </div>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="18%" barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: isWeeklyChart ? 8 : 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(215 15% 45%)', fontSize: isWeeklyChart ? 10 : 12 }}
                    angle={isWeeklyChart ? -38 : 0}
                    textAnchor={isWeeklyChart ? 'end' : 'middle'}
                    height={isWeeklyChart ? 68 : 28}
                    interval={isWeeklyChart ? 0 : 'preserveStartEnd'}
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
