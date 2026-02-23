import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Download, Upload, RefreshCw, Plus, DollarSign, Repeat, PieChart, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Inventory = () => {
  const { expenses, settings, addExpense, updateExpense, deleteExpense, loadData } = useFinance();
  const { toast } = useToast();

  const [form, setForm] = useState({
    category: 'Hosting',
    customCategory: '',
    amount: '',
    date: '',
    paymentMethod: 'cash',
    isRecurring: false,
    notes: '',
    receipt: null,
  });

  const [filters, setFilters] = useState({
    period: 'month',
    category: 'all',
    recurringOnly: false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const exportCSV = () => {
    const headers = ['ID', 'Category', 'Amount', 'Date', 'Recurring', 'Notes'];
    const rows = expenses.map(exp => [
      exp.id,
      exp.category,
      exp.amount,
      exp.date,
      exp.isRecurring ? 'Yes' : 'No',
      (exp.notes || '').replace(/[\r\n]+/g, ' '),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
      a.download = 'expenses.csv';
    a.click();

    toast({
      title: 'Export successful',
      description: 'Expenses exported to CSV',
    });
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      handleFormChange('receipt', null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleFormChange('receipt', {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount) {
      toast({
        title: 'Amount is required',
        description: 'Please enter an expense amount.',
      });
      return;
    }

    const category =
      form.category === 'Custom' && form.customCategory
        ? form.customCategory
        : form.category;

    const payload = {
      category,
      amount: Number(form.amount),
      date: form.date || new Date().toISOString(),
      paymentMethod: form.paymentMethod || 'cash',
      isRecurring: form.isRecurring,
      notes: form.notes,
      receipt: form.receipt,
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, payload);
      toast({ title: 'Expense updated', description: 'Expense record has been updated.' });
      setEditingExpense(null);
    } else {
      addExpense(payload);
      toast({ title: 'Expense added', description: 'New expense record has been saved.' });
    }

    setForm({
      category: 'Hosting',
      customCategory: '',
      amount: '',
      date: '',
      paymentMethod: 'cash',
      isRecurring: false,
      notes: '',
      receipt: null,
    });
    setIsDialogOpen(false);
  };

  const openEdit = (exp) => {
    setEditingExpense(exp);
    const isCustom = !settings.expenseCategories.includes(exp.category);
    setForm({
      category: isCustom ? 'Custom' : exp.category,
      customCategory: isCustom ? exp.category : '',
      amount: String(exp.amount || ''),
      date: exp.date ? exp.date.slice(0, 10) : '',
      paymentMethod: exp.paymentMethod || 'cash',
      isRecurring: exp.isRecurring || false,
      notes: exp.notes || '',
      receipt: exp.receipt || null,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteExpense = (exp) => {
    if (window.confirm(`Delete expense of ${settings.currency} ${exp.amount.toLocaleString()} (${exp.category})?`)) {
      deleteExpense(exp.id);
      toast({ title: 'Expense deleted', description: 'Expense record has been removed.' });
    }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return expenses.filter((exp) => {
      const d = new Date(exp.date);
      if (Number.isNaN(d.getTime())) return false;

      if (filters.period === 'month') {
        if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return false;
      } else if (filters.period === 'year') {
        if (d.getFullYear() !== thisYear) return false;
      }

      if (filters.category !== 'all' && exp.category !== filters.category) {
        return false;
      }

      if (filters.recurringOnly && !exp.isRecurring) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const dateStr = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).toLowerCase();
        const notes = (exp.notes || '').toLowerCase();
        if (
          !exp.category.toLowerCase().includes(q) &&
          !notes.includes(q) &&
          !dateStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, filters, searchQuery]);

  const totalFilteredExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let total = 0;
    let recurring = 0;
    let oneTime = 0;

    expenses.forEach((exp) => {
      const d = new Date(exp.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;

      total += exp.amount;
      if (exp.isRecurring) recurring += exp.amount;
      else oneTime += exp.amount;
    });

    return { total, recurring, oneTime };
  }, [expenses]);

  return (
    <>
      <Helmet>
        <title>Expenses - MyAccounts</title>
        <meta name="description" content="Track and manage all business expenses" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">
              Track and manage all business expenses and costs.
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
                  toast({
                    title: 'Refreshed',
                    description: 'Expense data has been refreshed.',
                  });
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
            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total Expenses
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Recurring
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.recurring.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Essential subscriptions & tools</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                One-time
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.oneTime.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Single purchases</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <div className="max-w-xl">
          <div className="relative">
            <Input
              placeholder="Search by category, notes, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3"
            />
          </div>
        </div>

        {/* Filters and table */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <select
                className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
                value={filters.period}
                onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
              >
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="all">All time</option>
              </select>
              <select
                className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="all">All categories</option>
                {settings.expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.recurringOnly}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, recurringOnly: e.target.checked }))
                  }
                  className="rounded border-secondary bg-secondary text-primary focus:ring-primary"
                />
                <span>Recurring only</span>
              </label>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-secondary overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Recurring</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Receipt</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp, index) => (
                    <motion.tr
                      key={exp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(exp.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">{exp.category}</td>
                      <td className="px-4 py-3 text-sm capitalize">
                        {(exp.paymentMethod || 'cash').replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {exp.isRecurring ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {exp.receipt?.dataUrl ? (
                          <a
                            href={exp.receipt.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Upload className="w-3 h-3" />
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {settings.currency} {exp.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(exp)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No expenses found for the selected filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add expense dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingExpense(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <select
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
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
                    placeholder="Custom category name"
                    className="mt-2"
                    value={form.customCategory}
                    onChange={(e) => handleFormChange('customCategory', e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount ({settings.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <select
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.paymentMethod}
                  onChange={(e) => handleFormChange('paymentMethod', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="online_payment">Online Payment</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Receipt (image/PDF)
                </Label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptChange}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-secondary file:text-foreground
                    hover:file:bg-secondary/80"
                />
                {form.receipt && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {form.receipt.name}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) => handleFormChange('isRecurring', e.target.checked)}
                    className="rounded border-secondary bg-secondary text-primary focus:ring-primary"
                  />
                  <span>Recurring monthly expense (e.g. tools, subscriptions)</span>
                </Label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Notes</Label>
                <textarea
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                  placeholder="Optional notes about this expense"
                  value={form.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingExpense ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Inventory;