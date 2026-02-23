import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ExportReportDialog from '@/components/ExportReportDialog';
import ReportPreviewModal from '@/components/ReportPreviewModal';
import { getPrintHtml } from '@/utils/pdfPrint';

const filterByRange = (items, range, dateKey = 'date') => {
  if (!range) return items;
  return items.filter((i) => {
    const d = new Date(i[dateKey]);
    return d >= range.start && d <= range.end;
  });
};

const COLORS = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'];

const ReportExpense = () => {
  const { expenses, settings, loadData } = useFinance();
  const { toast } = useToast();
  const [exportOpen, setExportOpen] = React.useState(false);
  const [reportPreview, setReportPreview] = React.useState({ open: false, html: '', filename: '', title: '' });

  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const handleExport = (range) => {
    const filtered = filterByRange(expenses, range);
    const headers = ['Category', 'Amount', 'Date', 'Recurring'];
    const rows = filtered.map((e) => [e.category, e.amount, new Date(e.date).toLocaleDateString(), e.isRecurring ? 'Yes' : 'No']);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${range.start.toISOString().slice(0, 10)}.csv`;
    a.click();
    toast({ title: 'Export successful', description: 'Expense report exported to CSV' });
  };

  const handlePDF = (range) => {
    const filtered = filterByRange(expenses, range);
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const byCat = filtered.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    let table = '<h1>Expense Report</h1><p>Period: ' + range.start.toLocaleDateString() + ' - ' + range.end.toLocaleDateString() + '</p>';
    table += '<p><strong>Total: ' + settings.currency + ' ' + total.toLocaleString() + '</strong></p>';
    table += '<h3>Expense Breakdown by Category</h3><table style="width:100%; border-collapse: collapse;"><tr><th style="border:1px solid #ccc; padding:8px;">Category</th><th style="border:1px solid #ccc; padding:8px;">Amount</th></tr>';
    Object.entries(byCat).forEach(([k, v]) => {
      table += `<tr><td style="border:1px solid #ccc; padding:8px;">${k}</td><td style="border:1px solid #ccc; padding:8px;">${settings.currency} ${v.toLocaleString()}</td></tr>`;
    });
    table += '</table><h3>Budget vs Actual</h3><p>Actual total: ' + settings.currency + ' ' + total.toLocaleString() + '</p>';

    const fullHtml = getPrintHtml(table, { logo: settings?.logo, businessName: settings?.businessName });
    setReportPreview({ open: true, html: fullHtml, filename: `expense-report-${range.start.toISOString().slice(0, 10)}.pdf`, title: 'Expense Report' });
  };

  return (
    <>
      <Helmet>
        <title>Expense Reports - MyAccounts</title>
        <meta name="description" content="Expense breakdown, Budget vs actual" />
      </Helmet>

      <div className="space-y-6" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expense Reports</h1>
            <p className="text-muted-foreground">Expense breakdown, Budget vs actual</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => { loadData(); toast({ title: 'Refreshed', description: 'Data refreshed' }); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1c1e24",
                border: "1px solid #303338",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setExportOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1c1e24",
                border: "1px solid #303338",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setExportOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#1c1e24",
                border: "1px solid #303338",
                borderRadius: 8,
                padding: "9px 16px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Expense Breakdown by Category</h2>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="amount"
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expense data</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-xl font-bold mb-4">Budget vs Actual</h2>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                  <Bar dataKey="amount" name="Actual" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No expense data</div>
            )}
            <p className="text-sm text-muted-foreground mt-2">Total actual: {settings.currency} {totalExpenses.toLocaleString()}</p>
          </motion.div>
        </div>
      </div>

      <ExportReportDialog open={exportOpen} onOpenChange={setExportOpen} onExportCSV={handleExport} onDownloadPDF={handlePDF} reportTitle="Expense" />
      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))} html={reportPreview.html} filename={reportPreview.filename} reportTitle={reportPreview.title} />
    </>
  );
};

export default ReportExpense;
