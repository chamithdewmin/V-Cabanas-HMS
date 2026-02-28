import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { StickyNote, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';

const DailyNotes = () => {
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({
    noteDate: '',
    amount: '',
    note: '',
  });

  const loadNotes = async () => {
    setLoading(true);
    try {
      const list = await api.dailyNotes.list();
      setNotes(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({ title: 'Failed to load daily notes', description: err.message || 'Could not fetch notes', variant: 'destructive' });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.noteDate) {
      toast({ title: 'Date required', description: 'Please select a date.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        noteDate: form.noteDate,
        amount: form.amount !== '' ? Number(form.amount) : null,
        note: (form.note || '').trim(),
      };
      if (editingNote) {
        await api.dailyNotes.update(editingNote.id, payload);
        toast({ title: 'Note updated', description: 'Daily note has been updated.' });
      } else {
        await api.dailyNotes.create(payload);
        toast({ title: 'Note saved', description: 'Daily note has been saved.' });
      }
      setForm({ noteDate: '', amount: '', note: '' });
      setEditingNote(null);
      setIsDialogOpen(false);
      loadNotes();
    } catch (err) {
      toast({ title: editingNote ? 'Update failed' : 'Save failed', description: err.message || 'Could not save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (n) => {
    setEditingNote(n);
    setForm({
      noteDate: n.noteDate ? (typeof n.noteDate === 'string' && n.noteDate.includes('T') ? n.noteDate.slice(0, 10) : n.noteDate) : '',
      amount: n.amount != null ? String(n.amount) : '',
      note: n.note || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (n) => {
    if (!window.confirm('Delete this daily note?')) return;
    try {
      await api.dailyNotes.delete(n.id);
      toast({ title: 'Note deleted', description: 'Daily note has been removed.' });
      loadNotes();
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message || 'Could not delete', variant: 'destructive' });
    }
  };

  const openAdd = () => {
    setEditingNote(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({ noteDate: today, amount: '', note: '' });
    setIsDialogOpen(true);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const s = typeof d === 'string' && d.includes('T') ? d.slice(0, 10) : d;
    return s;
  };

  return (
    <>
      <Helmet>
        <title>Daily Notes - V Cabanas HMS</title>
        <meta name="description" content="Daily notes with date, amount and notes" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Daily Notes</h1>
            <p className="text-muted-foreground">
              Add notes by date with optional amount.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadNotes} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold min-w-[5rem] w-28">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Note</th>
                  <th className="py-3 pl-8 pr-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : notes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No daily notes yet. Click &quot;Add Note&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  notes.map((n) => (
                    <tr key={n.id} className="border-b border-secondary hover:bg-secondary/30">
                      <td className="px-4 py-3 text-sm text-left">{formatDate(n.noteDate)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">
                        {n.amount != null ? Number(n.amount).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-left max-w-md truncate" title={n.note || ''}>
                        {n.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button type="button" onClick={() => openEdit(n)} className="p-1.5 hover:bg-secondary rounded-md text-green-500 hover:text-green-400" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(n)} className="p-1.5 hover:bg-secondary rounded-md text-red-500 hover:text-red-400" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingNote(null);
            setForm({ noteDate: '', amount: '', note: '' });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Daily Note' : 'New Daily Note'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="noteDate">Date</Label>
              <Input
                id="noteDate"
                type="date"
                value={form.noteDate}
                onChange={(e) => handleChange('noteDate', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (optional)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="Leave empty if no amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <textarea
                id="note"
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Enter your note..."
                rows={4}
                className="w-full px-3 py-2 bg-secondary border border-secondary rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-y min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setForm({ noteDate: form.noteDate, amount: '', note: '' })}>
                Clear fields
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (editingNote ? 'Update' : 'Save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailyNotes;
