import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Receipt,
  FileText,
  TrendingUp,
  BedDouble,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { bookingNetRevenueLkr } from '@/lib/bookingNetLkr';

/** Date when booking revenue is recognized: checkout (payment day); falls back to check-in if no checkout. */
function bookingRevenueDateStr(booking, toLocalDateString) {
  const raw = booking?.checkOut || booking?.checkIn;
  if (!raw) return '';
  return toLocalDateString(raw);
}

const Calendar = () => {
  const { incomes, expenses, invoices, settings, loadData } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const currency = settings?.currency || 'LKR';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Format any date (Date or string from API) as local YYYY-MM-DD so calendar matches DB dates correctly
  const toLocalDateString = (val) => {
    if (val == null) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Get transactions for a specific date (compare local dates so timezone doesn't shift the day)
  const getTransactionsForDate = (date) => {
    const dateStr = toLocalDateString(date);
    if (!dateStr) {
      return {
        incomes: [],
        expenses: [],
        invoices: [],
        bookingsCheckIn: [],
        bookingsCheckOut: [],
        bookingsRevenue: [],
      };
    }
    const dayTransactions = {
      incomes: [],
      expenses: [],
      invoices: [],
      bookingsCheckIn: [],
      /** Explicit check-out date (for calendar color / icons). */
      bookingsCheckOut: [],
      /** Bookings whose net revenue is counted on this day (checkout when set, else check-in). */
      bookingsRevenue: [],
    };

    incomes.forEach(income => {
      if (toLocalDateString(income.date) === dateStr) {
        dayTransactions.incomes.push(income);
      }
    });

    expenses.forEach(expense => {
      if (toLocalDateString(expense.date) === dateStr) {
        dayTransactions.expenses.push(expense);
      }
    });

    invoices.forEach(invoice => {
      const invDate = invoice.dueDate ?? invoice.createdAt;
      if (invDate && toLocalDateString(invDate) === dateStr) {
        dayTransactions.invoices.push(invoice);
      }
    });

    bookings.forEach((booking) => {
      const checkInStr = booking.checkIn ? toLocalDateString(booking.checkIn) : '';
      if (checkInStr === dateStr) {
        dayTransactions.bookingsCheckIn.push(booking);
      }
      if (booking.checkOut) {
        const checkOutStr = toLocalDateString(booking.checkOut);
        if (checkOutStr === dateStr) {
          dayTransactions.bookingsCheckOut.push(booking);
        }
      }
      const revStr = bookingRevenueDateStr(booking, toLocalDateString);
      if (revStr === dateStr) {
        dayTransactions.bookingsRevenue.push(booking);
      }
    });

    return dayTransactions;
  };

  // Calculate totals for a date
  const getDateTotals = (date) => {
    const transactions = getTransactionsForDate(date);
    const incomeTotal = transactions.incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const expenseTotal = transactions.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const invoiceTotal = transactions.invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    const bookingNetCheckout = transactions.bookingsRevenue.reduce(
      (sum, b) => sum + bookingNetRevenueLkr(b),
      0
    );

    return {
      incomeTotal,
      expenseTotal,
      invoiceTotal,
      bookingCheckInCount: transactions.bookingsCheckIn.length,
      bookingCheckOutCount: transactions.bookingsCheckOut.length,
      bookingRevenueCount: transactions.bookingsRevenue.length,
      bookingNetCheckout,
      /** Income − expenses; booking stay revenue is shown separately as booking net (checkout). */
      net: incomeTotal - expenseTotal,
    };
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return days;
  }, [year, month, startingDayOfWeek, daysInMonth]);

  const [selectedDate, setSelectedDate] = useState(null);
  const selectedTransactions = selectedDate ? getTransactionsForDate(selectedDate) : null;
  const selectedTotals = selectedDate ? getDateTotals(selectedDate) : null;

  useEffect(() => {
    loadData?.();
    api.bookings
      .list()
      .then((list) => setBookings(Array.isArray(list) ? list : []))
      .catch(() => setBookings([]));
  }, []);

  return (
    <>
      <Helmet>
        <title>Calendar - V Cabanas HMS</title>
        <meta name="description" content="Calendar: income, expenses, invoices, check-ins, and booking net on check-out" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
              Calendar
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Booking net revenue is counted on <strong className="text-foreground font-medium">check-out</strong> (payment day), same as Cash Flow. Check-ins show arrivals only.
            </p>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-card rounded-lg border border-secondary p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold">
                {monthNames[month]} {year}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const totals = getDateTotals(date);
              const hasCheckIn = totals.bookingCheckInCount > 0;
              const hasCheckOut = totals.bookingCheckOutCount > 0;
              const hasTransactions =
                totals.incomeTotal > 0 ||
                totals.expenseTotal > 0 ||
                totals.invoiceTotal > 0 ||
                totals.bookingCheckInCount > 0 ||
                totals.bookingCheckOutCount > 0 ||
                totals.bookingRevenueCount > 0 ||
                totals.bookingNetCheckout > 0;
              const isSelected = selectedDate && 
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square p-1 sm:p-2 rounded-lg border transition-all text-left",
                    "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary",
                    isToday(date) && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    isSelected && "ring-2 ring-primary border-primary bg-primary/10",
                    hasCheckIn &&
                      !hasCheckOut &&
                      "bg-sky-400/20 dark:bg-sky-500/15 border-sky-400/45",
                    hasCheckOut &&
                      !hasCheckIn &&
                      "bg-zinc-300/35 dark:bg-zinc-600/25 border-zinc-400/55 dark:border-zinc-500/50",
                    hasCheckIn &&
                      hasCheckOut &&
                      "border-sky-400/40 dark:border-sky-500/35 bg-gradient-to-br from-sky-400/25 to-zinc-400/25 dark:from-sky-500/15 dark:to-zinc-600/20",
                    !hasTransactions && "border-transparent"
                  )}
                >
                  <div className="flex flex-col h-full min-h-0">
                    <div className="flex items-start justify-between gap-0.5 mb-0.5">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          isToday(date) ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {date.getDate()}
                      </span>
                      <span className="flex items-center gap-0.5 shrink-0" aria-hidden>
                        {hasCheckIn && (
                          <LogIn
                            className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                            strokeWidth={2.5}
                          />
                        )}
                        {hasCheckOut && (
                          <LogOut
                            className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400"
                            strokeWidth={2.5}
                          />
                        )}
                      </span>
                    </div>
                    {hasTransactions && (
                      <div className="flex flex-col gap-0.5 text-xs min-h-0">
                        {totals.incomeTotal > 0 && (
                          <div className="text-green-500 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="truncate">{totals.incomeTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.expenseTotal > 0 && (
                          <div className="text-red-500 flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            <span className="truncate">{totals.expenseTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.invoiceTotal > 0 && (
                          <div className="text-yellow-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{totals.invoiceTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.bookingNetCheckout > 0 && (
                          <div className="text-emerald-400 flex items-center gap-1" title="Net booking revenue (checkout day)">
                            <BedDouble className="w-3 h-3" />
                            <span className="truncate">
                              {totals.bookingNetCheckout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}
                        {totals.bookingCheckInCount > 0 && (
                          <div
                            className="text-sky-600 dark:text-sky-400 flex items-center gap-1 text-[10px] font-medium"
                            title="Check-in"
                          >
                            <LogIn className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                            <span className="truncate">{totals.bookingCheckInCount} in</span>
                          </div>
                        )}
                        {totals.bookingCheckOutCount > 0 && (
                          <div
                            className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1 text-[10px] font-medium"
                            title="Check-out"
                          >
                            <LogOut className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                            <span className="truncate">{totals.bookingCheckOutCount} out</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sky-400/25 dark:bg-sky-500/20 border border-sky-400/40">
                <LogIn className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" strokeWidth={2.5} />
              </span>
              Check-in day — light blue
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-300/50 dark:bg-zinc-600/30 border border-zinc-400/50">
                <LogOut className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" strokeWidth={2.5} />
              </span>
              Check-out day — light gray
            </span>
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && selectedTransactions && (
          <div className="bg-card rounded-lg border border-secondary p-4 sm:p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>

            {selectedTotals && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Income</p>
                  <p className="text-lg font-bold text-green-500">
                    {currency} {selectedTotals.incomeTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-bold text-red-500">
                    {currency} {selectedTotals.expenseTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pending Invoices</p>
                  <p className="text-lg font-bold text-yellow-500">
                    {currency} {selectedTotals.invoiceTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Booking net (checkout)</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {currency}{' '}
                    {selectedTotals.bookingNetCheckout.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground mb-1">Net (income − expenses)</p>
                  <p className={cn(
                    "text-lg font-bold",
                    selectedTotals.net >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {currency} {selectedTotals.net.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Incomes */}
              {selectedTransactions.incomes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-500 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Income ({selectedTransactions.incomes.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.incomes.map((income) => (
                      <div
                        key={income.id}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{income.clientName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{income.serviceType || 'Income'}</p>
                        </div>
                        <p className="font-bold text-green-500">
                          {currency} {(income.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses */}
              {selectedTransactions.expenses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Expenses ({selectedTransactions.expenses.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{expense.category || 'Expense'}</p>
                          <p className="text-sm text-muted-foreground">{expense.notes || 'No notes'}</p>
                        </div>
                        <p className="font-bold text-red-500">
                          {currency} {(expense.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {selectedTransactions.invoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-500 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoices ({selectedTransactions.invoices.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.invoices.map((invoice) => (
                      <div
                        key={invoice.id || invoice.invoiceNumber}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{invoice.clientName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            Invoice #{invoice.invoiceNumber || invoice.id} • {invoice.status}
                          </p>
                        </div>
                        <p className="font-bold text-yellow-500">
                          {currency} {(invoice.total || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking revenue (checkout day — net after Booking.com, staff, + add-ons) */}
              {selectedTransactions.bookingsRevenue.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-2">
                    <BedDouble className="w-4 h-4" />
                    Booking net (checkout){' '}
                    <span className="text-muted-foreground font-normal">
                      ({selectedTransactions.bookingsRevenue.length})
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Same net as Monthly Report / Cash Flow: room − Booking.com − manager commission + add-ons (LKR).
                  </p>
                  <div className="space-y-2">
                    {selectedTransactions.bookingsRevenue.map((booking) => {
                      const net = bookingNetRevenueLkr(booking);
                      const cin = booking.checkIn
                        ? toLocalDateString(booking.checkIn)
                        : '—';
                      const cout = booking.checkOut
                        ? toLocalDateString(booking.checkOut)
                        : null;
                      return (
                        <div
                          key={booking.id}
                          className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{booking.customerName || 'Unknown guest'}</p>
                            <p className="text-sm text-muted-foreground">
                              Room {booking.roomNumber || '—'} • In {cin}
                              {cout ? ` → Out ${cout}` : ' • No check-out — net on check-in'}
                            </p>
                          </div>
                          <p className="font-bold text-emerald-400 shrink-0 tabular-nums">
                            {currency}{' '}
                            {net.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Check-outs (departures — explicit check-out date) */}
              {selectedTransactions.bookingsCheckOut.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-2">
                    <LogOut className="w-4 h-4" strokeWidth={2.5} />
                    Check-outs ({selectedTransactions.bookingsCheckOut.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Departures on this date (light gray on the calendar).
                  </p>
                  <div className="space-y-2">
                    {selectedTransactions.bookingsCheckOut.map((booking) => (
                      <div
                        key={`out-${booking.id}`}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{booking.customerName || 'Unknown guest'}</p>
                          <p className="text-sm text-muted-foreground">
                            Room {booking.roomNumber || '—'}
                            {booking.checkIn
                              ? ` • In ${toLocalDateString(booking.checkIn)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Check-ins (arrivals — no stay revenue on this day unless also checkout) */}
              {selectedTransactions.bookingsCheckIn.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-sky-500 dark:text-sky-400 mb-2 flex items-center gap-2">
                    <LogIn className="w-4 h-4" strokeWidth={2.5} />
                    Check-ins ({selectedTransactions.bookingsCheckIn.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Guest arrivals. Net revenue for the stay is shown on check-out (or on check-in if check-out is not set).
                  </p>
                  <div className="space-y-2">
                    {selectedTransactions.bookingsCheckIn.map((booking) => (
                      <div
                        key={`in-${booking.id}`}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{booking.customerName || 'Unknown guest'}</p>
                          <p className="text-sm text-muted-foreground">
                            Room {booking.roomNumber || '—'}
                            {booking.checkOut
                              ? ` • Out ${toLocalDateString(booking.checkOut)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransactions.incomes.length === 0 &&
                selectedTransactions.expenses.length === 0 &&
                selectedTransactions.invoices.length === 0 &&
                selectedTransactions.bookingsRevenue.length === 0 &&
                selectedTransactions.bookingsCheckOut.length === 0 &&
                selectedTransactions.bookingsCheckIn.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No transactions on this date
                  </p>
                )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Calendar;
