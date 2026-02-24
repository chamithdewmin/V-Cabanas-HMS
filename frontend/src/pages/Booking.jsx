import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { BookOpen, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Booking = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    roomNumber: '',
    adults: '',
    children: '',
    checkIn: '',
    checkOut: '',
    price: '',
    bookingComCommission: '',
    roomCategory: 'ac',
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.customerName.trim() || !form.roomNumber.trim()) {
      toast({
        title: 'Missing details',
        description: 'Please enter at least customer name and room number.',
        variant: 'destructive',
      });
      return;
    }

    const newBooking = {
      id: Date.now().toString(),
      ...form,
    };

    setBookings((prev) => [newBooking, ...prev]);

    toast({
      title: 'Booking saved',
      description: 'Booking details have been captured (UI only, no backend yet).',
    });

    setForm({
      customerName: '',
      roomNumber: '',
      adults: '',
      children: '',
      checkIn: '',
      checkOut: '',
      price: '',
      bookingComCommission: '',
      roomCategory: 'ac',
    });
    setIsDialogOpen(false);
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
            <Button onClick={() => setIsDialogOpen(true)}>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Room</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Guests</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check-in</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check-out</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Booking.com</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      No bookings yet. Click &quot;Add Booking&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b border-secondary">
                      <td className="px-4 py-3 text-sm">{b.customerName}</td>
                      <td className="px-4 py-3 text-sm">{b.roomNumber}</td>
                      <td className="px-4 py-3 text-sm">
                        {b.adults || 0} adults, {b.children || 0} children
                      </td>
                      <td className="px-4 py-3 text-sm">{b.checkIn || '—'}</td>
                      <td className="px-4 py-3 text-sm">{b.checkOut || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {b.price ? Number(b.price).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {b.bookingComCommission
                          ? Number(b.bookingComCommission).toLocaleString()
                          : '—'}
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
            setForm({
              customerName: '',
              roomNumber: '',
              adults: '',
              children: '',
              checkIn: '',
              checkOut: '',
              price: '',
              bookingComCommission: '',
              roomCategory: 'ac',
            });
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="roomCategory">Room category</Label>
                <select
                  id="roomCategory"
                  value={form.roomCategory}
                  onChange={(e) => handleChange('roomCategory', e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <option value="ac">AC</option>
                  <option value="non-ac">Non AC</option>
                  <option value="3-person">3 person room</option>
                  <option value="2-person">2 person room</option>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    customerName: '',
                    roomNumber: '',
                    adults: '',
                    children: '',
                    checkIn: '',
                    checkOut: '',
                    price: '',
                    bookingComCommission: '',
                    roomCategory: 'ac',
                  })
                }
              >
                Clear
              </Button>
              <Button type="submit">Save booking</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Booking;
