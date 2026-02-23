import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Plus, Download, RefreshCw, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PER_PAGE = 10;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { clients, addClient, updateClient, deleteClient, loadData } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    setCustomers(clients);
    setFilteredCustomers(clients);
  }, [clients]);

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const filtered = customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(searchQuery))
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
    setCurrentPage(1);
  }, [searchQuery, customers]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: 'Name is required',
        description: 'Please enter a client name.',
      });
      return;
    }

    if (editingClient) {
      updateClient(editingClient.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      });
      toast({ title: 'Client updated', description: `${form.name} has been updated.` });
      setEditingClient(null);
    } else {
      const client = addClient({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      });
      toast({ title: 'Client added', description: `${client.name} has been added to your clients list.` });
    }

    setForm({ name: '', email: '', phone: '', address: '' });
    setIsDialogOpen(false);
  };

  const openEdit = (customer) => {
    setEditingClient(customer);
    setForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClient = (customer) => {
    if (window.confirm(`Delete client "${customer.name}"?`)) {
      deleteClient(customer.id);
      toast({ title: 'Client deleted', description: 'Client has been removed.' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const pageRows = filteredCustomers.slice(start, start + PER_PAGE);

  const pageNumbers = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pageNumbers.includes(i)) pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) pageNumbers.push('...');
    if (totalPages > 1) pageNumbers.push(totalPages);
  }

  const handleExportCsv = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Address', 'Created At'];
    const rows = clients.map((c) => [
      c.id,
      c.name,
      c.email || '',
      c.phone || '',
      c.address || '',
      c.createdAt || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: 'Export successful', description: 'Clients exported to CSV' });
  };

  return (
    <>
      <Helmet>
        <title>Clients - MyAccounts</title>
        <meta name="description" content="Manage your client database and payment history" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground">Store client details, projects, and balances.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={refreshLoading}
              onClick={async () => {
                setRefreshLoading(true);
                try {
                  await loadData();
                  toast({ title: 'Refreshed', description: 'Client data has been refreshed.' });
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
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        <div className="w-full max-w-[1600px] rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-foreground font-semibold text-lg">Clients</span>
              <span className="bg-primary/20 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full border border-primary/40">
                {filteredCustomers.length} clients
              </span>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary" aria-label="More options">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email address</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Address</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  pageRows.map((customer, index) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm ring-2 ring-border">
                            {(customer.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-foreground font-medium text-sm">{customer.name}</div>
                            <div className="text-muted-foreground text-xs">{customer.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{customer.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{customer.phone || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{customer.address || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleDeleteClient(customer)}
                            className="hover:text-destructive transition-colors p-1 rounded hover:bg-secondary"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            className="hover:text-foreground transition-colors p-1 rounded hover:bg-secondary"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-2 border-border"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-secondary text-foreground'
                        : page === '...'
                        ? 'text-muted-foreground cursor-default'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-2 border-border"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingClient(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Client name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Address (optional)"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingClient ? 'Update Client' : 'Save Client'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Customers;
