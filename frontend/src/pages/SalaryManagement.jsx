import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
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
    commissionRatePct: '',
  });
  const [editingStaffUser, setEditingStaffUser] = useState(null);
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
    const isSalaryMode = editingItem || !editingStaffUser;
    if (isSalaryMode && (!form.employeeName.trim() || !form.amount)) {
      toast({
        title: 'Missing details',
        description: 'Please enter employee name and amount.',
        variant: 'destructive',
      });
      return;
    }
    if (editingStaffUser && (form.commissionRatePct === '' || parseFloat(form.commissionRatePct) < 0)) {
      toast({
        title: 'Invalid commission rate',
        description: 'Please enter a valid commission rate (0–100).',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingItem || isSalaryMode) {
        const payload = {
          employeeName: form.employeeName.trim(),
          position: (form.position || '').trim(),
          amount: Number(form.amount) || 0,
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
      }
      if (editingStaffUser && form.commissionRatePct !== '') {
        const rate = Math.min(100, Math.max(0, parseFloat(form.commissionRatePct) || 0));
        const userRow = usersList.find((u) => u.id === editingStaffUser.userId);
        if (userRow) {
          await api.users.update(editingStaffUser.userId, {
            name: userRow.name,
            email: userRow.email,
            role: userRow.role,
            commission_rate_pct: rate,
          });
          toast({ title: 'Commission rate updated', description: `Rate set to ${rate}%.` });
        }
      }
      setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '', commissionRatePct: '' });
      setEditingItem(null);
      setEditingStaffUser(null);
      setIsDialogOpen(false);
      loadItems();
      if (isAdmin) loadStaffCommission();
    } catch (err) {
      toast({ title: editingItem ? 'Update failed' : 'Save failed', description: err.message || 'Could not save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    const salaryRecord = row.salaryRecord || null;
    const staffUser = row.staffUser || null;
    setEditingItem(salaryRecord);
    setEditingStaffUser(staffUser);
    setForm({
      employeeName: row.name || salaryRecord?.employeeName || '',
      position: row.roleOrPosition || salaryRecord?.position || '',
      amount: salaryRecord ? String(salaryRecord.amount ?? '') : '',
      period: salaryRecord?.period || 'monthly',
      notes: salaryRecord?.notes || '',
      commissionRatePct: staffUser ? String(staffUser.commissionRatePct ?? 10) : '',
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

  const normalizeName = (s) => (s || '').trim().toLowerCase();

  const combinedRows = React.useMemo(() => {
    if (!isAdmin) {
      return items.map((item) => ({
        type: 'salary_only',
        name: item.employeeName,
        email: '',
        roleOrPosition: item.position || '',
        commissionRatePct: null,
        totalCommission: null,
        salaryRecord: item,
        staffUser: null,
      }));
    }
    const rows = [];
    const salaryUsed = new Set();
    staffCommissionList.forEach((s) => {
      const match = items.find(
        (item) => normalizeName(item.employeeName) === normalizeName(s.name)
      );
      if (match) salaryUsed.add(match.id);
      rows.push({
        type: 'staff',
        name: s.name,
        email: s.email,
        roleOrPosition: s.role,
        commissionRatePct: s.commissionRatePct,
        totalCommission: s.totalCommission,
        salaryRecord: match || null,
        staffUser: s,
      });
    });
    items.forEach((item) => {
      if (salaryUsed.has(item.id)) return;
      rows.push({
        type: 'salary_only',
        name: item.employeeName,
        email: '',
        roleOrPosition: item.position || '',
        commissionRatePct: null,
        totalCommission: null,
        salaryRecord: item,
        staffUser: null,
      });
    });
    return rows;
  }, [isAdmin, staffCommissionList, items]);

  const filteredItems = combinedRows.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (row.name || '').toLowerCase().includes(q) ||
      (row.email || '').toLowerCase().includes(q) ||
      (row.roleOrPosition || '').toLowerCase().includes(q) ||
      (row.salaryRecord?.notes || '').toLowerCase().includes(q)
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
                setEditingStaffUser(null);
                setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '', commissionRatePct: '' });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Salary
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Staff &amp; salary</h2>
          <p className="text-muted-foreground text-sm mb-4">
            {isAdmin
              ? 'Commission from bookings and salary records in one place. Match by employee name.'
              : 'Your salary records.'}
          </p>
        </div>
        <div className="max-w-xl">
          <Input
            placeholder="Search by name, email, position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>}
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role / position</th>
                  {isAdmin && (
                    <>
                      <th className="px-4 py-3 text-sm font-semibold w-28 text-right" align="right">Commission rate</th>
                      <th className="px-4 py-3 text-sm font-semibold w-32 text-right" align="right">Total commission</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-sm font-semibold w-28 text-right" align="right">Salary amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold w-24">Period</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading || (isAdmin && staffCommissionLoading) ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 6} className="p-0 align-top">
                      <EmptyState
                        title={isAdmin ? 'No staff or salary records yet' : 'No salary records yet'}
                        description={isAdmin ? 'Add users (Manager/Receptionist) and salary records to get started.' : 'Add your first salary record to get started.'}
                        actionLabel="Add Salary"
                        onAction={() => {
                          setEditingItem(null);
                          setEditingStaffUser(null);
                          setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '', commissionRatePct: '' });
                          setIsDialogOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row, index) => (
                    <motion.tr
                      key={row.staffUser ? `staff-${row.staffUser.userId}` : `salary-${row.salaryRecord?.id}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 text-sm text-left">{row.name || '—'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-muted-foreground text-left">{row.email || '—'}</td>
                      )}
                      <td className="px-4 py-3 text-sm capitalize text-left">{row.roleOrPosition || '—'}</td>
                      {isAdmin && (
                        <>
                          <td className="px-4 py-3 text-sm text-right tabular-nums w-28" align="right">
                            {row.commissionRatePct != null ? `${row.commissionRatePct}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right tabular-nums font-medium w-32" align="right">
                            {row.totalCommission != null ? Number(row.totalCommission).toLocaleString() : '—'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-right tabular-nums w-28 font-medium" align="right">
                        {row.salaryRecord?.amount != null ? Number(row.salaryRecord.amount).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-left w-24">{row.salaryRecord?.period || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground text-left">{row.salaryRecord?.notes || '—'}</td>
                      <td className="px-4 py-3 text-center w-28">
                        <div className="inline-flex items-center justify-center gap-2">
                          {(row.staffUser || row.salaryRecord) && (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center gap-1.5 p-1.5 min-h-[44px] sm:min-h-0 hover:bg-secondary rounded-md text-green-500 hover:text-green-400 text-sm"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                          )}
                          {row.salaryRecord && (
                            <button
                              type="button"
                              onClick={() => handleDelete(row.salaryRecord)}
                              className="inline-flex items-center gap-1.5 p-1.5 min-h-[44px] sm:min-h-0 hover:bg-secondary rounded-md text-red-500 hover:text-red-400 text-sm"
                              title="Delete salary"
                              aria-label="Delete salary"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          )}
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
            setEditingStaffUser(null);
            setForm({ employeeName: '', position: '', amount: '', period: 'monthly', notes: '', commissionRatePct: '' });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStaffUser && !editingItem ? 'Edit commission' : editingItem ? 'Edit salary & commission' : 'Add Salary'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee name</Label>
              <Input
                value={form.employeeName}
                onChange={(e) => handleChange('employeeName', e.target.value)}
                placeholder="Full name"
                readOnly={!!editingStaffUser && !editingItem}
                required={!editingStaffUser || !!editingItem}
              />
            </div>
            <div className="space-y-2">
              <Label>Position / Role</Label>
              <Input
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="e.g. Manager, Receptionist"
                readOnly={!!editingStaffUser && !editingItem}
              />
            </div>
            {(!editingStaffUser || editingItem) && (
              <>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    placeholder="Salary amount"
                    required={!editingStaffUser || !!editingItem}
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
              </>
            )}
            {editingStaffUser && isAdmin && (
              <div className="space-y-2">
                <Label>Commission rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.commissionRatePct}
                  onChange={(e) => handleChange('commissionRatePct', e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">Percentage of booking price earned as commission.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingStaffUser && !editingItem ? 'Update commission' : editingItem ? 'Update' : 'Save Salary'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalaryManagement;
