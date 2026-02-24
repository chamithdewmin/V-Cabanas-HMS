import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Tag, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const Pricing = () => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    notes: '',
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const list = await api.pricing.list();
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ title: 'Failed to load pricing', description: err.message || 'Could not fetch pricing', variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      toast({
        title: 'Missing details',
        description: 'Please enter a name and price.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), price: Number(form.price), notes: (form.notes || '').trim() };
      if (editingItem) {
        await api.pricing.update(editingItem.id, payload);
        toast({ title: 'Pricing updated', description: 'Pricing item has been updated.' });
      } else {
        await api.pricing.create(payload);
        toast({ title: 'Pricing added', description: 'New pricing item has been saved.' });
      }
      setForm({ name: '', price: '', notes: '' });
      setEditingItem(null);
      setIsDialogOpen(false);
      loadItems();
    } catch (err) {
      toast({ title: editingItem ? 'Update failed' : 'Save failed', description: err.message || 'Could not save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: String(item.price ?? ''),
      notes: item.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete pricing item "${item.name}"?`)) return;
    try {
      await api.pricing.delete(item.id);
      toast({ title: 'Pricing deleted', description: `"${item.name}" has been removed.` });
      loadItems();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message || 'Could not delete', variant: 'destructive' });
    }
  };

  const filteredItems = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.name.toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q);
  });

  return (
    <>
      <Helmet>
        <title>Pricing - V Cabanas HMS</title>
        <meta name="description" content="Manage room and service pricing" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pricing</h1>
            <p className="text-muted-foreground">
              Manage room and service prices used across your property.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadItems} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setForm({ name: '', price: '', notes: '' });
                setIsDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pricing
            </Button>
          </div>
        </div>

        {/* Summary style header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-secondary p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Pricing items
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <div className="max-w-xl">
          <Input
            placeholder="Search pricing by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-24">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground text-sm"
                    >
                      No pricing items yet. Click &quot;Add Pricing&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-left">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-left text-muted-foreground">
                        {item.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right tabular-nums min-w-[5rem] w-24">
                        {item.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / edit pricing dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            setForm({ name: '', price: '', notes: '' });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Pricing' : 'Add Pricing'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pricing name</Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Deluxe AC Room, Airport Pickup"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="Enter price"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <textarea
                className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any additional info about this price"
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
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (editingItem ? 'Update Pricing' : 'Save Pricing')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Pricing;

