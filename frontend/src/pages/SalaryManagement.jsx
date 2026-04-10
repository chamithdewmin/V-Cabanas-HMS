import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPillActions,
  DialogPillPrimaryButton,
  DialogPillSecondaryButton,
} from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const SALARY_PERIOD_LABELS = {
  always: 'Every booking',
  monthly: 'Monthly',
  weekly: 'Weekly',
};
const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function formatSalaryPeriod(p) {
  if (p == null || p === '') return '—';
  const key = String(p).toLowerCase();
  return SALARY_PERIOD_LABELS[key] || String(p);
}

const SalaryManagement = () => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState([]);
  const [staffCommissionList, setStaffCommissionList] = useState([]);
  const [staffCommissionLoading, setStaffCommissionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const salaryFormInitial = () => ({
    linkedUserId: '',
    employeeName: '',
    position: '',
    amount: '',
    period: 'monthly',
    notes: '',
    commissionRatePct: '',
  });

  const [form, setForm] = useState(salaryFormInitial);

  const closeSalaryDialog = () => {
    setForm(salaryFormInitial());
    setEditingItem(null);
    setIsDialogOpen(false);
  };
  const [usersList, setUsersList] = useState([]);
  const yearOptions = React.useMemo(() => {
    const y = new Date().getFullYear();
    const years = [];
    for (let i = y - 5; i <= y + 1; i += 1) years.push(i);
    return years;
  }, []);

  const loadStaffCommission = async () => {
    if (!isAdmin) return;
    setStaffCommissionLoading(true);
    try {
      const list = await api.salary.staffCommission({
        year: selectedYear,
        month: selectedMonth,
      });
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
    api.users.list().then((list) => setUsersList(Array.isArray(list) ? list : [])).catch(() => setUsersList([]));
  }, []);

  useEffect(() => {
    if (isAdmin) loadStaffCommission();
  }, [isAdmin, selectedYear, selectedMonth]);

  const assignableUsers = React.useMemo(
    () => usersList.filter((u) => (u.role || '').toLowerCase() !== 'admin'),
    [usersList]
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmployeeSelect = (userIdStr) => {
    if (!userIdStr) {
      setForm((prev) => ({
        ...prev,
        linkedUserId: '',
        employeeName: '',
        position: '',
        commissionRatePct: '',
      }));
      return;
    }
    const u = assignableUsers.find((x) => String(x.id) === userIdStr);
    if (!u) return;
    setForm((prev) => ({
      ...prev,
      linkedUserId: userIdStr,
      employeeName: u.name || '',
      position: u.role || 'receptionist',
      commissionRatePct:
        u.commission_rate_pct != null ? String(u.commission_rate_pct) : '10',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isLegacySalary = Boolean(editingItem && !editingItem.linkedUserId);
    if (!editingItem && !form.linkedUserId && !isLegacySalary) {
      toast({
        title: 'Select an employee',
        description: 'Choose a staff member (admin accounts cannot be selected).',
        variant: 'destructive',
      });
      return;
    }
    if (
      form.period !== 'always' &&
      (!form.amount || String(form.amount).trim() === '')
    ) {
      toast({
        title: 'Missing details',
        description: 'Please enter the salary amount (or choose Period: Every booking and use 0 if commission only).',
        variant: 'destructive',
      });
      return;
    }
    if (isLegacySalary && (!form.employeeName.trim() || !form.amount)) {
      toast({
        title: 'Missing details',
        description: 'Please enter employee name and amount.',
        variant: 'destructive',
      });
      return;
    }
    if (
      !isLegacySalary &&
      (form.commissionRatePct === '' ||
        form.commissionRatePct == null ||
        parseFloat(form.commissionRatePct) < 0)
    ) {
      toast({
        title: 'Invalid commission rate',
        description: 'Please enter a valid commission rate (0–100).',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const basePayload = {
        amount: Number(form.amount) || 0,
        period: form.period || 'monthly',
        notes: (form.notes || '').trim(),
      };
      const rate =
        form.commissionRatePct !== '' && form.commissionRatePct != null
          ? Math.min(100, Math.max(0, parseFloat(form.commissionRatePct)))
          : undefined;
      let payload;
      if (isLegacySalary) {
        payload = {
          ...basePayload,
          employeeName: form.employeeName.trim(),
          position: (form.position || '').trim(),
        };
      } else {
        payload = {
          ...basePayload,
          linkedUserId: form.linkedUserId ? Number(form.linkedUserId) : undefined,
          commissionRatePct: rate,
        };
      }
      if (editingItem) {
        await api.salary.update(editingItem.id, payload);
        toast({ title: 'Salary updated', description: 'Salary record has been updated.' });
      } else {
        await api.salary.create(payload);
        toast({ title: 'Salary added', description: 'New salary record has been saved.' });
      }
      setForm(salaryFormInitial());
      setEditingItem(null);
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
    setEditingItem(salaryRecord);
    let crPct = '';
    if (salaryRecord?.linkedUserId) {
      const u = usersList.find((x) => x.id === salaryRecord.linkedUserId);
      crPct = u ? String(u.commission_rate_pct ?? 10) : '10';
    }
    setForm({
      linkedUserId: salaryRecord?.linkedUserId ? String(salaryRecord.linkedUserId) : '',
      employeeName: row.name || salaryRecord?.employeeName || '',
      position: row.roleOrPosition || salaryRecord?.position || '',
      amount: salaryRecord ? String(salaryRecord.amount ?? '') : '',
      period: salaryRecord?.period || 'monthly',
      notes: salaryRecord?.notes || '',
      commissionRatePct: crPct,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSalary = async (item) => {
    const ok = await confirm(
      `Remove "${item.employeeName}" from this list? The user account is not deleted—only this salary/commission record.`,
      {
        title: 'Remove salary record',
        confirmLabel: 'Remove',
        variant: 'destructive',
      },
    );
    if (!ok) return;
    try {
      await api.salary.delete(item.id);
      toast({ title: 'Record removed', description: `"${item.employeeName}" removed from the list. User login is unchanged.` });
      loadItems();
      if (isAdmin) loadStaffCommission();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message || 'Could not delete', variant: 'destructive' });
    }
  };

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
      }));
    }
    const totalsByUserId = new Map(staffCommissionList.map((s) => [s.userId, s]));
    return items.map((item) => {
      if (item.linkedUserId) {
        const stats = totalsByUserId.get(item.linkedUserId);
        const u = usersList.find((x) => x.id === item.linkedUserId);
        const rateFromUser =
          u != null && u.commission_rate_pct != null ? parseFloat(u.commission_rate_pct) : null;
        const rate =
          rateFromUser != null && Number.isFinite(rateFromUser)
            ? rateFromUser
            : stats != null
              ? stats.commissionRatePct
              : null;
        return {
          type: 'linked_salary',
          name: item.employeeName || u?.name || '—',
          email: u?.email || '—',
          roleOrPosition: item.position || u?.role || '',
          commissionRatePct: rate,
          totalCommission: stats != null ? stats.totalCommission : null,
          salaryRecord: item,
        };
      }
      return {
        type: 'salary_only',
        name: item.employeeName,
        email: '',
        roleOrPosition: item.position || '',
        commissionRatePct: null,
        totalCommission: null,
        salaryRecord: item,
      };
    });
  }, [isAdmin, staffCommissionList, items, usersList]);

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
                setForm(salaryFormInitial());
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Salary
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-xl">
            <Input
              placeholder="Search by name, email, position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <>
              <div className="flex items-center gap-2.5">
                <Label htmlFor="salary-year">Year</Label>
                <select
                  id="salary-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 min-w-[7rem] rounded-md border border-secondary bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2.5">
                <Label htmlFor="salary-month">Month</Label>
                <select
                  id="salary-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-10 min-w-[9rem] rounded-md border border-secondary bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse table-auto">
              <colgroup>
                <col className="min-w-[7rem]" />
                {isAdmin && <col className="min-w-[11rem]" />}
                <col className="min-w-[8rem]" />
                {isAdmin && (
                  <>
                    <col className="w-[7.5rem]" />
                    <col className="w-[8.5rem]" />
                  </>
                )}
                <col className="w-[8.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="min-w-[6rem]" />
                <col className="min-w-[12rem]" />
              </colgroup>
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-left">Name</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-left">Email</th>
                  )}
                  <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-left">Role / position</th>
                  {isAdmin && (
                    <>
                      <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-right">Commission rate</th>
                      <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-right">Monthly commission</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-right">Salary amount</th>
                  <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-left">Period</th>
                  <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-left">Notes</th>
                  <th className="px-4 py-3 text-sm font-semibold whitespace-nowrap !text-center">Actions</th>
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
                        title={isAdmin ? 'No salary or commission records yet' : 'No salary records yet'}
                        description={
                          isAdmin
                            ? 'Staff members appear here only after you add them with Add Salary. Deleting a row removes this list entry only—not the user account.'
                            : 'Add your first salary record to get started.'
                        }
                        actionLabel="Add Salary"
                        onAction={() => {
                          setEditingItem(null);
                          setForm(salaryFormInitial());
                          setIsDialogOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row, index) => (
                    <motion.tr
                      key={row.salaryRecord?.id || `row-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 text-sm !text-left align-top">{row.name || '—'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-muted-foreground !text-left align-top max-w-[14rem] truncate" title={row.email || ''}>
                          {row.email || '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm capitalize !text-left align-top">{row.roleOrPosition || '—'}</td>
                      {isAdmin && (
                        <>
                          <td className="px-4 py-3 text-sm tabular-nums !text-right align-top">
                            {row.commissionRatePct != null ? `${row.commissionRatePct}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums font-medium !text-right align-top">
                            {row.totalCommission != null ? Number(row.totalCommission).toLocaleString() : '—'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm tabular-nums font-medium !text-right align-top">
                        {row.salaryRecord?.amount != null ? Number(row.salaryRecord.amount).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm !text-left align-top whitespace-nowrap">
                        {formatSalaryPeriod(row.salaryRecord?.period)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground !text-left align-top">{row.salaryRecord?.notes || '—'}</td>
                      <td className="px-4 py-3 !text-center align-top whitespace-nowrap">
                        <div className="inline-flex flex-wrap items-center justify-center gap-2">
                          {row.salaryRecord && (
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex items-center justify-center p-1.5 min-h-[44px] sm:min-h-0 hover:bg-secondary rounded-md text-green-500 hover:text-green-400 text-sm"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {row.salaryRecord && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSalary(row.salaryRecord)}
                              className="inline-flex items-center justify-center p-1.5 min-h-[44px] sm:min-h-0 hover:bg-secondary rounded-md text-red-500 hover:text-red-400 text-sm"
                              title="Remove this row from the list (does not delete the user account)"
                              aria-label="Remove salary record from list"
                            >
                              <Trash2 className="w-4 h-4" />
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
          if (open) setIsDialogOpen(true);
          else closeSalaryDialog();
        }}
      >
        <DialogContent hideCloseButton className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit salary & commission' : 'Add Salary'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <>
                {editingItem && !editingItem.linkedUserId ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="salary-employee">Employee</Label>
                      <select
                        id="salary-employee"
                        className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={form.linkedUserId}
                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                        required
                      >
                        <option value="">Select staff member (admins excluded)</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Position / Role</Label>
                      <Input readOnly value={form.position} placeholder="From user account" className="opacity-90" />
                    </div>
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
                      <p className="text-xs text-muted-foreground">
                        Saved on this staff member&apos;s account. Commission formula:{' '}
                        <span className="text-foreground/90">(subtotal / 100) × rate</span>, where subtotal is
                        booking price minus Booking.com.
                      </p>
                    </div>
                  </>
                )}
                <>
                    <div className="space-y-2">
                      <Label>Amount{form.period === 'always' ? ' (optional if commission only)' : ''}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => handleChange('amount', e.target.value)}
                        placeholder={form.period === 'always' ? '0 or salary amount' : 'Salary amount'}
                        required={form.period !== 'always'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <select
                        className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={form.period}
                        onChange={(e) => handleChange('period', e.target.value)}
                      >
                        <option value="always">Every booking (commission on each booking)</option>
                        <option value="monthly">Monthly (salary)</option>
                        <option value="weekly">Weekly (salary)</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        {form.period === 'always'
                          ? 'Every booking: commission = (subtotal / 100) × rate. Salary amount can be 0 if you only track commission.'
                          : 'Salary amount is for this pay cycle. Booking commission still uses (subtotal / 100) × rate.'}
                      </p>
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
            </>
            <DialogPillActions>
              <DialogPillPrimaryButton type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Save Salary'}
              </DialogPillPrimaryButton>
              <DialogPillSecondaryButton type="button" onClick={closeSalaryDialog}>
                Close
              </DialogPillSecondaryButton>
            </DialogPillActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalaryManagement;
