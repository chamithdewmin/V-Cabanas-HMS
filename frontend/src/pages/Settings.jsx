import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Save, Palette, Trash2, Percent, Receipt, Bell, Mail, Smartphone, Zap, DollarSign, Calendar, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 600;

const Settings = () => {
  const { settings, updateSettings, loadData } = useFinance();
  const { toast } = useToast();
  const [local, setLocal] = useState(() => ({ ...settings }));
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetOtpOpen, setResetOtpOpen] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [saving, setSaving] = useState({});

  useEffect(() => {
    if (!settings) return;
    setLocal((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const handleSaveSection = async (sectionName, fields) => {
    setSaving((prev) => ({ ...prev, [sectionName]: true }));
    try {
      const updates = {};
      fields.forEach((field) => {
        if (local[field] !== undefined) {
          updates[field] = local[field];
        }
      });
      await updateSettings(updates);
      toast({
        title: 'Settings saved',
        description: `${sectionName} settings have been saved successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || `Failed to save ${sectionName} settings.`,
        variant: 'destructive',
      });
    } finally {
      setSaving((prev) => ({ ...prev, [sectionName]: false }));
    }
  };

  const hasChanges = (fields) => {
    return fields.some((k) => {
      const current = local[k];
      const saved = settings?.[k];
      if (current === undefined || saved === undefined) return false;
      return String(current ?? '') !== String(saved ?? '');
    });
  };

  const s = local;

  return (
    <>
      <Helmet>
        <title>Settings - MyAccounts</title>
        <meta name="description" content="Organize and manage business settings, invoices, tax, bank, and preferences" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Organize and manage your business settings.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 1. Appearance */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Appearance</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Interface preferences.</p>
            <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Light or dark mode</p>
              </div>
              <button
                type="button"
                onClick={() => setLocal((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))}
                className={cn(
                  'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                  s.theme === 'dark' ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                )}
              >
                <span className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  s.theme === 'dark' ? 'translate-x-7' : 'translate-x-1',
                )} />
              </button>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['theme']) || saving.appearance}
                onClick={() => handleSaveSection('Appearance', ['theme'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.appearance ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 2. Format Settings */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Format Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Customize date and number formats.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <select
                  id="date-format"
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={s.dateFormat || 'DD/MM/YYYY'}
                  onChange={(e) => setLocal((prev) => ({ ...prev, dateFormat: e.target.value }))}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 19/02/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 02/19/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2026-02-19)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY (e.g., 19-02-2026)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number-format">Number Format</Label>
                <select
                  id="number-format"
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={s.numberFormat || '1,234.56'}
                  onChange={(e) => setLocal((prev) => ({ ...prev, numberFormat: e.target.value }))}
                >
                  <option value="1,234.56">1,234.56 (Comma thousands, dot decimal)</option>
                  <option value="1.234,56">1.234,56 (Dot thousands, comma decimal)</option>
                  <option value="1 234.56">1 234.56 (Space thousands, dot decimal)</option>
                  <option value="1234.56">1234.56 (No separator)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['dateFormat', 'numberFormat']) || saving.format}
                onClick={() => handleSaveSection('Format', ['dateFormat', 'numberFormat'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.format ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 3. Tax & Currency */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Tax & Currency</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Configure taxes and currency for invoices and reports.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={s.currency || 'LKR'}
                  onChange={(e) => setLocal((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="LKR">LKR (රු)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={s.taxRate ?? 10}
                  onChange={(e) => setLocal((prev) => ({ ...prev, taxRate: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="md:col-span-2 rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tax Estimation</p>
                  <p className="text-xs text-muted-foreground">Enable simple tax estimation in reports</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.taxEnabled}
                  onClick={() => setLocal((prev) => ({ ...prev, taxEnabled: !prev.taxEnabled }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    s.taxEnabled ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    s.taxEnabled ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['currency', 'taxRate', 'taxEnabled']) || saving.tax}
                onClick={() => handleSaveSection('Tax & Currency', ['currency', 'taxRate', 'taxEnabled'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.tax ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 4. Invoice & Branding */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Invoice & Branding</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Customize how your invoices look to clients.</p>
            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Invoice Logo</Label>
                <p className="text-xs text-muted-foreground">Optional logo on invoice header. Square images ~80×80 work best.</p>
                <div className="flex items-center gap-4">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setLocal((prev) => ({ ...prev, logo: reader.result }));
                      };
                      reader.onerror = () => {
                        toast({ title: 'Upload failed', description: 'Failed to read image file.', variant: 'destructive' });
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:text-sm file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
                  />
                  {s.logo && (
                    <div className="flex items-center gap-2">
                      <img src={s.logo} alt="Logo" className="h-10 w-10 rounded border border-secondary object-contain bg-white" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocal((prev) => ({ ...prev, logo: null }))}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-theme-color">Invoice Theme Color</Label>
                <p className="text-xs text-muted-foreground">Color for headers, totals, and accents on invoices.</p>
                <div className="flex items-center gap-3">
                  <input
                    id="invoice-theme-color"
                    type="color"
                    value={s.invoiceThemeColor || '#F97316'}
                    onChange={(e) => setLocal((prev) => ({ ...prev, invoiceThemeColor: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded border border-secondary bg-transparent p-0"
                  />
                  <Input
                    type="text"
                    value={s.invoiceThemeColor || '#F97316'}
                    onChange={(e) => setLocal((prev) => ({ ...prev, invoiceThemeColor: e.target.value }))}
                    placeholder="#F97316"
                    className="font-mono w-28"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['logo', 'invoiceThemeColor']) || saving.branding}
                onClick={() => handleSaveSection('Invoice & Branding', ['logo', 'invoiceThemeColor'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.branding ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 5. General Settings */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">General Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Common preferences and behaviors.</p>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Auto-Save</p>
                    <p className="text-xs text-muted-foreground">Automatically save changes as you type</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.autoSave ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, autoSave: !(prev.autoSave ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.autoSave ?? false) ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.autoSave ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Show Currency Symbol</p>
                    <p className="text-xs text-muted-foreground">Display currency symbol in amounts</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.showCurrencySymbol ?? true}
                  onClick={() => setLocal((prev) => ({ ...prev, showCurrencySymbol: !(prev.showCurrencySymbol ?? true) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.showCurrencySymbol ?? true) ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.showCurrencySymbol ?? true) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Invoice Auto-Numbering</p>
                    <p className="text-xs text-muted-foreground">Automatically generate invoice numbers</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.invoiceAutoNumbering ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, invoiceAutoNumbering: !(prev.invoiceAutoNumbering ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.invoiceAutoNumbering ?? false) ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.invoiceAutoNumbering ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Auto Export</p>
                    <p className="text-xs text-muted-foreground">Automatically export data periodically</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.autoExport ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, autoExport: !(prev.autoExport ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.autoExport ?? false) ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.autoExport ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['autoSave', 'showCurrencySymbol', 'invoiceAutoNumbering', 'autoExport']) || saving.general}
                onClick={() => handleSaveSection('General', ['autoSave', 'showCurrencySymbol', 'invoiceAutoNumbering', 'autoExport'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.general ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 6. Notifications */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Manage how you receive updates and alerts.</p>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.emailNotifications ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, emailNotifications: !(prev.emailNotifications ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.emailNotifications ?? false) ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.emailNotifications ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">SMS Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via SMS</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.smsNotifications ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, smsNotifications: !(prev.smsNotifications ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.smsNotifications ?? false) ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.smsNotifications ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['emailNotifications', 'smsNotifications']) || saving.notifications}
                onClick={() => handleSaveSection('Notifications', ['emailNotifications', 'smsNotifications'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.notifications ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Reset Data */}
          <div className="bg-card rounded-lg p-6 border border-destructive/30 border-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete all your data (orders, incomes, expenses, clients, invoices, etc.). Your login account will remain. This cannot be undone.
            </p>
            <Button variant="destructive" onClick={() => setResetConfirmOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Reset Data
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset All Data?</DialogTitle>
            <DialogDescription>
              This will delete all data from our database. Are you sure you want to reset? An OTP will be sent to your registered phone number to confirm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={resetLoading}
              onClick={async () => {
                setResetLoading(true);
                try {
                  const res = await api.auth.sendResetDataOtp();
                  setResetConfirmOpen(false);
                  setResetOtp('');
                  setDevOtp(res.devOtp || '');
                  setResetOtpOpen(true);
                  toast({ title: 'OTP sent', description: res.devOtp ? `Dev OTP: ${res.devOtp}` : 'Check your phone for the OTP.' });
                } catch (err) {
                  toast({ title: 'Failed', description: err?.message || 'Could not send OTP. Add a phone number in Settings first.', variant: 'destructive' });
                } finally {
                  setResetLoading(false);
                }
              }}
            >
              {resetLoading ? 'Sending...' : 'Yes, Reset Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP verification dialog */}
      <Dialog open={resetOtpOpen} onOpenChange={(open) => { setResetOtpOpen(open); if (!open) setResetOtp(''); setDevOtp(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogDescription>
              Enter the OTP sent to your registered phone number to confirm reset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-otp">OTP</Label>
              <Input
                id="reset-otp"
                type="text"
                placeholder="123456"
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
            {devOtp && (
              <p className="text-xs text-muted-foreground">Dev OTP: {devOtp}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetOtpOpen(false); setResetOtp(''); setDevOtp(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={resetLoading || resetOtp.length < 4}
              onClick={async () => {
                setResetLoading(true);
                try {
                  await api.auth.confirmResetData(resetOtp);
                  setResetOtpOpen(false);
                  setResetOtp('');
                  setDevOtp('');
                  await loadData();
                  toast({ title: 'Data reset successfully', description: 'All your data has been deleted.' });
                } catch (err) {
                  toast({ title: 'Verification failed', description: err?.message || 'Invalid or expired OTP.', variant: 'destructive' });
                } finally {
                  setResetLoading(false);
                }
              }}
            >
              {resetLoading ? 'Verifying...' : 'Verify & Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Settings;