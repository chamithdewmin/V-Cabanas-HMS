import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Pencil, Trash2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const SalaryManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState([]);
  const [staffCommissionList, setStaffCommissionList] = useState([]);
  const [staffCommissionLoading, setStaffCommissionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    employeeName: '',
    position: '',
    amount: '',
    period: 'monthly',
    notes: '',
  });
  const [commissionRateDialog, setCommissionRateDialog] = useState(null);
  const [commissionRateValue, setCommissionRateValue] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [usersList, setUsersList] = useState([]);

  const loadStaffCommission = async () => {
    if (!isAdmin) return;
    setStaffCommissionLoading(true);
    try {
      const list = await api.salary.staffCommission();
      setStaffCommissionList(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ title: 'Failed to load staff commission', description: err.message || 'Could not fetch', variant: 'destructive' });
      setStaffCommissionList([]);
    } finally {
      setStaffCommissionLoading(false);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const list = await api.salary.list();
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ title: 'Failed to load salary records', description: err.message || 'Could not fetch', variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadStaffCommission();
      api.users.list().then((list) => setUsersList(Array.isArray(list) ? list : [])).catch(() => setUsersList([]));
    }
  }, [isAdmin]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeName.trim() || !form.amount) {
      toast({
        title: 'Missing details',
        description: 'Please enter employee name and amount.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeName: form.employeeName.trim(),
        position: (form.position || '').trim(),
        amount: Number(form.amount),
        period: form.period || 'monthly',
        notes: (form.notes || '').trim(),
      };
      if (editingItem) {
        await api.salary.update(editingItem.id, payload);
        toast({ title: 'Salary updated', description: 'Salary record has been updated.' });
      } else {
        await api.salary.create(payload);
        toast({ title: 'Salary added', description: 'New salary record has been saved.' });
      }
      setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '' });
      setEditingItem(null);
      setIsDialogOpen(false);
      loadItems();
    } catch (err) {
      toast({ title: editingItem ? 'Update failed' : 'Save failed', description: err.message || 'Could not save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      employeeName: item.employeeName || '',
      position: item.position || '',
      amount: String(item.amount ?? ''),
      period: item.period || 'monthly',
      notes: item.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete salary record for "${item.employeeName}"?`)) return;
    try {
      await api.salary.delete(item.id);
      toast({ title: 'Salary deleted', description: `Record for "${item.employeeName}" has been removed.` });
      loadItems();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message || 'Could not delete', variant: 'destructive' });
    }
  };

  const openCommissionRateEdit = (staff) => {
    setCommissionRateDialog(staff);
    setCommissionRateValue(String(staff.commissionRatePct ?? 10));
  };

  const saveCommissionRate = async (e) => {
    e.preventDefault();
    if (commissionRateDialog == null) return;
    const rate = Math.min(100, Math.max(0, parseFloat(commissionRateValue) || 0));
    setSavingCommission(true);
    try {
      const userRow = usersList.find((u) => u.id === commissionRateDialog.userId);
      if (!userRow) {
        toast({ title: 'User not found', variant: 'destructive' });
        return;
      }
      await api.users.update(commissionRateDialog.userId, {
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        commission_rate_pct: rate,
      });
      toast({ title: 'Commission rate updated', description: `${commissionRateDialog.name}'s rate is now ${rate}%.` });
      setCommissionRateDialog(null);
      loadStaffCommission();
    } catch (err) {
      toast({ title: 'Update failed', description: err.message || 'Could not update rate', variant: 'destructive' });
    } finally {
      setSavingCommission(false);
    }
  };

  const filteredItems = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.employeeName || '').toLowerCase().includes(q) ||
      (i.position || '').toLowerCase().includes(q) ||
      (i.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Helmet>
        <title>Salary Management - V Cabanas HMS</title>
        <meta name="description" content="Manage employee salary records" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Salary Management</h1>
            <p className="text-muted-foreground">
              Track and manage employee salary records.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { loadItems(); if (isAdmin) loadStaffCommission(); }} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '' });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Salary
            </Button>
          </div>
        </div>

        {isAdmin && (
          <>
            <div>
              <h2 className="text-xl font-semibold mb-2">Staff commission (Managers &amp; Receptionists)</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Commission earned from bookings. Edit each user&apos;s commission rate below or in User Management.
              </p>
            </div>
            <div className="bg-card rounded-lg border border-secondary overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Commission rate</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Total commission</th>
                      <th className="py-3 pl-8 pr-4 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffCommissionLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          Loading...
                        </td>
                      </tr>
                    ) : staffCommissionList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No managers or receptionists. Add users with those roles to see commission here.
                        </td>
                      </tr>
                    ) : (
                      staffCommissionList.map((s) => (
                        <tr key={s.userId} className="border-b border-secondary hover:bg-secondary/30">
                          <td className="px-4 py-3 text-sm">{s.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{s.email}</td>
                          <td className="px-4 py-3 text-sm capitalize">{s.role}</td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums">{s.commissionRatePct}%</td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">
                            {Number(s.totalCommission).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openCommissionRateEdit(s)}
                              className="gap-1"
                            >
                              <Percent className="w-4 h-4" />
                              Edit rate
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between mt-8">
          <h2 className="text-xl font-semibold">Salary records</h2>
        </div>
        <div className="max-w-xl">
          <Input
            placeholder="Search by employee name, position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Position</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-24">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Period</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                  <th className="py-3 pl-8 pr-4 text-center text-sm font-semibold uppercase min-w-[6rem] w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No salary records yet. Click &quot;Add Salary&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-left">{item.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-left">{item.position || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums min-w-[5rem] w-24 font-medium">
                        {item.amount != null ? Number(item.amount).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-left capitalize">{item.period || '—'}</td>
                      <td className="px-4 py-3 text-sm text-left text-muted-foreground">{item.notes || '—'}</td>
                      <td className="px-4 py-3 text-center align-middle min-w-[6rem] w-28">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-1.5 hover:bg-secondary rounded-md text-green-500 hover:text-green-400"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 hover:bg-secondary rounded-md text-red-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '' });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Salary' : 'Add Salary'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee name</Label>
              <Input
                value={form.employeeName}
                onChange={(e) => handleChange('employeeName', e.target.value)}
                placeholder="Full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Position / Role</Label>
              <Input
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="e.g. Manager, Receptionist"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="Salary amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <select
                className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.period}
                onChange={(e) => handleChange('period', e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingItem ? 'Update Salary' : 'Save Salary'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!commissionRateDialog} onOpenChange={(open) => !open && setCommissionRateDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit commission rate</DialogTitle>
          </DialogHeader>
          {commissionRateDialog && (
            <form onSubmit={saveCommissionRate} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {commissionRateDialog.name} ({commissionRateDialog.email})
              </p>
              <div className="space-y-2">
                <Label>Commission rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commissionRateValue}
                  onChange={(e) => setCommissionRateValue(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCommissionRateDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingCommission}>
                  {savingCommission ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalaryManagement;
