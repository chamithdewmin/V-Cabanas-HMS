import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const formatPhone = (p) => {
  if (!p?.trim()) return '';
  const s = String(p).trim();
  return s.startsWith('+') ? s : `+94${s.replace(/^0/, '')}`;
};

const RemindBySmsModal = ({ open, onOpenChange, item, type, defaultMessage, settings, clients = [] }) => {
  const { toast } = useToast();
  const [smsConfigured, setSmsConfigured] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const currency = settings?.currency || 'LKR';
  const itemAmount = item?.amount ?? item?.total ?? 0;
  const itemDate = item?.date || item?.dueDate || '';
  const clientName = item?.clientName || item?.client_name || '';
  const category = item?.category || '';
  const clientFromList = item?.clientId ? clients.find((c) => c.id === item.clientId) : null;
  const clientPhone = item?.phone || item?.client_phone || clientFromList?.phone || '';

  useEffect(() => {
    if (!open) return;
    setPhone(clientPhone ? formatPhone(clientPhone) : '');
    setMessage(defaultMessage || (type === 'income'
      ? `Hi${clientName ? ` ${clientName}` : ''}, this is a friendly reminder about your payment of ${currency} ${Number(itemAmount).toLocaleString()}${itemDate ? ` (${itemDate.slice(0, 10)})` : ''}. Thank you.`
      : `Reminder: ${category ? `${category} - ` : ''}${currency} ${Number(itemAmount).toLocaleString()}${itemDate ? ` (${itemDate.slice(0, 10)})` : ''}.`));
    const check = async () => {
      setLoading(true);
      try {
        const cfg = await api.sms.getSettings();
        setSmsConfigured(!!cfg?.userId);
      } catch {
        setSmsConfigured(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [open, type, item, clientName, clientPhone, itemAmount, itemDate, category, currency, defaultMessage]);

  const handleSend = async (e) => {
    e.preventDefault();
    const p = formatPhone(phone);
    if (!p) {
      toast({ title: 'Phone number required', description: 'Enter a valid mobile number.', variant: 'destructive' });
      return;
    }
    if (!message.trim()) {
      toast({ title: 'Message required', description: 'Enter the reminder message.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await api.sms.sendBulk({ contacts: [p], message: message.trim().slice(0, 621) });
      toast({ title: 'Reminder sent', description: 'SMS sent successfully.' });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Send failed', description: err.message || 'Could not send SMS.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Remind by SMS
          </DialogTitle>
          <DialogDescription>Send an SMS reminder{type === 'income' ? ' for this income payment' : type === 'expense' ? ' for this expense' : ''}.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Checking SMS setup...</p>
        ) : !smsConfigured ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">SMS gateway not configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You need to set up your SMS gateway before you can send reminders. Go to the SMS page, enter your credentials, and save.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/sms" onClick={() => onOpenChange(false)}>Go to SMS Setup</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <Label>Recipient phone number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94761234567 or 0761234567"
              />
            </div>
            <div>
              <Label>Message (max 621 characters)</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[120px] px-3 py-2 bg-background border border-secondary rounded-lg resize-none text-sm"
                maxLength={621}
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/621</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send SMS'}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RemindBySmsModal;
