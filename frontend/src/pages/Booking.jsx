import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Pencil, Trash2, RefreshCw, Eye, CirclePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/EmptyState';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const ALLOWED_ROOM_TYPES = ['double', 'triple'];
const normalizeRoomTypeForForm = (v) => {
  const x = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return ALLOWED_ROOM_TYPES.includes(x) ? x : 'double';
};

const emptyForm = () => ({
  clientId: '',
  customerName: '',
  roomNumber: '',
  adults: '',
  children: '',
  checkIn: '',
  checkOut: '',
  price: '',
  bookingComCommission: '',
  priceUsd: '',
  bookingComCommissionUsd: '',
  roomFeature: 'ac',
  roomType: 'double',
});

const Booking = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  /** Customer through Actions (incl. optional Net column). */
  const tableColSpan = isAdmin ? 13 : 12;
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [pricingList, setPricingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailBooking, setDetailBooking] = useState(null);
  const [addonDialogBooking, setAddonDialogBooking] = useState(null);
  const [addonRows, setAddonRows] = useState([]);
  const [addonSaving, setAddonSaving] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const list = await api.bookings.list();
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ title: 'Failed to load bookings', description: err.message || 'Could not fetch bookings', variant: 'destructive' });
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    api.clients.list().then((list) => setClients(Array.isArray(list) ? list : [])).catch(() => setClients([]));
    api.pricing.list().then((list) => setPricingList(Array.isArray(list) ? list : [])).catch(() => setPricingList([]));
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customerName.trim() || !form.roomNumber.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please enter at least customer name and room number.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId || null,
        customerName: form.customerName.trim(),
        roomNumber: form.roomNumber.trim(),
        adults: form.adults ? Number(form.adults) : 0,
        children: form.children ? Number(form.children) : 0,
        roomFeature: form.roomFeature || 'ac',
        roomType: normalizeRoomTypeForForm(form.roomType),
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        price: form.price ? Number(form.price) : 0,
        bookingComCommission: form.bookingComCommission ? Number(form.bookingComCommission) : 0,
        priceUsd: form.priceUsd ? Number(form.priceUsd) : 0,
        bookingComCommissionUsd: form.bookingComCommissionUsd ? Number(form.bookingComCommissionUsd) : 0,
      };
      if (editingBooking) {
        await api.bookings.update(editingBooking.id, payload);
        toast({ title: 'Booking updated', description: 'Booking has been updated.' });
      } else {
        await api.bookings.create(payload);
        toast({ title: 'Booking saved', description: 'Booking has been saved.' });
      }
      setForm(emptyForm());
      setEditingBooking(null);
      setIsDialogOpen(false);
      loadBookings();
    } catch (err) {
      toast({ title: editingBooking ? 'Update failed' : 'Save failed', description: err.message || 'Could not save booking', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (b) => {
    setEditingBooking(b);
    setForm({
      clientId: b.clientId || '',
      customerName: b.customerName || '',
      roomNumber: b.roomNumber || '',
      adults: b.adults ?? '',
      children: b.children ?? '',
      checkIn: b.checkIn || '',
      checkOut: b.checkOut || '',
      price: b.price ?? '',
      bookingComCommission: b.bookingComCommission ?? '',
      priceUsd: b.priceUsd ?? '',
      bookingComCommissionUsd: b.bookingComCommissionUsd ?? '',
      roomFeature: b.roomFeature || 'ac',
      roomType: normalizeRoomTypeForForm(b.roomType),
    });
    setIsDialogOpen(true);
  };

  const openAddonDialog = (b) => {
    setAddonDialogBooking(b);
    setAddonRows(
      (b.addons || []).length > 0
        ? b.addons.map((a) => ({
            pricingId: a.pricingId,
            name: a.name || '',
            unitPrice: a.unitPrice ?? '',
            quantity: a.quantity ?? 1,
          }))
        : [{ pricingId: '', name: '', unitPrice: '', quantity: 1 }]
    );
  };

  const addAddonRowPopup = () => {
    setAddonRows((rows) => [...rows, { pricingId: '', name: '', unitPrice: '', quantity: 1 }]);
  };

  const updateAddonRowPopup = (index, field, value) => {
    setAddonRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      if (field === 'pricingId') {
        const p = pricingList.find((x) => x.id === value);
        if (p) {
          next[index] = { ...next[index], name: p.name || '', unitPrice: p.price ?? '' };
        }
      }
      return next;
    });
  };

  const removeAddonRowPopup = (index) => {
    setAddonRows((rows) => rows.filter((_, i) => i !== index));
  };

  const saveAddonDialog = async () => {
    if (!addonDialogBooking) return;
    const payload = {
      addons: addonRows
        .filter((a) => a.pricingId && a.name)
        .map((a) => ({
          pricingId: a.pricingId,
          name: a.name,
          unitPrice: Number(a.unitPrice) || 0,
          quantity: Math.max(1, Number(a.quantity) || 1),
        })),
    };
    setAddonSaving(true);
    try {
      await api.bookings.update(addonDialogBooking.id, payload);
      toast({ title: 'Add-ons saved', description: 'Booking add-ons have been updated.' });
      setAddonDialogBooking(null);
      setAddonRows([]);
      loadBookings();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message || 'Could not save add-ons', variant: 'destructive' });
    } finally {
      setAddonSaving(false);
    }
  };

  const formatDateShort = (v) => {
    if (!v) return '—';
    if (typeof v === 'string' && v.includes('T')) return v.slice(0, 10);
    return v;
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete booking for ${b.customerName}?`)) return;
    try {
      await api.bookings.delete(b.id);
      toast({ title: 'Booking deleted', description: 'Booking has been removed.' });
      loadBookings();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message || 'Could not delete booking', variant: 'destructive' });
    }
  };

  return (
    <>
      <Helmet>
        <title>Booking - V Cabanas HMS</title>
        <meta name="description" content="Manage bookings and reservations" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Booking</h1>
            <p className="text-muted-foreground">
              Capture guest booking details for your rooms.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadBookings} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => { setEditingBooking(null); setForm(emptyForm()); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Booking
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[76rem] border-collapse table-auto">
              <colgroup>
                <col className="min-w-[9rem]" />
                <col className="w-24" />
                <col className="w-[5.5rem]" />
                <col className="w-[5.5rem]" />
                <col className="min-w-[10rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[8.5rem]" />
                <col className="w-[8.5rem]" />
                {isAdmin && <col className="w-[9rem]" />}
                <col className="w-[10rem]" />
              </colgroup>
              <thead className="bg-secondary">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Room no
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Feature
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Guests
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Check-in
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-left">
                    Check-out
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-right">
                    Price (LKR)
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-right">
                    Booking.com (LKR)
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-right">
                    Income &amp; Profit
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-right">
                    Staff commission
                  </th>
                  {isAdmin && (
                    <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-right">
                      Net (after staff)
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3.5 text-sm font-semibold whitespace-nowrap !text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Loading bookings...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="p-0 align-top">
                      <EmptyState
                        title="No bookings yet"
                        description="Create your first booking to get started."
                        actionLabel="Add Booking"
                        onAction={() => { setEditingBooking(null); setForm(emptyForm()); setIsDialogOpen(true); }}
                      />
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b border-secondary hover:bg-secondary/30">
                      <td className="px-4 py-3 text-sm !text-left align-middle text-foreground">{b.customerName}</td>
                      <td className="px-4 py-3 text-sm !text-left align-middle text-foreground">{b.roomNumber}</td>
                      <td className="px-4 py-3 text-sm !text-left align-middle text-foreground">{b.roomFeature === 'non_ac' ? 'Non AC' : 'AC'}</td>
                      <td className="px-4 py-3 text-sm !text-left align-middle capitalize text-foreground">{b.roomType || '—'}</td>
                      <td className="px-4 py-3 text-sm !text-left align-middle whitespace-nowrap text-foreground">
                        {b.adults || 0} adults, {b.children || 0} children
                      </td>
                      <td className="px-4 py-3 text-sm !text-left align-middle tabular-nums text-foreground">
                        {b.checkIn ? (typeof b.checkIn === 'string' && b.checkIn.includes('T') ? b.checkIn.slice(0, 10) : b.checkIn) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm !text-left align-middle tabular-nums text-foreground">
                        {b.checkOut ? (typeof b.checkOut === 'string' && b.checkOut.includes('T') ? b.checkOut.slice(0, 10) : b.checkOut) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums !text-right align-middle text-foreground">
                        {b.price != null ? Number(b.price).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums !text-right align-middle text-foreground">
                        {b.bookingComCommission != null
                          ? Number(b.bookingComCommission).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums !text-right align-middle font-medium text-foreground">
                        {(b.incomeProfit != null ? b.incomeProfit : (Number(b.price) || 0) - (Number(b.bookingComCommission) || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums !text-right align-middle text-foreground">
                        {(b.staffCommissionAmount != null ? Number(b.staffCommissionAmount) : 0).toLocaleString()}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm tabular-nums !text-right align-middle font-medium text-foreground">
                          {(b.netAfterStaffCommission != null ? Number(b.netAfterStaffCommission) : (b.incomeProfit != null ? b.incomeProfit : 0) - (b.staffCommissionAmount != null ? Number(b.staffCommissionAmount) : 0)).toLocaleString()}
                        </td>
                      )}
                      <td className="px-4 py-3 !text-center align-middle">
                        <div className="inline-flex w-full flex-wrap items-center justify-center gap-0.5">
                          <button type="button" onClick={() => setDetailBooking(b)} className="p-1.5 hover:bg-secondary rounded-md text-sky-400 hover:text-sky-300" title="View details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => openAddonDialog(b)} className="p-1.5 hover:bg-secondary rounded-md text-primary hover:text-primary/90" title="Add-ons">
                            <CirclePlus className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => openEdit(b)} className="p-1.5 hover:bg-secondary rounded-md text-green-500 hover:text-green-400" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(b)} className="p-1.5 hover:bg-secondary rounded-md text-red-500 hover:text-red-400" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add booking dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingBooking(null);
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Client (for invoice)</Label>
                <select
                  id="clientId"
                  value={form.clientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    handleChange('clientId', id);
                    const c = clients.find((x) => x.id === id);
                    if (c && c.name) handleChange('customerName', c.name);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <option value="">Select client (optional)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Customer name</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => handleChange('customerName', e.target.value)}
                  placeholder="Guest full name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roomNumber">Room no</Label>
                <Input
                  id="roomNumber"
                  value={form.roomNumber}
                  onChange={(e) => handleChange('roomNumber', e.target.value)}
                  placeholder="E.g. 101"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Guest count</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="adults" className="text-xs text-muted-foreground">
                      Adults
                    </Label>
                    <Input
                      id="adults"
                      type="number"
                      min="0"
                      value={form.adults}
                      onChange={(e) => handleChange('adults', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="children" className="text-xs text-muted-foreground">
                      Children
                    </Label>
                    <Input
                      id="children"
                      type="number"
                      min="0"
                      value={form.children}
                      onChange={(e) => handleChange('children', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roomFeature">Room Feature</Label>
                <select
                  id="roomFeature"
                  value={form.roomFeature}
                  onChange={(e) => handleChange('roomFeature', e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <option value="ac">AC</option>
                  <option value="non_ac">Non AC</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roomType">Room Type</Label>
                <select
                  id="roomType"
                  value={form.roomType}
                  onChange={(e) => handleChange('roomType', e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkIn">Check-in date</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={form.checkIn}
                  onChange={(e) => handleChange('checkIn', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="checkOut">Check-out date</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={form.checkOut}
                  onChange={(e) => handleChange('checkOut', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Total price (LKR)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="Total price in LKR"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bookingComCommission">
                  Booking.com commission (LKR, if any)
                </Label>
                <Input
                  id="bookingComCommission"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bookingComCommission}
                  onChange={(e) => handleChange('bookingComCommission', e.target.value)}
                  placeholder="Commission in LKR"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priceUsd">Total price (USD)</Label>
                <Input
                  id="priceUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceUsd}
                  onChange={(e) => handleChange('priceUsd', e.target.value)}
                  placeholder="Total price in USD"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bookingComCommissionUsd">
                  Booking.com commission (USD, if any)
                </Label>
                <Input
                  id="bookingComCommissionUsd"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bookingComCommissionUsd}
                  onChange={(e) => handleChange('bookingComCommissionUsd', e.target.value)}
                  placeholder="Commission in USD"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setForm(emptyForm())}>
                Clear
              </Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : (editingBooking ? 'Update booking' : 'Save booking')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View booking details */}
      <Dialog open={!!detailBooking} onOpenChange={(open) => !open && setDetailBooking(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-1 gap-3">
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium text-right">{detailBooking.customerName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Client (invoice)</dt>
                  <dd className="text-right">
                    {detailBooking.clientId
                      ? clients.find((c) => c.id === detailBooking.clientId)?.name || detailBooking.clientId
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Room no</dt>
                  <dd className="font-medium text-right">{detailBooking.roomNumber || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Feature</dt>
                  <dd className="text-right">{detailBooking.roomFeature === 'non_ac' ? 'Non AC' : 'AC'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="text-right capitalize">{detailBooking.roomType || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Guests</dt>
                  <dd className="text-right">
                    {detailBooking.adults || 0} adults, {detailBooking.children || 0} children
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Check-in</dt>
                  <dd className="tabular-nums text-right">{formatDateShort(detailBooking.checkIn)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Check-out</dt>
                  <dd className="tabular-nums text-right">{formatDateShort(detailBooking.checkOut)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Price (LKR)</dt>
                  <dd className="tabular-nums text-right">{Number(detailBooking.price || 0).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Booking.com (LKR)</dt>
                  <dd className="tabular-nums text-right">
                    {Number(detailBooking.bookingComCommission || 0).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Price (USD)</dt>
                  <dd className="tabular-nums text-right">{Number(detailBooking.priceUsd || 0).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Booking.com (USD)</dt>
                  <dd className="tabular-nums text-right">
                    {Number(detailBooking.bookingComCommissionUsd || 0).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Income &amp; profit</dt>
                  <dd className="tabular-nums font-medium text-right">
                    {(detailBooking.incomeProfit != null
                      ? detailBooking.incomeProfit
                      : (Number(detailBooking.price) || 0) - (Number(detailBooking.bookingComCommission) || 0)
                    ).toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Staff commission</dt>
                  <dd className="tabular-nums text-right">
                    {(detailBooking.staffCommissionAmount != null
                      ? Number(detailBooking.staffCommissionAmount)
                      : 0
                    ).toLocaleString()}
                  </dd>
                </div>
                {isAdmin && (
                  <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                    <dt className="text-muted-foreground">Net (after staff)</dt>
                    <dd className="tabular-nums font-medium text-right">
                      {(detailBooking.netAfterStaffCommission != null
                        ? Number(detailBooking.netAfterStaffCommission)
                        : (detailBooking.incomeProfit != null ? detailBooking.incomeProfit : 0) -
                          (detailBooking.staffCommissionAmount != null ? Number(detailBooking.staffCommissionAmount) : 0)
                      ).toLocaleString()}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-b border-secondary pb-2">
                  <dt className="text-muted-foreground">Booking ID</dt>
                  <dd className="font-mono text-xs text-right break-all">{detailBooking.id}</dd>
                </div>
                {detailBooking.createdAt && (
                  <div className="flex justify-between gap-4 pb-2">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="tabular-nums text-right text-xs">
                      {typeof detailBooking.createdAt === 'string'
                        ? detailBooking.createdAt.replace('T', ' ').slice(0, 19)
                        : String(detailBooking.createdAt)}
                    </dd>
                  </div>
                )}
              </dl>
              <div>
                <h4 className="text-sm font-medium mb-2">Add-ons</h4>
                {(detailBooking.addons || []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No add-ons. Use the add-ons button on the row to add packages from Pricing.</p>
                ) : (
                  <ul className="rounded-md border border-secondary divide-y divide-secondary">
                    {detailBooking.addons.map((a) => (
                      <li key={a.id || `${a.pricingId}-${a.name}`} className="px-3 py-2 flex justify-between gap-2 text-sm">
                        <span>{a.name}</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {a.quantity} × {Number(a.unitPrice || 0).toLocaleString()} ={' '}
                          {(Number(a.quantity || 0) * Number(a.unitPrice || 0)).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add-ons (from Pricing) */}
      <Dialog
        open={!!addonDialogBooking}
        onOpenChange={(open) => {
          if (!open) {
            setAddonDialogBooking(null);
            setAddonRows([]);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add-ons</DialogTitle>
            {addonDialogBooking && (
              <p className="text-sm text-muted-foreground font-normal">
                {addonDialogBooking.customerName} · Room {addonDialogBooking.roomNumber}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Add breakfast, lunch, tours from Pricing.</p>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={addAddonRowPopup} className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
            {addonRows.length > 0 && (
              <div className="rounded-md border border-secondary overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Package</th>
                      <th className="px-3 py-2 text-right font-medium w-24">Qty</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Unit price</th>
                      <th className="px-3 py-2 text-right font-medium w-28">Amount</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {addonRows.map((a, idx) => {
                      const qty = Number(a.quantity) || 0;
                      const unit = Number(a.unitPrice) || 0;
                      const amount = qty * unit;
                      return (
                        <tr key={idx} className="border-t border-secondary">
                          <td className="px-3 py-2">
                            <select
                              value={a.pricingId}
                              onChange={(e) => updateAddonRowPopup(idx, 'pricingId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-secondary border border-secondary rounded text-sm"
                            >
                              <option value="">Select...</option>
                              {pricingList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} – {Number(p.price).toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="1"
                              className="w-20 text-right h-8"
                              value={a.quantity}
                              onChange={(e) => updateAddonRowPopup(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 text-right h-8"
                              value={a.unitPrice}
                              onChange={(e) => updateAddonRowPopup(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{amount.toLocaleString()}</td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeAddonRowPopup(idx)}
                              className="p-1.5 hover:bg-secondary rounded text-red-500"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setAddonDialogBooking(null); setAddonRows([]); }}>
                Cancel
              </Button>
              <Button type="button" onClick={saveAddonDialog} disabled={addonSaving}>
                {addonSaving ? 'Saving...' : 'Save add-ons'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Booking;
