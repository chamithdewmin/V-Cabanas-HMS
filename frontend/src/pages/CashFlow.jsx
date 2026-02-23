import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Search,
  Download,
  RefreshCw,
  Pencil,
  Trash2,
  Repeat,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const SORT_OPTIONS = [
  { value: 'date-asc', label: 'Date (oldest first)' },
  { value: 'date-desc', label: 'Date (newest first)' },
  { value: 'amount-desc', label: 'Amount (highest first)' },
  { value: 'amount-asc', label: 'Amount (lowest first)' },
];

const CashFlow = () => {
  const {
    incomes,
    expenses,
    invoices,
    clients,
    settings,
    addIncome,
    addExpense,
    updateIncome,
    updateExpense,
    deleteIncome,
    deleteExpense,
    updateInvoiceStatus,
    loadData,
  } = useFinance();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    type: 'all', // all | inflow | outflow | upcoming
    category: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sort: 'date-desc',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState('inflow'); // inflow | outflow
  const [editingTx, setEditingTx] = useState(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [form, setForm] = useState({
    source: '',
    category: '',
    customCategory: '',
    amount: '',
    date: '',
    notes: '',
    isRecurring: false,
    clientId: '',
    // Recurring (inflow)
    isRecurringInflow: false,
    recurringFrequency: 'monthly',
    recurringEndDate: '',
    continueIndefinitely: true,
    recurringNotes: '',
  });

  // Build unified transaction list from incomes, expenses, unpaid invoices
  const allTransactions = useMemo(() => {
    const txList = [];

    incomes.forEach((i) => {
      txList.push({
        id: i.id,
        type: 'inflow',
        date: i.date,
        source: i.clientName || 'Unknown',
        category: i.serviceType || 'Sales',
        amount: i.amount,
        status: 'received',
        notes: i.notes,
        isRecurring: Boolean(i.isRecurring),
        raw: i,
        sourceType: 'income',
      });
    });

    expenses.forEach((e) => {
      txList.push({
        id: e.id,
        type: 'outflow',
        date: e.date,
        source: e.category,
        category: e.category,
        amount: e.amount,
        status: 'paid',
        notes: e.notes,
        isRecurring: e.isRecurring || false,
        raw: e,
        sourceType: 'expense',
      });
    });

    invoices
      .filter((inv) => inv.status !== 'paid')
      .forEach((inv) => {
        const dueDate = inv.dueDate || inv.createdAt;
        const d = new Date(dueDate);
        const now = new Date();
        const status = d < now ? 'overdue' : 'pending';
        txList.push({
          id: inv.id,
          type: 'outflow',
          date: dueDate,
          source: inv.clientName || 'Unknown',
          category: 'Invoice',
          amount: Number(inv.total) || 0,
          status,
          notes: inv.notes,
          isRecurring: false,
          raw: inv,
          sourceType: 'invoice',
        });
      });

    return txList;
  }, [incomes, expenses, invoices]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    let list = [...allTransactions];
    const [sortField, sortDir] = filters.sort.split('-');

    list.sort((a, b) => {
      if (sortField === 'date') {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      }
      if (sortField === 'amount') {
        const amtA = a.type === 'inflow' ? a.amount : -a.amount;
        const amtB = b.type === 'inflow' ? b.amount : -b.amount;
        return sortDir === 'asc' ? amtA - amtB : amtB - amtA;
      }
      return 0;
    });
    return list;
  }, [allTransactions, filters.sort]);

  // Next month date range for "upcoming" filter
  const nextMonthRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    return { start, end };
  }, []);

  // Generate projected recurring transactions for next month (when "upcoming" filter)
  const upcomingRecurringTransactions = useMemo(() => {
    const { start, end } = nextMonthRange;
    const list = [];

    const getOccurrences = (item) => {
      const base = new Date(item.date);
      const freq = item.recurringFrequency || 'monthly';
      const endDate = item.recurringEndDate ? new Date(item.recurringEndDate) : null;
      const occurrences = [];

      if (freq === 'monthly') {
        const day = Math.min(base.getDate(), 28);
        const d = new Date(start.getFullYear(), start.getMonth(), day);
        if (d >= start && d <= end && (!endDate || d <= endDate)) {
          occurrences.push(d.toISOString());
        }
      } else if (freq === 'weekly') {
        let d = new Date(base);
        while (d < start) d.setDate(d.getDate() + 7);
        while (d <= end) {
          if (!endDate || d <= endDate) occurrences.push(d.toISOString());
          d.setDate(d.getDate() + 7);
        }
      } else if (freq === 'yearly') {
        if (base.getMonth() === start.getMonth()) {
          const day = Math.min(base.getDate(), 28);
          const d = new Date(start.getFullYear(), start.getMonth(), day);
          if (d >= start && d <= end && (!endDate || d <= endDate)) {
            occurrences.push(d.toISOString());
          }
        }
      }
      return occurrences;
    };

    incomes
      .filter((i) => i.isRecurring)
      .forEach((i) => {
        getOccurrences(i).forEach((dateStr) => {
          list.push({
            id: `recurring-inc-${i.id}-${dateStr}`,
            type: 'inflow',
            date: dateStr,
            source: i.clientName || 'Unknown',
            category: i.serviceType || 'Sales',
            amount: i.amount,
            status: 'upcoming',
            notes: i.recurringNotes || i.notes,
            isRecurring: true,
            raw: i,
            sourceType: 'income',
            isProjected: true,
          });
        });
      });

    expenses
      .filter((e) => e.isRecurring)
      .forEach((e) => {
        getOccurrences(e).forEach((dateStr) => {
          list.push({
            id: `recurring-exp-${e.id}-${dateStr}`,
            type: 'outflow',
            date: dateStr,
            source: e.category,
            category: e.category,
            amount: e.amount,
            status: 'upcoming',
            notes: e.recurringNotes || e.notes,
            isRecurring: true,
            raw: e,
            sourceType: 'expense',
            isProjected: true,
          });
        });
      });

    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [incomes, expenses, nextMonthRange]);

  // Filter transactions (or use upcoming recurring when filter is "upcoming")
  const filteredTransactions = useMemo(() => {
    if (filters.type === 'upcoming') {
      let list = [...upcomingRecurringTransactions];
      if (filters.category !== 'all') list = list.filter((tx) => tx.category === filters.category);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter((tx) => {
          const haystack = `${tx.source} ${tx.category} ${tx.notes}`.toLowerCase();
          return haystack.includes(q);
        });
      }
      return list;
    }

    return sortedTransactions.filter((tx) => {
      if (filters.type === 'inflow' && tx.type !== 'inflow') return false;
      if (filters.type === 'outflow' && tx.type !== 'outflow') return false;
      if (filters.category !== 'all' && tx.category !== filters.category) return false;
      if (filters.status !== 'all' && tx.status !== filters.status) return false;

      const d = new Date(tx.date);
      if (filters.dateFrom && d < new Date(filters.dateFrom + 'T00:00:00')) return false;
      if (filters.dateTo && d > new Date(filters.dateTo + 'T23:59:59')) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = `${tx.source} ${tx.category} ${tx.notes}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    filters.type,
    filters.category,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    searchQuery,
    sortedTransactions,
    upcomingRecurringTransactions,
  ]);

  // Running balance (only received inflows and paid outflows affect balance)
  const transactionsWithBalance = useMemo(() => {
    const affectsBalance = (tx) =>
      (tx.type === 'inflow' && tx.status === 'received') ||
      (tx.type === 'outflow' && (tx.status === 'paid' || tx.sourceType === 'expense'));

    let balance = 0;
    return filteredTransactions.map((tx) => {
      if (affectsBalance(tx)) {
        balance += tx.type === 'inflow' ? tx.amount : -tx.amount;
      }
      return { ...tx, runningBalance: affectsBalance(tx) ? balance : null };
    });
  }, [filteredTransactions]);

  // Summary totals (for filtered view)
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'inflow' && tx.status === 'received') totalIn += tx.amount;
      if (tx.type === 'outflow' && (tx.status === 'paid' || tx.sourceType === 'expense')) totalOut += tx.amount;
      if (tx.type === 'outflow' && tx.sourceType === 'invoice' && tx.status !== 'paid') totalOut += 0; // pending doesn't count yet
    });
    const netCashFlow = totalIn - totalOut;

    // Current cash = all received income - all paid expenses (full dataset)
    let currentCash = 0;
    incomes.forEach((i) => (currentCash += i.amount));
    expenses.forEach((e) => (currentCash -= e.amount));

    return { totalIn, totalOut, netCashFlow, currentCash };
  }, [filteredTransactions, incomes, expenses]);

  // Upcoming payments (pending + overdue)
  const upcomingPayments = useMemo(() => {
    return allTransactions.filter(
      (tx) => tx.type === 'outflow' && (tx.status === 'pending' || tx.status === 'overdue')
    );
  }, [allTransactions]);

  const upcomingTotal = useMemo(
    () => upcomingPayments.reduce((s, t) => s + t.amount, 0),
    [upcomingPayments]
  );

  const showAlert =
    upcomingTotal > 0 && summary.currentCash < upcomingTotal;

  // Chart data (by day/week/month)
  const chartData = useMemo(() => {
    const map = new Map();
    const addToMap = (dateIso, inflow, outflow) => {
      const d = new Date(dateIso);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const existing = map.get(key) || { date: label, inflow: 0, outflow: 0 };
      existing.inflow += inflow;
      existing.outflow += outflow;
      map.set(key, existing);
    };

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'inflow' && tx.status === 'received') {
        addToMap(tx.date, tx.amount, 0);
      } else if (tx.type === 'outflow' && (tx.status === 'paid' || tx.sourceType === 'expense')) {
        addToMap(tx.date, 0, tx.amount);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([, v]) => v);
  }, [filteredTransactions]);

  const allCategories = useMemo(() => {
    const cats = new Set(['Sales', 'Invoice']);
    incomes.forEach((i) => i.serviceType && cats.add(i.serviceType));
    expenses.forEach((e) => e.category && cats.add(e.category));
    return Array.from(cats).sort();
  }, [incomes, expenses]);

  const openAdd = (type) => {
    setAddType(type);
    setForm({
      source: '',
      category: type === 'inflow' ? 'Sales' : settings.expenseCategories[0] || 'Other',
      customCategory: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'cash',
      notes: '',
      isRecurring: false,
      clientId: '',
      isRecurringInflow: false,
      recurringFrequency: 'monthly',
      recurringEndDate: '',
      continueIndefinitely: true,
      recurringNotes: '',
    });
    setEditingTx(null);
    setIsAddOpen(true);
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setAddType(tx.type);
    if (tx.sourceType === 'income') {
      setForm({
        source: tx.raw.clientName || '',
        category: tx.raw.serviceType || 'Sales',
        amount: String(tx.amount),
        date: tx.date ? tx.date.slice(0, 10) : '',
        paymentMethod: tx.raw.paymentMethod || 'cash',
        notes: tx.raw.notes || '',
        isRecurring: false,
        clientId: tx.raw.clientId || '',
        isRecurringInflow: tx.raw.isRecurring || false,
        recurringFrequency: tx.raw.recurringFrequency || 'monthly',
        recurringEndDate: tx.raw.recurringEndDate ? tx.raw.recurringEndDate.slice(0, 10) : '',
        continueIndefinitely: !tx.raw.recurringEndDate,
        recurringNotes: tx.raw.recurringNotes || '',
      });
    } else if (tx.sourceType === 'expense') {
      const isCustom = !settings.expenseCategories.includes(tx.category);
      setForm({
        source: tx.category,
        category: isCustom ? 'Custom' : tx.category,
        customCategory: isCustom ? tx.category : '',
        amount: String(tx.amount),
        date: tx.date ? tx.date.slice(0, 10) : '',
        paymentMethod: tx.raw.paymentMethod || 'cash',
        notes: tx.raw.notes || '',
        isRecurring: tx.raw.isRecurring || false,
        clientId: '',
        recurringFrequency: tx.raw.recurringFrequency || 'monthly',
        recurringEndDate: tx.raw.recurringEndDate ? tx.raw.recurringEndDate.slice(0, 10) : '',
        continueIndefinitely: !tx.raw.recurringEndDate,
        recurringNotes: tx.raw.recurringNotes || '',
      });
    }
    setIsAddOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount.' });
      return;
    }

    const amount = Number(form.amount);
    const date = form.date ? new Date(form.date + 'T12:00:00').toISOString() : new Date().toISOString();

    if (addType === 'inflow') {
      if (editingTx?.sourceType === 'income') {
        updateIncome(editingTx.id, {
          clientName: form.source,
          serviceType: form.category,
          amount,
          date,
          paymentMethod: form.paymentMethod || 'cash',
          notes: form.notes,
          isRecurringInflow: form.isRecurringInflow,
          recurringFrequency: form.recurringFrequency,
          continueIndefinitely: form.continueIndefinitely,
          recurringEndDate: form.recurringEndDate,
          recurringNotes: form.recurringNotes,
        });
        toast({ title: 'Income updated', description: 'Transaction has been updated.' });
      } else {
        addIncome({
          clientId: form.clientId || null,
          clientName: form.source,
          serviceType: form.category,
          amount,
          date,
          paymentMethod: form.paymentMethod || 'cash',
          notes: form.notes,
          isRecurringInflow: form.isRecurringInflow,
          recurringFrequency: form.recurringFrequency,
          continueIndefinitely: form.continueIndefinitely,
          recurringEndDate: form.recurringEndDate,
          recurringNotes: form.recurringNotes,
        });
        toast({ title: 'Income added', description: 'Money in has been recorded.' });
      }
    } else {
      const category =
        form.category === 'Custom' && form.customCategory
          ? form.customCategory
          : form.category;
      if (editingTx?.sourceType === 'expense') {
        updateExpense(editingTx.id, {
          category,
          amount,
          date,
          paymentMethod: form.paymentMethod || 'cash',
          notes: form.notes,
          isRecurring: form.isRecurring,
          recurringFrequency: form.recurringFrequency,
          continueIndefinitely: form.continueIndefinitely,
          recurringEndDate: form.recurringEndDate,
          recurringNotes: form.recurringNotes,
        });
        toast({ title: 'Expense updated', description: 'Transaction has been updated.' });
      } else {
        addExpense({
          category,
          amount,
          date,
          paymentMethod: form.paymentMethod || 'cash',
          notes: form.notes,
          isRecurring: form.isRecurring,
          recurringFrequency: form.recurringFrequency,
          continueIndefinitely: form.continueIndefinitely,
          recurringEndDate: form.recurringEndDate,
          recurringNotes: form.recurringNotes,
        });
        toast({ title: 'Expense added', description: 'Money out has been recorded.' });
      }
    }
    setIsAddOpen(false);
    setEditingTx(null);
  };

  const handleDelete = (tx) => {
    if (tx.sourceType === 'invoice') {
      if (window.confirm('Mark this invoice as paid instead of deleting?')) {
        updateInvoiceStatus(tx.id, 'paid');
        toast({ title: 'Invoice marked paid', description: 'Payment recorded.' });
      }
      return;
    }
    const msg =
      tx.sourceType === 'income'
        ? `Delete income of ${settings.currency} ${tx.amount.toLocaleString()}?`
        : `Delete expense of ${settings.currency} ${tx.amount.toLocaleString()}?`;
    if (window.confirm(msg)) {
      if (tx.sourceType === 'income') deleteIncome(tx.id);
      else deleteExpense(tx.id);
      toast({ title: 'Deleted', description: 'Transaction has been removed.' });
    }
  };

  const handleMarkPaid = (tx) => {
    if (tx.sourceType === 'invoice') {
      updateInvoiceStatus(tx.id, 'paid');
      toast({ title: 'Invoice marked paid', description: 'Payment recorded.' });
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Source', 'Category', 'Amount', 'Status', 'Balance', 'Notes'];
    const rows = transactionsWithBalance.map((t) => [
      t.date,
      t.type,
      t.source,
      t.category,
      t.type === 'inflow' ? `+${t.amount}` : `-${t.amount}`,
      t.status,
      t.runningBalance ?? '',
      (t.notes || '').replace(/[\r\n]+/g, ' '),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash-flow.csv';
    a.click();
    toast({ title: 'Export successful', description: 'Cash flow exported to CSV.' });
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <Helmet>
        <title>Cash Flow - MyAccounts</title>
        <meta name="description" content="Track money in, money out, and running cash balance" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cash Flow</h1>
            <p className="text-muted-foreground">
              When money comes in, when it goes out, and upcoming payments.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={refreshLoading}
              onClick={async () => {
                setRefreshLoading(true);
                try {
                  await loadData();
                  toast({ title: 'Refreshed', description: 'Data refreshed.' });
                } finally {
                  setRefreshLoading(false);
                }
              }}
            >
              {refreshLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => openAdd('inflow')} className="bg-green-600 hover:bg-green-700">
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Add Inflow
            </Button>
            <Button onClick={() => openAdd('outflow')} variant="destructive">
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Add Outflow
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Money In</p>
              <p className="text-2xl font-bold text-green-500">
                {settings.currency} {summary.totalIn.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-green-500" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Money Out</p>
              <p className="text-2xl font-bold text-red-500">
                {settings.currency} {summary.totalOut.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net Cash Flow</p>
              <p
                className={`text-2xl font-bold ${
                  summary.netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {settings.currency} {summary.netCashFlow.toLocaleString()}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Cash</p>
              <p
                className={`text-2xl font-bold ${
                  summary.currentCash >= 0 ? 'text-primary' : 'text-red-500'
                }`}
              >
                {settings.currency} {summary.currentCash.toLocaleString()}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Alert */}
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              You have {settings.currency} {upcomingTotal.toLocaleString()} going out in upcoming payments but only{' '}
              {settings.currency} {summary.currentCash.toLocaleString()} available.
            </p>
          </motion.div>
        )}

        {/* Mini chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-6 border border-secondary"
          >
            <h2 className="text-lg font-bold mb-4">Inflow vs Outflow</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Bar dataKey="inflow" fill="#22c55e" name="Inflow" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" fill="#ef4444" name="Outflow" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Search */}
        <div className="max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by source, category, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
            value={filters.type}
            onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="all">All (In & Out)</option>
            <option value="inflow">Inflows only</option>
            <option value="outflow">Outflows only</option>
            <option value="upcoming">Upcoming (next month)</option>
          </select>
          <select
            className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
            value={filters.category}
            onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
          >
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="all">All statuses</option>
            <option value="received">Received</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          <Input
            type="date"
            className="w-auto px-3 py-2"
            value={filters.dateFrom}
            onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
            placeholder="From"
          />
          <Input
            type="date"
            className="w-auto px-3 py-2"
            value={filters.dateTo}
            onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
            placeholder="To"
          />
          <select
            className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
            value={filters.sort}
            onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Source / Recipient</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithBalance.map((tx, index) => (
                  <motion.tr
                    key={`${tx.sourceType}-${tx.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`border-b border-secondary transition-colors ${
                      (() => {
                        const d = new Date(tx.date);
                        return d >= nextMonthRange.start && d <= nextMonthRange.end
                          ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                          : 'hover:bg-secondary/50';
                      })()
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {tx.type === 'inflow' ? (
                          <ArrowUpCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        {tx.source}
                        {tx.isRecurring && <Repeat className="w-3 h-3 text-muted-foreground" title="Recurring" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      <span className={tx.type === 'inflow' ? 'text-green-500' : 'text-red-500'}>
                        {tx.type === 'inflow' ? '+' : '-'}
                        {settings.currency} {tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          tx.status === 'received' || tx.status === 'paid'
                            ? 'bg-green-500/20 text-green-500'
                            : tx.status === 'overdue'
                            ? 'bg-red-500/20 text-red-500'
                            : tx.status === 'upcoming'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      {tx.runningBalance !== null
                        ? `${settings.currency} ${tx.runningBalance.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate">
                      {tx.notes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {tx.isProjected ? (
                          <span className="text-xs text-muted-foreground">Projected</span>
                        ) : tx.sourceType === 'invoice' && tx.status !== 'paid' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(tx)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500"
                            title="Mark as Paid"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>
                        ) : tx.sourceType !== 'invoice' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(tx)}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tx)}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactionsWithBalance.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {filters.type === 'upcoming'
                ? 'No recurring income or expenses scheduled for next month.'
                : 'No transactions found for the selected filters.'}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit transaction dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditingTx(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTx ? 'Edit Transaction' : addType === 'inflow' ? 'Add Money In' : 'Add Money Out'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {addType === 'inflow' ? (
              <>
                <div className="space-y-2">
                  <Label>Source / Client</Label>
                  <select
                    className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm"
                    value={form.clientId}
                    onChange={(e) => {
                      const c = clients.find((x) => x.id === e.target.value);
                      setForm((p) => ({
                        ...p,
                        clientId: e.target.value,
                        source: c ? c.name : p.source,
                      }));
                    }}
                  >
                    <option value="">Select client or type below</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Or type source name"
                    value={form.source}
                    onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category / Service Type</Label>
                  <Input
                    placeholder="e.g. Sales, Design, Consulting"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm"
                    value={form.paymentMethod}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="online_transfer">Online Transfer</option>
                    <option value="online_payment">Online Payment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isRecurringInflow}
                      onChange={(e) => setForm((p) => ({ ...p, isRecurringInflow: e.target.checked }))}
                      className="rounded border-secondary bg-secondary text-primary focus:ring-primary"
                    />
                    Recurring income
                  </Label>
                </div>
                {form.isRecurringInflow && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <select
                        className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm"
                        value={form.recurringFrequency}
                        onChange={(e) => setForm((p) => ({ ...p, recurringFrequency: e.target.value }))}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.continueIndefinitely}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                continueIndefinitely: e.target.checked,
                                recurringEndDate: e.target.checked ? '' : p.recurringEndDate,
                              }))
                            }
                            className="rounded border-secondary"
                          />
                          Continue indefinitely
                        </label>
                        {!form.continueIndefinitely && (
                          <Input
                            type="date"
                            value={form.recurringEndDate}
                            onChange={(e) => setForm((p) => ({ ...p, recurringEndDate: e.target.value }))}
                            className="flex-1"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        placeholder="e.g. Monthly Rent, WiFi Bill, Retainer"
                        value={form.recurringNotes}
                        onChange={(e) => setForm((p) => ({ ...p, recurringNotes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Recipient / Category</Label>
                  <select
                    className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm"
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        category: e.target.value,
                        customCategory: e.target.value === 'Custom' ? p.customCategory : '',
                      }))
                    }
                  >
                    {settings.expenseCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Custom">Custom...</option>
                  </select>
                  {form.category === 'Custom' && (
                    <Input
                      placeholder="Custom category name (e.g. Rent, Salary)"
                      value={form.customCategory}
                      onChange={(e) => setForm((p) => ({ ...p, customCategory: e.target.value }))}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm"
                    value={form.paymentMethod}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="online_payment">Online Payment</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) => setForm((p) => ({ ...p, isRecurring: e.target.checked }))}
                      className="rounded border-secondary bg-secondary text-primary focus:ring-primary"
                    />
                    Recurring (rent, subscriptions)
                  </Label>
                </div>
                {form.isRecurring && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <select
                        className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm"
                        value={form.recurringFrequency}
                        onChange={(e) => setForm((p) => ({ ...p, recurringFrequency: e.target.value }))}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.continueIndefinitely}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                continueIndefinitely: e.target.checked,
                                recurringEndDate: e.target.checked ? '' : p.recurringEndDate,
                              }))
                            }
                            className="rounded border-secondary"
                          />
                          Continue indefinitely
                        </label>
                        {!form.continueIndefinitely && (
                          <Input
                            type="date"
                            value={form.recurringEndDate}
                            onChange={(e) => setForm((p) => ({ ...p, recurringEndDate: e.target.value }))}
                            className="flex-1"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        placeholder="e.g. Monthly Rent, WiFi Bill"
                        value={form.recurringNotes}
                        onChange={(e) => setForm((p) => ({ ...p, recurringNotes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount ({settings.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm min-h-[60px]"
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTx ? 'Update' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CashFlow;
