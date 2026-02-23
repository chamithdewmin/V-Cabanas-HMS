import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getPrintHtml } from '@/utils/pdfPrint';
import ReportPreviewModal from '@/components/ReportPreviewModal';

const DATE_RANGES = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
];

function getDateRangeForPeriod(period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (period === 'month') {
    start.setDate(1);
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) + 1;
    start.setMonth((q - 1) * 3, 1);
    end.setMonth(q * 3, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return { start, end };
}

function isDateInRange(dateStr, start, end) {
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
}

const Reports = () => {
  const [dateRange, setDateRange] = useState('month');
  const [reportPreview, setReportPreview] = useState({ open: false, html: '', filename: '' });
  const { toast } = useToast();
  const { incomes, expenses, totals, settings, loadData } = useFinance();

  const rangeBounds = useMemo(() => getDateRangeForPeriod(dateRange), [dateRange]);

  const salesByDay = useMemo(() => {
    const map = new Map();
    const addToMap = (dateIso, field, amount) => {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = map.get(key) || { date: label, income: 0, expenses: 0 };
      existing[field] += amount;
      map.set(key, existing);
    };
    incomes.filter((i) => isDateInRange(i.date, rangeBounds.start, rangeBounds.end)).forEach((i) => addToMap(i.date, 'income', i.amount));
    expenses.filter((e) => isDateInRange(e.date, rangeBounds.start, rangeBounds.end)).forEach((e) => addToMap(e.date, 'expenses', e.amount));
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [incomes, expenses, rangeBounds]);

  const expenseByCategory = useMemo(() => {
    const byCategory = expenses
      .filter((e) => isDateInRange(e.date, rangeBounds.start, rangeBounds.end))
      .reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {});
    return Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
  }, [expenses, rangeBounds]);

  const periodProfit = useMemo(() => {
    const income = incomes
      .filter((i) => isDateInRange(i.date, rangeBounds.start, rangeBounds.end))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const expense = expenses
      .filter((e) => isDateInRange(e.date, rangeBounds.start, rangeBounds.end))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return income - expense;
  }, [incomes, expenses, rangeBounds]);

  const COLORS = ['#ff6a00', '#ff8533', '#ffa366', '#ffc199', '#ffd9cc'];

  const handleExport = () => {
    const headers = ['Period', 'Income', 'Expenses', 'Profit'];
    const rows = profitTrend.map((row) => [
      row.date,
      row.income,
      row.expenses,
      row.profit,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    a.click();
    toast({
      title: 'Export successful',
      description: 'Report data exported to CSV',
    });
  };

  const openReportPreview = () => {
    const cur = settings?.currency || 'LKR';
    const periodLabel = dateRange === 'month' ? 'This month' : dateRange === 'quarter' ? 'This quarter' : 'This year';
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Reports &amp; Analytics</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · ${periodLabel}</p>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Summary</h3>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Period Profit (${periodLabel})</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${periodProfit.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Yearly Profit</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${(totals.yearlyProfit ?? 0).toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Estimated Tax (Year)</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${(totals.estimatedTaxYearly ?? 0).toLocaleString()}</td></tr>`;
    body += `</table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Cash Flow (Income vs Expenses)</h3>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Period</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Income</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Expenses</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Profit</th></tr>`;
    profitTrend.forEach((row) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${row.date}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${(row.income || 0).toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${(row.expenses || 0).toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${(row.profit || 0).toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Expense Breakdown by Category</h3>`;
    body += `<table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Category</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Amount</th></tr>`;
    expenseByCategory.forEach((row) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${row.category}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${(row.amount || 0).toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `reports-analytics-${new Date().toISOString().slice(0, 10)}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  const profitTrend = useMemo(
    () =>
      salesByDay.map((d) => ({
        ...d,
        profit: d.income - d.expenses,
      })),
    [salesByDay],
  );

  return (
    <>
      <Helmet>
        <title>Reports & Analytics - MyAccounts</title>
        <meta name="description" content="Analyze income, expenses, profit, and cash flow" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Deep dive into income, expenses, profit, and tax.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-border bg-muted/30 p-1">
              {DATE_RANGES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDateRange(value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateRange === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                loadData();
                toast({
                  title: 'Refreshed',
                  description: 'Report data has been refreshed.',
                });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={openReportPreview}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cash flow over time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Cash Flow (Income vs Expenses)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={profitTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                <XAxis dataKey="date" stroke="#bfc9d1" />
                <YAxis stroke="#bfc9d1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111316',
                    border: '1px solid #1f2933',
                    borderRadius: '0.5rem',
                  }}
                />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Expense breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Expense Breakdown by Category</h2>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111316',
                      border: '1px solid #1f2933',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-secondary p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {dateRange === 'month' ? 'Period Profit (This month)' : dateRange === 'quarter' ? 'Period Profit (This quarter)' : 'Period Profit (This year)'}
            </p>
            <p className="text-xl font-bold">
              {settings.currency} {periodProfit.toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Yearly Profit</p>
            <p className="text-xl font-bold">
              {settings.currency} {(totals.yearlyProfit ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-secondary p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Tax (Year)</p>
            <p className="text-xl font-bold">
              {settings.currency} {(totals.estimatedTaxYearly ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <ReportPreviewModal
        open={reportPreview.open}
        onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))}
        html={reportPreview.html}
        filename={reportPreview.filename}
        reportTitle="Reports & Analytics"
      />
    </>
  );
};

export default Reports;