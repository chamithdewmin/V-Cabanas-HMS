import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useFinance } from '@/contexts/FinanceContext';

const SMS = () => {
  const { clients } = useFinance();
  const { toast } = useToast();
  const [smsConfig, setSmsConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    userId: '',
    apiKey: '',
    baseUrl: 'https://www.smslenz.lk/api',
    senderId: 'SMSlenzDEMO',
  });

  const loadSmsConfig = async () => {
    try {
      const cfg = await api.sms.getSettings();
      setSmsConfig(cfg?.userId ? cfg : null);
      if (cfg?.userId) {
        setForm((f) => ({
          ...f,
          userId: cfg.userId || '',
          apiKey: cfg.apiKey ? '••••••••' : '',
          baseUrl: cfg.baseUrl || f.baseUrl,
          senderId: cfg.senderId || f.senderId,
        }));
      }
    } catch {
      setSmsConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSmsConfig();
  }, []);

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    if (!form.userId.trim() || !form.apiKey.trim() || !form.baseUrl.trim() || !form.senderId.trim()) {
      toast({
        title: 'All fields required',
        description: 'Please fill User ID, API Key, Base URL, and Sender ID.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    setTesting(true);
    try {
      await api.sms.saveSettings({
        userId: form.userId.trim(),
        apiKey: form.apiKey === '••••••••' ? undefined : form.apiKey.trim(),
        baseUrl: form.baseUrl.trim(),
        senderId: form.senderId.trim(),
      });
      await api.sms.test();
      setSmsConfig({ userId: form.userId, baseUrl: form.baseUrl, senderId: form.senderId });
      setSetupOpen(false);
      loadSmsConfig();
      toast({
        title: "You're all set!",
        description: 'SMS gateway is configured correctly.',
      });
    } catch (err) {
      toast({
        title: 'Setup failed',
        description: err.message || 'Invalid credentials or API error. Please check your details.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setTesting(false);
    }
  };

  const handleTestOnly = async () => {
    if (!form.userId.trim() || !form.apiKey.trim() || form.apiKey === '••••••••') {
      toast({
        title: 'Save first',
        description: 'Save your settings before testing.',
        variant: 'destructive',
      });
      return;
    }
    setTesting(true);
    try {
      await api.sms.saveSettings({
        userId: form.userId.trim(),
        apiKey: form.apiKey.trim(),
        baseUrl: form.baseUrl.trim(),
        senderId: form.senderId.trim(),
      });
      await api.sms.test();
      toast({
        title: "You're all set!",
        description: 'SMS gateway is configured correctly.',
      });
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const withPhone = clients.filter((c) => c.phone?.trim());
    if (selectedIds.size === withPhone.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(withPhone.map((c) => c.id)));
    }
  };

  const getPhone = (c) => {
    const p = (c.phone || '').trim();
    if (!p) return null;
    return p.startsWith('+') ? p : `+94${p.replace(/^0/, '')}`;
  };

  const handleSendBulk = async () => {
    const selectedClients = clients.filter((c) => selectedIds.has(c.id));
    const phones = selectedClients.map(getPhone).filter(Boolean);
    if (phones.length === 0) {
      toast({
        title: 'No valid contacts',
        description: 'Select customers with phone numbers.',
        variant: 'destructive',
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter a message.',
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      await api.sms.sendBulk({ contacts: phones, message: message.trim() });
      toast({
        title: 'SMS sent',
        description: `Message sent to ${phones.length} recipient(s).`,
      });
      setMessage('');
      setSelectedIds(new Set());
    } catch (err) {
      toast({
        title: 'Send failed',
        description: err.message || 'Could not send SMS.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const clientsWithPhone = clients.filter((c) => getPhone(c));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>SMS - MyAccounts</title>
        <meta name="description" content="Send SMS to customers" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SMS</h1>
            <p className="text-muted-foreground">
              Send bulk SMS to your customers. Set up your SMS gateway first.
            </p>
          </div>
          <Button variant="outline" onClick={() => setSetupOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            {smsConfig ? 'Edit Gateway' : 'Setup Gateway'}
          </Button>
        </div>

        {!smsConfig ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-secondary rounded-lg p-8 text-center"
          >
            <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setup your SMS gateway</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Enter your SMSlenz.lk (or compatible) gateway details to send SMS to customers.
            </p>
            <Button onClick={() => setSetupOpen(true)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Setup SMS Gateway
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="bg-card border border-secondary rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Select customers</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {clientsWithPhone.length} customer(s) with phone numbers. Select recipients and enter your message.
              </p>
              <div className="max-h-64 overflow-y-auto border border-secondary rounded-lg">
                <table className="w-full">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === clientsWithPhone.length && clientsWithPhone.length > 0}
                          onChange={selectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsWithPhone.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-secondary hover:bg-secondary/30"
                      >
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">{c.name}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{c.phone}</td>
                      </tr>
                    ))}
                    {clientsWithPhone.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No customers with phone numbers. Add phone numbers to your clients first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">Message (max 621 chars)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full min-h-[100px] px-3 py-2 bg-background border border-secondary rounded-lg resize-none"
                  maxLength={621}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{message.length}/621</span>
                  <Button
                    onClick={handleSendBulk}
                    disabled={selectedIds.size === 0 || !message.trim() || sending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : `Send to ${selectedIds.size} recipient(s)`}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup SMS Gateway</DialogTitle>
            <DialogDescription>
              Enter your SMS gateway credentials. Use SMSlenzDEMO as Sender ID for testing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAndTest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                placeholder="e.g. 295"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="Your API key"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Base URL</label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://www.smslenz.lk/api"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sender ID</label>
              <Input
                value={form.senderId}
                onChange={(e) => setForm((f) => ({ ...f, senderId: e.target.value }))}
                placeholder="SMSlenzDEMO (for testing)"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use SMSlenzDEMO for testing. Get your credentials from smslenz.lk
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestOnly}
                disabled={testing || !form.userId || !form.apiKey || form.apiKey === '••••••••'}
              >
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button type="submit" disabled={saving || testing}>
                {saving ? 'Saving...' : 'Save & Test'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SMS;
