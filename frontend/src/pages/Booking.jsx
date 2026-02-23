import React from 'react';
import { Helmet } from 'react-helmet';
import { BookOpen } from 'lucide-react';

const Booking = () => {
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
              Manage your bookings and reservations
            </p>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-secondary p-8 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Booking</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            View and manage bookings here. Add booking forms and lists as needed.
          </p>
        </div>
      </div>
    </>
  );
};

export default Booking;
