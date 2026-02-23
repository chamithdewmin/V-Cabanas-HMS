import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Printer, CreditCard, Banknote, Building2 } from 'lucide-react';
import InvoiceTemplate from '@/components/InvoiceTemplate';

const CheckoutModal = ({ isOpen, onClose }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const { cart, clearCart, getTotal, getTax, getGrandTotal } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && !!localStorage.getItem('token')) {
      api.customers.list().then((list) => setCustomers(Array.isArray(list) ? list : [])).catch(() => setCustomers([]));
    }
  }, [isOpen]);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    return `INV-${timestamp}`;
  };

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    const customer = customers.find(c => c.id === selectedCustomer);
    const invoiceNumber = generateInvoiceNumber();

    const order = {
      id: invoiceNumber,
      customerId: selectedCustomer,
      customerName: customer?.name || '',
      items: cart,
      subtotal: getTotal(),
      tax: getTax(),
      total: getGrandTotal(),
      paymentMethod,
      status: 'Paid',
    };

    setLoading(true);
    try {
      await api.orders.create(order);
      setCurrentInvoice(order);
      setShowInvoice(true);
      clearCart();
      toast({
        title: "Order completed!",
        description: `Invoice ${invoiceNumber} created successfully`,
      });
    } catch (err) {
      toast({
        title: "Order failed",
        description: err.message || "Could not save order to database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (showInvoice && currentInvoice) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceTemplate order={currentInvoice} />
          <div className="flex gap-3 mt-4">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
            <Button onClick={() => { setShowInvoice(false); onClose(); }} variant="outline" className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer selection */}
          <div className="space-y-2">
            <Label>Select Customer</Label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choose a customer...</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.email}
                </option>
              ))}
            </select>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10'
                    : 'border-secondary hover:border-primary/50'
                }`}
              >
                <CreditCard className="w-6 h-6 mx-auto mb-2" />
                <span className="text-xs">Card</span>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/10'
                    : 'border-secondary hover:border-primary/50'
                }`}
              >
                <Banknote className="w-6 h-6 mx-auto mb-2" />
                <span className="text-xs">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('bank')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'bank'
                    ? 'border-primary bg-primary/10'
                    : 'border-secondary hover:border-primary/50'
                }`}
              >
                <Building2 className="w-6 h-6 mx-auto mb-2" />
                <span className="text-xs">Bank</span>
              </button>
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${getTotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (10%)</span>
              <span>${getTax().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-card">
              <span>Total</span>
              <span className="text-primary">${getGrandTotal().toLocaleString()}</span>
            </div>
          </div>

          <Button onClick={handleCheckout} className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Sale'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;