import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const Booking = () => {
  const { toast } = useToast();
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

    toast({
      title: 'Booking saved',
      description: 'Booking details have been captured (no backend yet).',
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
        </div>

        <div className="bg-card rounded-lg border border-secondary p-8 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">New Booking</h2>
              <p className="text-sm text-muted-foreground">
                Fill in the booking details below.
              </p>
            </div>
          </div>

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
        </div>
      </div>
    </>
  );
};

export default Booking;
