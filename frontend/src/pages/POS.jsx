import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Search, DollarSign, Wallet, CreditCard, Download, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const POS = () => {
  const { incomes, clients, addIncome, updateIncome, deleteIncome, settings, loadData } = useFinance();
  const { toast } = useToast();

  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    serviceType: '',
    paymentMethod: 'cash',
    amount: '',
    date: '',
    notes: '',
  });

  const [filters, setFilters] = useState({
    search: '',
    period: 'month', // month | year | all
    paymentMethod: 'all',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount) {
      toast({
        title: 'Amount is required',
        description: 'Please enter an income amount.',
      });
      return;
    }

    const selectedClient =
      clients.find((c) => c.id === form.clientId) || null;

    const payload = {
      clientId: selectedClient?.id || null,
      clientName: selectedClient?.name || form.clientName,
      serviceType: form.serviceType,
      paymentMethod: form.paymentMethod,
      amount: Number(form.amount),
      date: form.date || new Date().toISOString(),
      notes: form.notes,
    };

    if (editingIncome) {
      updateIncome(editingIncome.id, payload);
      toast({ title: 'Income updated', description: 'Income record has been updated.' });
      setEditingIncome(null);
    } else {
      addIncome(payload);
      toast({ title: 'Income added', description: 'New income record has been saved.' });
    }

    setForm({
      clientId: '',
      clientName: '',
      serviceType: '',
      paymentMethod: 'cash',
      amount: '',
      date: '',
      notes: '',
    });
    setIsDialogOpen(false);
  };

  const openEdit = (income) => {
    setEditingIncome(income);
    setForm({
      clientId: income.clientId || '',
      clientName: income.clientName || '',
      serviceType: income.serviceType || '',
      paymentMethod: income.paymentMethod || 'cash',
      amount: String(income.amount || ''),
      date: income.date ? income.date.slice(0, 10) : '',
      notes: income.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteIncome = (income) => {
    if (window.confirm(`Delete income of ${settings.currency} ${income.amount.toLocaleString()} from ${income.clientName || 'Unknown'}?`)) {
      deleteIncome(income.id);
      toast({ title: 'Income deleted', description: 'Income record has been removed.' });
    }
  };

  const filteredIncomes = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return incomes.filter((income) => {
      const d = new Date(income.date);
      if (Number.isNaN(d.getTime())) return false;

      if (filters.period === 'month') {
        if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return false;
      } else if (filters.period === 'year') {
        if (d.getFullYear() !== thisYear) return false;
      }

      if (filters.paymentMethod !== 'all' && income.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = `${income.clientName} ${income.serviceType}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [incomes, filters]);

  const totalFilteredIncome = useMemo(
    () => filteredIncomes.reduce((sum, i) => sum + i.amount, 0),
    [filteredIncomes],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let total = 0;
    let cash = 0;
    let nonCash = 0;

    incomes.forEach((inc) => {
      const d = new Date(inc.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;

      total += inc.amount;
      if (inc.paymentMethod === 'cash') cash += inc.amount;
      else nonCash += inc.amount;
    });

    return { total, cash, nonCash };
  }, [incomes]);

  const exportCSV = () => {
    const headers = ['ID', 'Client', 'Service', 'Amount', 'Payment Method', 'Date', 'Notes'];
    const rows = incomes.map((inc) => [
      inc.id,
      inc.clientName,
      inc.serviceType,
      inc.amount,
      inc.paymentMethod,
      inc.date,
      (inc.notes || '').replace(/[\r\n]+/g, ' '),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'income.csv';
    a.click();

    toast({
      title: 'Export successful',
      description: 'Income exported to CSV',
    });
  };

  return (
    <>
      <Helmet>
        <title>Income - MyAccounts</title>
        <meta name="description" content="Manage all money coming into your business" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Income Management</h1>
            <p className="text-muted-foreground">
              Track client payments, services, and cash inflow.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                loadData();
                toast({
                  title: 'Refreshed',
                  description: 'Income data has been refreshed.',
                });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Income
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
                Total Income
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-black dark:text-white stroke-2" />
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
                Cash Income
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.cash.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Payments received in cash</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
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
                Non‑cash Income
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.nonCash.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Bank & online payments</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <div className="max-w-xl">
          <div className="relative">
            <Input
              placeholder="Search by client, service, or date..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-3"
            />
          </div>
        </div>

        {/* Filters & list */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <select
                className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
              >
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="all">All time</option>
              </select>
              <select
                className="px-3 py-2 bg-card border border-secondary rounded-lg text-sm"
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              >
                <option value="all">All payment methods</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-secondary overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.map((income, index) => (
                    <motion.tr
                      key={income.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(income.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">{income.clientName || '—'}</td>
                      <td className="px-4 py-3 text-sm">{income.serviceType || '—'}</td>
                      <td className="px-4 py-3 text-sm capitalize">{income.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {settings.currency} {income.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(income)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIncome(income)}
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
            {filteredIncomes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No income records found for the selected filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add income dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingIncome(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client</Label>
                <select
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                >
                  <option value="">Select existing client (optional)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Or type client name manually"
                  value={form.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Service Type</Label>
                <Input
                  placeholder="e.g. Web development, Design, Software"
                  value={form.serviceType}
                  onChange={(e) => handleChange('serviceType', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount ({settings.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <select
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Notes</Label>
                <textarea
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                  placeholder="Optional notes about this payment"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingIncome ? 'Update Income' : 'Save Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default POS;