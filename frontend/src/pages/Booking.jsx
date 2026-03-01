import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  roomFeature: 'ac',
  roomType: 'single',
  addons: [],
});

const Booking = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin';
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [pricingList, setPricingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [form, setForm] = useState(emptyForm());

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
        roomType: form.roomType || 'single',
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        price: form.price ? Number(form.price) : 0,
        bookingComCommission: form.bookingComCommission ? Number(form.bookingComCommission) : 0,
        addons: (form.addons || []).filter((a) => a.pricingId && a.name).map((a) => ({
          pricingId: a.pricingId,
          name: a.name,
          unitPrice: Number(a.unitPrice) || 0,
          quantity: Math.max(1, Number(a.quantity) || 1),
        })),
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
      roomFeature: b.roomFeature || 'ac',
      roomType: b.roomType || 'single',
      addons: (b.addons || []).map((a) => ({
        pricingId: a.pricingId,
        name: a.name || '',
        unitPrice: a.unitPrice ?? '',
        quantity: a.quantity ?? 1,
      })),
    });
    setIsDialogOpen(true);
  };

  const addAddonRow = () => {
    setForm((prev) => ({
      ...prev,
      addons: [...(prev.addons || []), { pricingId: '', name: '', unitPrice: '', quantity: 1 }],
    }));
  };

  const updateAddon = (index, field, value) => {
    setForm((prev) => {
      const next = [...(prev.addons || [])];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      if (field === 'pricingId') {
        const p = pricingList.find((x) => x.id === value);
        if (p) {
          next[index].name = p.name || '';
          next[index].unitPrice = p.price ?? '';
        }
      }
      return { ...prev, addons: next };
    });
  };

  const removeAddon = (index) => {
    setForm((prev) => ({
      ...prev,
      addons: (prev.addons || []).filter((_, i) => i !== index),
    }));
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
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Room no</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Feature</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Guests</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check-in</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check-out</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-24">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-28">Booking.com</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-28">Income &amp; Profit</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-28">Staff commission</th>
                  {isAdmin && <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-28">Net (after staff)</th>}
                  <th className="py-3 pl-8 pr-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Loading bookings...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      No bookings yet. Click &quot;Add Booking&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b border-secondary hover:bg-secondary/30">
                      <td className="px-4 py-3 text-sm text-left">{b.customerName}</td>
                      <td className="px-4 py-3 text-sm text-left">{b.roomNumber}</td>
                      <td className="px-4 py-3 text-sm text-left">{b.roomFeature === 'non_ac' ? 'Non AC' : 'AC'}</td>
                      <td className="px-4 py-3 text-sm text-left capitalize">{b.roomType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-left">
                        {b.adults || 0} adults, {b.children || 0} children
                      </td>
                      <td className="px-4 py-3 text-sm text-left">
                        {b.checkIn ? (typeof b.checkIn === 'string' && b.checkIn.includes('T') ? b.checkIn.slice(0, 10) : b.checkIn) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-left">
                        {b.checkOut ? (typeof b.checkOut === 'string' && b.checkOut.includes('T') ? b.checkOut.slice(0, 10) : b.checkOut) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums min-w-[5rem] w-24">
                        {b.price != null ? Number(b.price).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums min-w-[5rem] w-28">
                        {b.bookingComCommission != null
                          ? Number(b.bookingComCommission).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums min-w-[5rem] w-28 font-medium">
                        {(b.incomeProfit != null ? b.incomeProfit : (Number(b.price) || 0) - (Number(b.bookingComCommission) || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums min-w-[5rem] w-28">
                        {(b.staffCommissionAmount != null ? Number(b.staffCommissionAmount) : 0).toLocaleString()}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-right tabular-nums min-w-[5rem] w-28 font-medium">
                          {(b.netAfterStaffCommission != null ? Number(b.netAfterStaffCommission) : (b.incomeProfit != null ? b.incomeProfit : 0) - (b.staffCommissionAmount != null ? Number(b.staffCommissionAmount) : 0)).toLocaleString()}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-1">
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
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="family">Family</option>
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
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="Total price"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bookingComCommission">
                  Booking.com commission (if any)
                </Label>
                <Input
                  id="bookingComCommission"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bookingComCommission}
                  onChange={(e) => handleChange('bookingComCommission', e.target.value)}
                  placeholder="Commission amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Add-ons (breakfast, lunch, tour, etc.)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAddonRow} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              {(form.addons || []).length > 0 && (
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
                      {form.addons.map((a, idx) => {
                        const qty = Number(a.quantity) || 0;
                        const unit = Number(a.unitPrice) || 0;
                        const amount = qty * unit;
                        return (
                        <tr key={idx} className="border-t border-secondary">
                          <td className="px-3 py-2">
                            <select
                              value={a.pricingId}
                              onChange={(e) => updateAddon(idx, 'pricingId', e.target.value)}
                              className="w-full px-2 py-1.5 bg-secondary border border-secondary rounded text-sm"
                            >
                              <option value="">Select...</option>
                              {pricingList.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} – {Number(p.price).toLocaleString()}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="1"
                              className="w-20 text-right h-8"
                              value={a.quantity}
                              onChange={(e) => updateAddon(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 text-right h-8"
                              value={a.unitPrice}
                              onChange={(e) => updateAddon(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {amount.toLocaleString()}
                          </td>
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => removeAddon(idx)} className="p-1.5 hover:bg-secondary rounded text-red-500" title="Remove">
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
    </>
  );
};

export default Booking;
