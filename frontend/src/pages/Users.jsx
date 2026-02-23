import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, UserPlus, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';

const PROTECTED_EMAIL = 'logozodev@gmail.com';
const PER_PAGE = 10;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const list = await api.users.list();
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({
        title: 'Failed to load users',
        description: err.message || 'Could not fetch users',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        )
      );
    } else {
      setFilteredUsers(users);
    }
    setCurrentPage(1);
  }, [searchQuery, users]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: 'Name and email required',
        description: 'Please enter name and email.',
        variant: 'destructive',
      });
      return;
    }
    if (!editingUser && !form.password) {
      toast({
        title: 'Password required',
        description: 'Please enter a password for new users.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const payload = { name: form.name.trim(), email: form.email.trim() };
        if (form.password) payload.password = form.password;
        await api.users.update(editingUser.id, payload);
        toast({ title: 'User updated', description: `${form.name} has been updated.` });
      } else {
        await api.users.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        toast({ title: 'User added', description: `${form.name} can now log in.` });
      }
      setForm({ name: '', email: '', password: '' });
      setEditingUser(null);
      setIsDialogOpen(false);
      loadUsers();
    } catch (err) {
      toast({
        title: editingUser ? 'Failed to update user' : 'Failed to add user',
        description: err.message || 'Could not save user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user) => {
    if (user.email === PROTECTED_EMAIL) {
      toast({
        title: 'Cannot delete',
        description: 'This account is protected and cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await api.users.delete(user.id);
      toast({ title: 'User deleted', description: `${user.name} has been removed.` });
      loadUsers();
    } catch (err) {
      toast({
        title: 'Failed to delete',
        description: err.message || 'Could not delete user',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const pageRows = filteredUsers.slice(start, start + PER_PAGE);

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

  return (
    <>
      <Helmet>
        <title>Users - MyAccounts</title>
        <meta name="description" content="Manage app users and add new users" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Add and manage users who can log in to the app.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        <div className="w-full max-w-[1600px] rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-foreground font-semibold text-lg">Users</span>
              <span className="bg-primary/20 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full border border-primary/40">
                {filteredUsers.length} users
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
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Email address</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  pageRows.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm ring-2 ring-border">
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-foreground font-medium text-sm">{user.name}</div>
                            <div className="text-muted-foreground text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 bg-secondary border border-border text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="hover:text-destructive transition-colors p-1 rounded hover:bg-secondary"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
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

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          )}

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
            if (!open) setEditingUser(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password {editingUser && '(leave blank to keep)'}</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Password'}
                  required={!editingUser}
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
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Users;
