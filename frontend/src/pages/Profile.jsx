import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { User, Building2, Landmark, Upload, Eye, EyeOff, Save, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const DEBOUNCE_MS = 600;

function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return String(phone).trim();
}

const Profile = () => {
  const { settings, updateSettings, saveBankDetails } = useFinance();
  const { user } = useAuth();
  const { toast } = useToast();
  const [local, setLocal] = useState(() => ({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    currentPassword: '',
    password: '',
    profileAvatar: settings?.profileAvatar || null,
    phone: settings?.phone || '',
    companyEmail: settings?.email || '',
    address: settings?.address || '',
    website: settings?.website || '',
    openingCash: settings?.openingCash ?? 0,
    ownerCapital: settings?.ownerCapital ?? 0,
    payables: settings?.payables ?? 0,
    ...settings,
  }));
  const [bankForm, setBankForm] = useState({ accountNumber: '', accountName: '', bankName: '', branch: '' });
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!settings) return;
    // Ensure phone number is properly loaded (handle both null and empty string)
    // Convert to string explicitly to handle any type issues
    const phoneValue = settings.phone != null ? String(settings.phone) : '';
    
    setLocal((prev) => {
      // Only update fields that come from settings, preserve user input for other fields
      return {
        ...prev,
        // User info from auth context (don't overwrite if user is typing)
        firstName: user?.name?.split(' ')[0] || prev.firstName || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || prev.lastName || '',
        email: user?.email || prev.email || '',
        // Settings from database - always sync these
        profileAvatar: settings.profileAvatar ?? null,
        phone: phoneValue,
        companyEmail: settings.email ?? '',
        address: settings.address ?? '',
        website: settings.website ?? '',
        businessName: settings.businessName || 'My Business',
        openingCash: settings.openingCash ?? 0,
        ownerCapital: settings.ownerCapital ?? 0,
        payables: settings.payables ?? 0,
        currency: settings.currency || 'LKR',
        taxRate: settings.taxRate ?? 10,
        taxEnabled: settings.taxEnabled ?? true,
        theme: settings.theme || 'dark',
        logo: settings.logo ?? null,
        invoiceThemeColor: settings.invoiceThemeColor || '#F97316',
        expenseCategories: settings.expenseCategories || [],
      };
    });
  }, [settings, user]);

  useEffect(() => {
    const b = settings?.bankDetails;
    if (b) {
      setBankForm({
        accountNumber: b.accountNumber || '',
        accountName: b.accountName || '',
        bankName: b.bankName || '',
        branch: b.branch || '',
      });
    }
  }, [settings?.bankDetails]);

  const debouncedSave = useCallback(
    (partial) => {
      setLocal((prev) => ({ ...prev, ...partial }));
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateSettings(partial);
        saveTimeoutRef.current = null;
      }, DEBOUNCE_MS);
    },
    [updateSettings]
  );

  const saveNow = useCallback(
    (partial) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setLocal((prev) => ({ ...prev, ...partial }));
      updateSettings(partial);
    },
    [updateSettings]
  );

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Save to database - updateSettings will reload from DB and update state
        await updateSettings({ profileAvatar: reader.result });
        // Local state will be updated automatically by updateSettings via FinanceContext
        toast({ title: 'Avatar updated', description: 'Your profile picture has been saved to the database.' });
      } catch (err) {
        toast({ title: 'Upload failed', description: err.message || 'Failed to save avatar to database.', variant: 'destructive' });
      }
    };
    reader.onerror = () => {
      toast({ title: 'Upload failed', description: 'Failed to read image file.', variant: 'destructive' });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update personal details (name, email, password) via users API
      const fullName = `${local.firstName.trim()} ${local.lastName.trim()}`.trim() || user?.name || 'User';
      const nameChanged = fullName !== user?.name;
      const emailChanged = local.email !== user?.email;
      const passwordChanged = local.password && local.currentPassword;

      if (nameChanged || emailChanged || passwordChanged) {
        try {
          await api.users.update(user?.id, {
            name: fullName,
            email: local.email.trim(),
            ...(passwordChanged ? { password: local.password } : {}),
          });
          toast({ title: 'Profile updated', description: 'Your personal details have been saved.' });
          // Refresh user data
          window.dispatchEvent(new CustomEvent('auth:login'));
        } catch (err) {
          toast({ title: 'Error', description: err.message || 'Failed to update personal details.', variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      // Save business profile via settings API
      const settingsUpdates = {
        businessName: local.businessName,
        phone: local.phone,
        profileAvatar: local.profileAvatar,
      };
      await updateSettings(settingsUpdates);

      setLocal((prev) => ({ ...prev, currentPassword: '', password: '' }));
      toast({ title: 'Success', description: 'All profile details have been saved.' });
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const s = local;
  const savedBank = settings?.bankDetails || {};
  const bankFormChanged =
    (bankForm.accountNumber || '').trim() !== (savedBank.accountNumber || '').trim() ||
    (bankForm.accountName || '').trim() !== (savedBank.accountName || '').trim() ||
    (bankForm.bankName || '').trim() !== (savedBank.bankName || '').trim() ||
    (bankForm.branch || '').trim() !== (savedBank.branch || '').trim();

  const businessProfileChanged =
    (s.businessName || '').trim() !== (settings?.businessName || '').trim() ||
    (s.phone || '').trim() !== (settings?.phone || '').trim() ||
    (s.companyEmail || '').trim() !== (settings?.email || '').trim() ||
    (s.address || '').trim() !== (settings?.address || '').trim() ||
    (s.website || '').trim() !== (settings?.website || '').trim();

  const openingBalancesChanged =
    (s.openingCash ?? 0) !== (settings?.openingCash ?? 0) ||
    (s.ownerCapital ?? 0) !== (settings?.ownerCapital ?? 0) ||
    (s.payables ?? 0) !== (settings?.payables ?? 0);

  const hasBusinessChanges = businessProfileChanged || bankFormChanged || openingBalancesChanged;

  const handleSaveBusinessAndBank = async () => {
    setSavingBusiness(true);
    try {
      // Save business profile
      if (businessProfileChanged) {
        await updateSettings({
          businessName: s.businessName?.trim() || 'My Business',
          phone: s.phone?.trim() || '',
          email: s.companyEmail?.trim() || '',
          address: s.address?.trim() || '',
          website: s.website?.trim() || '',
        });
      }

      // Save opening balances
      if (openingBalancesChanged) {
        await updateSettings({
          openingCash: s.openingCash ?? 0,
          ownerCapital: s.ownerCapital ?? 0,
          payables: s.payables ?? 0,
        });
      }

      // Save bank details
      if (bankFormChanged) {
        const an = String(bankForm.accountNumber || '').trim();
        const aname = String(bankForm.accountName || '').trim();
        const bname = String(bankForm.bankName || '').trim();
        if (an && aname && bname) {
          await saveBankDetails({
            accountNumber: an,
            accountName: aname,
            bankName: bname,
            branch: bankForm.branch?.trim() || null,
          });
        }
      }

      toast({
        title: 'Saved',
        description: 'Business profile, bank details, and opening balances have been saved successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save business details.',
        variant: 'destructive',
      });
    } finally {
      setSavingBusiness(false);
    }
  };

  const hasPersonalChanges =
    local.firstName !== (user?.name?.split(' ')[0] || '') ||
    local.lastName !== (user?.name?.split(' ').slice(1).join(' ') || '') ||
    local.email !== user?.email ||
    (local.password && local.currentPassword);

  return (
    <>
      <Helmet>
        <title>Profile - MyAccounts</title>
        <meta name="description" content="Manage your profile, business details, bank account, and branding" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 sm:w-7 sm:h-7" />
            Account
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Change the details of your profile here.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 1. Personal Details */}
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            <h2 className="text-base sm:text-lg font-semibold mb-4">Personal Details</h2>
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <p className="text-xs text-muted-foreground">Upload a profile picture. Square images work best.</p>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {s.profileAvatar ? (
                      <AvatarImage src={s.profileAvatar} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="text-lg">
                      {s.firstName?.[0] || s.lastName?.[0] || user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-fit"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    {s.profileAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Save to database - updateSettings will reload from DB and update state
                            await updateSettings({ profileAvatar: null });
                            // Local state will be updated automatically by updateSettings via FinanceContext
                            toast({ title: 'Avatar removed', description: 'Profile picture has been removed from the database.' });
                          } catch (err) {
                            toast({ title: 'Error', description: err.message || 'Failed to remove avatar from database.', variant: 'destructive' });
                          }
                        }}
                        className="w-fit text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={s.firstName}
                    onChange={(e) => setLocal((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Chamith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={s.lastName}
                    onChange={(e) => setLocal((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Dewmin"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={s.email}
                  onChange={(e) => setLocal((p) => ({ ...p, email: e.target.value }))}
                  placeholder="logozodev@gmail.com"
                />
              </div>

              {/* Password Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={s.currentPassword}
                      onChange={(e) => setLocal((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={s.password}
                      onChange={(e) => setLocal((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={!hasPersonalChanges || saving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Business Profile, Bank Account & Opening Balances */}
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            {/* Business Profile Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold">Business Profile</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Your core business information used across invoices and reports.</p>
              {/* Invoice From preview - how it appears on invoices */}
              <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Invoice From (preview)</p>
                <p className="font-bold text-lg text-foreground mb-2">{s.businessName || 'Company name'}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  {s.phone && <p>Phone — {formatPhoneDisplay(s.phone)}</p>}
                  {s.companyEmail && <p>Email — {s.companyEmail}</p>}
                  {s.website && <p>Website — {s.website}</p>}
                  {s.address && <p>Address — {s.address}</p>}
                  {!s.phone && !s.companyEmail && !s.website && !s.address && (
                    <p className="text-muted-foreground/80">Add phone, email, and website below to see them here and on invoices.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    value={s.businessName}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, businessName: e.target.value }));
                    }}
                    placeholder="My Business"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    value={s.phone ?? ''}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, phone: e.target.value }));
                    }}
                    placeholder="074 1525 537"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Company Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={s.companyEmail ?? ''}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, companyEmail: e.target.value }));
                    }}
                    placeholder="hello@logozodev.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Address (optional)</Label>
                  <Input
                    id="company-address"
                    value={s.address ?? ''}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, address: e.target.value }));
                    }}
                    placeholder="Business address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <Input
                    id="company-website"
                    value={s.website ?? ''}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, website: e.target.value }));
                    }}
                    placeholder="www.logozodev.com"
                  />
                </div>
              </div>
            </div>

            {/* Bank Account Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold">Bank Account</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">For Bank Transfer invoices. Account details are encrypted.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-account-number">Account Number *</Label>
                  <Input
                    id="bank-account-number"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-account-name">Account Name *</Label>
                  <Input
                    id="bank-account-name"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))}
                    placeholder="Your Business Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name *</Label>
                  <Input
                    id="bank-name"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                    placeholder="Commercial Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-branch">Branch (optional)</Label>
                  <Input
                    id="bank-branch"
                    value={bankForm.branch}
                    onChange={(e) => setBankForm((p) => ({ ...p, branch: e.target.value }))}
                    placeholder="Colombo Main"
                  />
                </div>
              </div>
            </div>

            {/* Opening Balances Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-5 h-5 text-primary shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold">Opening Balances</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Starting figures for Balance Sheet. Set when you first use the system.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening-cash">Opening Cash</Label>
                  <Input
                    id="opening-cash"
                    type="number"
                    value={s.openingCash ?? 0}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, openingCash: Number(e.target.value || 0) }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Cash at business start</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-capital">Owner Capital</Label>
                  <Input
                    id="owner-capital"
                    type="number"
                    value={s.ownerCapital ?? 0}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, ownerCapital: Number(e.target.value || 0) }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Owner deposits / investment</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payables">Payables</Label>
                  <Input
                    id="payables"
                    type="number"
                    value={s.payables ?? 0}
                    onChange={(e) => {
                      setLocal((prev) => ({ ...prev, payables: Number(e.target.value || 0) }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Unpaid bills at start</p>
                </div>
              </div>
            </div>

            {/* Single Save Button for All Sections */}
            <div className="pt-6 border-t border-border">
              <Button
                type="button"
                size="sm"
                disabled={!hasBusinessChanges || savingBusiness}
                onClick={handleSaveBusinessAndBank}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {savingBusiness ? 'Saving...' : 'Save Business Details'}
              </Button>
            </div>
          </div>

        </motion.div>
      </div>
    </>
  );
};

export default Profile;
