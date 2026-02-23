import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Plus, Download, RefreshCw, Pencil, Trash2, Eye, Printer, Loader2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InvoiceTemplate from '@/components/InvoiceTemplate';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewedInvoice, setViewedInvoice] = useState(null);
  const [invoiceAction, setInvoiceAction] = useState(null); // 'view' | 'download' | 'print'
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const { toast } = useToast();

  const { invoices, clients, settings, updateInvoiceStatus, addInvoice, deleteInvoice, loadData } = useFinance();

  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    paymentMethod: 'bank',
    dueDate: '',
    notes: '',
    bankDetails: null,
    showSignatureArea: false,
    items: [
      { description: '', price: '', quantity: 1 },
    ],
  });
  const [showBankDetailsPopup, setShowBankDetailsPopup] = useState(false);

  const hasBankDetailsInSettings = useMemo(() => {
    const b = settings?.bankDetails;
    return b && b.accountNumber && b.accountName && b.bankName;
  }, [settings?.bankDetails]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      });

      toast({
        title: 'Invoice created',
        description: `Invoice ${invoice.invoiceNumber || invoice.id} has been created.`,
      });

      setForm({
        clientId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        paymentMethod: 'bank',
        dueDate: '',
        notes: '',
        bankDetails: null,
        showSignatureArea: false,
        items: [
          { description: '', price: '', quantity: 1 },
        ],
      });
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
        <title>Invoices - MyAccounts</title>
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
            <table className="w-full min-w-[640px]">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Invoice #</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Client</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Date</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Items</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Total</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Payment</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold">Status</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold uppercase">Actions</th>
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
                    <td className="px-4 py-3 text-sm font-mono">{order.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{order.clientName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">{order.items.length}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">
                      {settings.currency} {Number(order.total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{order.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'paid'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-white text-gray-900 border border-border'
                      }`}>
                        {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setInvoiceAction('view');
                          }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-blue-400 hover:text-blue-300"
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
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
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
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setInvoiceAction('view');
                          }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete invoice ${order.invoiceNumber}?`)) {
                              deleteInvoice(order.id);
                              setSelectedOrder(null);
                              toast({ title: 'Invoice deleted', description: 'Invoice has been removed.' });
                            }
                          }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {order.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => updateInvoiceStatus(order.id, 'paid')}
                            className="text-xs px-3 py-1 rounded-full bg-primary !text-white hover:bg-primary/90"
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found</p>
          </div>
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
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto" aria-describedby={undefined}>
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
        </DialogContent>
      </Dialog>

      {/* Create invoice */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto" aria-describedby={undefined}>
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
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <select
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                {form.paymentMethod === 'bank' && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasBankDetailsInSettings}
                      title={!hasBankDetailsInSettings ? 'Enter your bank details on the Settings page' : undefined}
                      onClick={() => form.bankDetails ? handleChange('bankDetails', null) : setShowBankDetailsPopup(true)}
                    >
                      {form.bankDetails ? '✓ Bank details added (click to remove)' : 'Add Payment Details'}
                    </Button>
                    {!hasBankDetailsInSettings && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your bank details on the Settings page
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleChange('showSignatureArea', !form.showSignatureArea)}
                  >
                    {form.showSignatureArea ? '✓ Signature area added (click to remove)' : 'Add Signature Area'}
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  <Label className="text-sm font-medium">Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Items</Label>
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

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                Subtotal:{' '}
                <span className="font-semibold text-primary">
                  {settings.currency} {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Invoice
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Details popup */}
      <Dialog open={showBankDetailsPopup} onOpenChange={setShowBankDetailsPopup}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Bank Details to Invoice</DialogTitle>
          </DialogHeader>
          {hasBankDetailsInSettings && settings?.bankDetails && (
            <div className="space-y-3">
              <div className="rounded-lg border border-secondary bg-secondary/30 p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Account Number:</span> {settings.bankDetails.accountNumber}</p>
                <p><span className="text-muted-foreground">Account Name:</span> {settings.bankDetails.accountName}</p>
                <p><span className="text-muted-foreground">Bank:</span> {settings.bankDetails.bankName}</p>
                {settings.bankDetails.branch && (
                  <p><span className="text-muted-foreground">Branch:</span> {settings.bankDetails.branch}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBankDetailsPopup(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleChange('bankDetails', settings.bankDetails);
                    setShowBankDetailsPopup(false);
                  }}
                >
                  Add to Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Orders;