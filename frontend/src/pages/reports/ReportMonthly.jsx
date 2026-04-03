import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import EmptyState from '@/components/EmptyState';

const MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];

/** Parse booking date string as local calendar date (avoids UTC shift on YYYY-MM-DD). */
function parseCheckInLocal(checkIn) {
  if (!checkIn) return null;
  const part = String(checkIn).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(checkIn);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isInSelectedMonth(checkIn, year, monthIndex) {
  const d = parseCheckInLocal(checkIn);
  if (!d) return false;
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

function formatCheckInDisplay(checkIn) {
  const d = parseCheckInLocal(checkIn);
  if (!d) return '—';
  return d.toLocaleDateString();
}

export default function ReportMonthly() {
  const { toast } = useToast();
  const { settings } = useFinance();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const list = await api.bookings.list();
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({
        title: 'Failed to load bookings',
        description: err.message || 'Could not fetch bookings',
        variant: 'destructive',
      });
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const years = [];
    for (let i = y - 5; i <= y + 1; i += 1) years.push(i);
    return years;
  }, []);

  const filtered = useMemo(
    () => bookings.filter((b) => isInSelectedMonth(b.checkIn, year, month)),
    [bookings, year, month]
  );

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => {
        const price = Number(b.price) || 0;
        const bc = Number(b.bookingComCommission) || 0;
        const mgr = Number(b.staffCommissionAmount) || 0;
        const net =
          b.netAfterStaffCommission != null
            ? Number(b.netAfterStaffCommission)
            : price - bc - mgr;
        acc.bookingPrice += price;
        acc.bookingCom += bc;
        acc.manager += mgr;
        acc.total += net;
        return acc;
      },
      { bookingPrice: 0, bookingCom: 0, manager: 0, total: 0 }
    );
  }, [filtered]);

  const fmt = (n) => `${settings.currency} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <Helmet>
        <title>Monthly Report - V Cabanas HMS</title>
        <meta name="description" content="Bookings by check-in month" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Monthly Report</h1>
            <p className="text-muted-foreground">
              Bookings filtered by check-in date for the selected month.
            </p>
          </div>
          <Button variant="outline" onClick={loadBookings} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="rounded-lg border border-secondary bg-card p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-x-10 sm:gap-y-0 sm:max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-year" className="block">
                Year
              </Label>
              <select
                id="report-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-10 min-w-[8rem] w-full rounded-md border border-secondary bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-month" className="block">
                Month
              </Label>
              <select
                id="report-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-10 min-w-[10rem] w-full rounded-md border border-secondary bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-secondary bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Check in date</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Booking price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Booking.com price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Manager commission</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0 align-top">
                      <EmptyState
                        title="No bookings this month"
                        description="No check-ins fall in the selected month. Try another year or month."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((b, idx) => {
                    const price = Number(b.price) || 0;
                    const bc = Number(b.bookingComCommission) || 0;
                    const mgr = Number(b.staffCommissionAmount) || 0;
                    const total =
                      b.netAfterStaffCommission != null
                        ? Number(b.netAfterStaffCommission)
                        : price - bc - mgr;
                    return (
                      <tr key={b.id} className="border-b border-secondary hover:bg-secondary/30">
                        <td className="px-4 py-3 text-sm tabular-nums">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm">{b.customerName || '—'}</td>
                        <td className="px-4 py-3 text-sm">{formatCheckInDisplay(b.checkIn)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">{fmt(price)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">{fmt(bc)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums">{fmt(mgr)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">{fmt(total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot className="border-t-2 border-secondary bg-secondary/50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{fmt(totals.bookingPrice)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{fmt(totals.bookingCom)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{fmt(totals.manager)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{fmt(totals.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          TOTAL is net after Booking.com and manager commission (same as “Net after staff” on the Booking page).
        </p>
      </div>
    </>
  );
}
