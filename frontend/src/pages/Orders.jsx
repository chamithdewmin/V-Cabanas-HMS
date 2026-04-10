import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Plus, Download, RefreshCw, Trash2, Eye, Printer, Loader2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import InvoiceTemplate from '@/components/InvoiceTemplate';
import { countNightsBetween } from '@/lib/invoiceNights';
import { FileText } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewedInvoice, setViewedInvoice] = useState(null);
  const [invoiceAction, setInvoiceAction] = useState(null); // 'view' | 'download' | 'print'
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [lastLoadedFromBookingCount, setLastLoadedFromBookingCount] = useState(0);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  const { invoices, clients, settings, updateInvoiceStatus, addInvoice, deleteInvoice, loadData } = useFinance();

  const createInvoiceFormInitial = () => ({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    paymentMethod: 'bank',
    dueDate: '',
    notes: '',
    bankDetails: null,
    showSignatureArea: false,
    bookingCheckIn: '',
    bookingCheckOut: '',
    bookingAdults: '',
    bookingChildren: '',
    items: [{ description: '', price: '', quantity: 1 }],
  });

  const [form, setForm] = useState(createInvoiceFormInitial);

  const closeCreateInvoiceDialog = () => {
    setForm(createInvoiceFormInitial());
    setLastLoadedFromBookingCount(0);
    setIsCreateOpen(false);
  };
  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'clientId') {
        setLastLoadedFromBookingCount(0);
        if (value) {
          const c = clients.find((x) => x.id === value);
          if (c) {
            next.clientName = c.name || next.clientName;
            next.clientEmail = c.email || next.clientEmail;
            next.clientPhone = c.phone || next.clientPhone;
          }
        }
      }
      return next;
    });
  };

  const loadFromBooking = async () => {
    if (!form.clientId) {
      toast({ title: 'Select a client first', description: 'Choose a client to load their booking.', variant: 'destructive' });
      return;
    }
    try {
      const data = await api.bookings.forInvoice(form.clientId);
      const items = [];
      if (data.booking) {
        const b = data.booking;
        const checkIn = b.checkIn ? (typeof b.checkIn === 'string' && b.checkIn.includes('T') ? b.checkIn.slice(0, 10) : b.checkIn) : '';
        const checkOut = b.checkOut ? (typeof b.checkOut === 'string' && b.checkOut.includes('T') ? b.checkOut.slice(0, 10) : b.checkOut) : '';
        const nights = countNightsBetween(checkIn, checkOut);
        const roomLabel = b.roomNumber != null && String(b.roomNumber).trim() !== '' ? `Room ${b.roomNumber}` : 'Room';
        let desc = roomLabel;
        if (nights > 0) desc = `${roomLabel} · ${nights} night${nights !== 1 ? 's' : ''}`;
        else if (checkIn || checkOut) desc = `${roomLabel} · Stay`;
        items.push({ description: desc, price: String(b.price ?? 0), quantity: 1 });
      }
      (data.addons || []).forEach((a) => {
        items.push({
          description: a.name || 'Add-on',
          price: String(a.unitPrice ?? 0),
          quantity: Number(a.quantity) || 1,
        });
      });
      if (items.length === 0) {
        toast({ title: 'No booking found', description: 'This client has no booking. Add a booking and link the client first.', variant: 'destructive' });
        return;
      }
      const b = data.booking;
      const checkIn = b?.checkIn ? (typeof b.checkIn === 'string' && b.checkIn.includes('T') ? b.checkIn.slice(0, 10) : b.checkIn) : '';
      const checkOut = b?.checkOut ? (typeof b.checkOut === 'string' && b.checkOut.includes('T') ? b.checkOut.slice(0, 10) : b.checkOut) : '';
      setForm((prev) => ({
        ...prev,
        clientName: data.client?.name ?? prev.clientName,
        clientEmail: data.client?.email ?? prev.clientEmail,
        clientPhone: data.client?.phone ?? prev.clientPhone,
        items: items.length ? items : prev.items,
        bookingCheckIn: checkIn,
        bookingCheckOut: checkOut,
        bookingAdults: b?.adults != null ? String(b.adults) : '',
        bookingChildren: b?.children != null ? String(b.children) : '',
      }));
      setLastLoadedFromBookingCount(items.length);
      toast({ title: 'Loaded from booking', description: `${items.length} item(s) added from this client's booking.` });
    } catch (err) {
      toast({ title: 'Could not load booking', description: err.message || 'Try again.', variant: 'destructive' });
    }
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const nextItems = prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      return { ...prev, items: nextItems };
    });
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', price: '', quantity: 1 }],
    }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const subtotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0,
      ),
    [form.items],
  );

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (!form.clientId && !form.clientName.trim()) {
      toast({
        title: 'Client name is required',
        description: 'Select a client or enter a name.',
      });
      return;
    }

    const selectedClient =
      clients.find((c) => c.id === form.clientId) || null;

    const normalizedItems = form.items
      .filter((item) => item.description.trim() && Number(item.price) > 0)
      .map((item) => ({
        description: item.description.trim(),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      }));

    if (normalizedItems.length === 0) {
      toast({
        title: 'Add at least one item',
        description: 'Please add at least one service or line item.',
      });
      return;
    }

    const dueDateIso = form.dueDate
      ? new Date(`${form.dueDate}T00:00:00`).toISOString()
      : new Date().toISOString();

    try {
      const invoice = await addInvoice({
        clientId: selectedClient?.id || null,
        clientName: selectedClient?.name || form.clientName,
        clientEmail: selectedClient?.email || form.clientEmail,
        clientPhone: selectedClient?.phone || form.clientPhone,
        items: normalizedItems,
        subtotal,
        paymentMethod: form.paymentMethod,
        dueDate: dueDateIso,
        notes: form.notes,
        bankDetails: form.bankDetails,
        showSignatureArea: form.showSignatureArea,
        checkIn: form.bookingCheckIn || undefined,
        checkOut: form.bookingCheckOut || undefined,
        adults: form.bookingAdults !== '' && form.bookingAdults != null ? Number(form.bookingAdults) : undefined,
        children: form.bookingChildren !== '' && form.bookingChildren != null ? Number(form.bookingChildren) : undefined,
      });

      toast({
        title: 'Invoice created',
        description: `Invoice ${invoice.invoiceNumber || invoice.id} has been created.`,
      });

      setForm(createInvoiceFormInitial());
      setLastLoadedFromBookingCount(0);
      setIsCreateOpen(false);
    } catch (err) {
      toast({
        title: 'Failed to create invoice',
        description: err?.message || 'Server error. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    setOrders(invoices);
    setFilteredOrders(invoices);
  }, [invoices]);

  useEffect(() => {
    if (selectedOrder && (selectedOrder.id || selectedOrder.invoiceNumber)) {
      setViewedInvoice(null);
      const hasToken = !!localStorage.getItem('token');
      const invoiceId = selectedOrder.id || selectedOrder.invoiceNumber;
      if (hasToken) {
        api.invoices.get(invoiceId).then((inv) => setViewedInvoice(inv)).catch(() => setViewedInvoice(selectedOrder));
      } else {
        setViewedInvoice(selectedOrder);
      }
    } else {
      setViewedInvoice(null);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = orders.filter(order =>
        order.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchQuery, orders]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPending = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.status !== 'paid')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [filteredOrders],
  );

  return (
    <>
      <Helmet>
        <title>Invoices - V Cabanas HMS</title>
        <meta name="description" content="Create, track, and manage invoices" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Create and manage invoices, due dates, and payment status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              disabled={refreshLoading}
              onClick={async () => {
                setRefreshLoading(true);
                try {
                  await loadData();
                  toast({
                    title: 'Refreshed',
                    description: 'Invoice data has been refreshed.',
                  });
                } finally {
                  setRefreshLoading(false);
                }
              }}
            >
              {refreshLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const headers = ['Invoice #', 'Client', 'Total', 'Status', 'Payment', 'Date'];
                const rows = invoices.map((inv) => [
                  inv.invoiceNumber,
                  inv.clientName,
                  inv.total,
                  inv.status,
                  inv.paymentMethod,
                  inv.createdAt,
                ]);
                const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'invoices.csv';
                a.click();
                toast({
                  title: 'Export successful',
                  description: 'Invoices exported to CSV',
                });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="min-h-[44px] sm:min-h-0">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <span>Total invoices: {filteredOrders.length}</span>
          <span>
            Pending payments: <span className="font-semibold text-primary">
              {settings.currency} {totalPending.toLocaleString()}
            </span>
          </span>
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden min-w-0">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full min-w-[56rem] border-collapse table-auto">
              <colgroup>
                <col className="min-w-[10.5rem]" />
                <col className="min-w-[8rem]" />
                <col className="min-w-[9.5rem]" />
                <col className="w-14" />
                <col className="w-[8rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-[7rem]" />
                <col className="w-[8.5rem]" />
              </colgroup>
              <thead className="bg-secondary">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-left">
                    Invoice #
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-left">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-left">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-center">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-right">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-left">
                    Payment
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-left">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap !text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-sm font-mono tabular-nums !text-left align-middle text-foreground">
                      {order.invoiceNumber}
                    </td>
                    <td className="px-4 py-2 text-sm !text-left align-middle text-foreground">{order.clientName}</td>
                    <td className="px-4 py-2 text-sm tabular-nums !text-left align-middle text-foreground">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-sm tabular-nums !text-center align-middle text-foreground">
                      {order.items.length}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold tabular-nums !text-right align-middle text-foreground">
                      {settings.currency} {Number(order.total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm capitalize !text-left align-middle text-foreground">
                      {order.paymentMethod}
                    </td>
                    <td className="px-4 py-2 !text-left align-middle">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          order.status === 'paid'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-white text-gray-900 border border-border'
                        }`}
                      >
                        {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-2 !text-center align-middle">
                      <div className="mx-auto flex w-full max-w-[8.5rem] flex-col items-center gap-1.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setInvoiceAction('view');
                            }}
                            className="p-1.5 hover:bg-secondary rounded-md text-blue-400 hover:text-blue-300"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setInvoiceAction('download');
                            }}
                            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setInvoiceAction('print');
                            }}
                            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm(`Delete invoice ${order.invoiceNumber}?`, {
                                title: 'Delete invoice',
                                confirmLabel: 'Delete',
                                variant: 'destructive',
                              });
                              if (!ok) return;
                              deleteInvoice(order.id);
                              setSelectedOrder(null);
                              toast({ title: 'Invoice deleted', description: 'Invoice has been removed.' });
                            }}
                            className="p-1.5 hover:bg-secondary rounded-md text-red-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {order.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => updateInvoiceStatus(order.id, 'paid')}
                            className="w-full shrink-0 rounded-md bg-primary px-2 py-1 text-xs font-medium !text-white hover:bg-primary/90"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredOrders.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to get started."
            actionLabel="Create Invoice"
            onAction={() => setIsCreateOpen(true)}
          />
        )}
      </div>

      {/* View invoice */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setInvoiceAction(null);
          }
        }}
      >
        <DialogContent
          hideCloseButton
          className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {(viewedInvoice || selectedOrder) && (
            <InvoiceTemplate
              invoice={viewedInvoice || selectedOrder}
              currency={settings.currency}
              autoAction={invoiceAction === 'download' || invoiceAction === 'print' ? invoiceAction : null}
              onAutoActionDone={() => setInvoiceAction(null)}
            />
          )}
          <DialogPillActions className="pt-4">
            <DialogPillPrimaryButton
              type="button"
              onClick={() => {
                setSelectedOrder(null);
                setInvoiceAction(null);
              }}
            >
              Close
            </DialogPillPrimaryButton>
          </DialogPillActions>
        </DialogContent>
      </Dialog>

      {/* Create invoice */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (open) setIsCreateOpen(true);
          else closeCreateInvoiceDialog();
        }}
      >
        <DialogContent
          hideCloseButton
          className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Client</Label>
                <select
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.clientId}
                  onChange={(e) => handleChange('clientId', e.target.value)}
                >
                  <option value="">Select existing client (optional)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Or type client name"
                  value={form.clientName}
                  onChange={(e) => handleChange('clientName', e.target.value)}
                  className="mt-2"
                />
                {form.clientId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadFromBooking}
                    className="mt-2"
                  >
                    Load from booking
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Items</Label>
              {lastLoadedFromBookingCount > 0 && (
                <p className="text-sm text-muted-foreground" role="status">
                  Loaded {lastLoadedFromBookingCount} item{lastLoadedFromBookingCount !== 1 ? 's' : ''} from booking.
                </p>
              )}
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,auto] gap-2 items-center"
                  >
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, 'price', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeItemRow(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addItemRow}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes</Label>
              <textarea
                className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                placeholder="Optional notes for this invoice"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Subtotal:{' '}
                <span className="font-semibold text-primary">
                  {settings.currency} {subtotal.toLocaleString()}
                </span>
              </div>
              <DialogPillActions className="w-full pt-0 sm:max-w-md sm:ml-auto">
                <DialogPillPrimaryButton type="submit">Save Invoice</DialogPillPrimaryButton>
                <DialogPillSecondaryButton type="button" onClick={closeCreateInvoiceDialog}>
                  Close
                </DialogPillSecondaryButton>
              </DialogPillActions>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Orders;