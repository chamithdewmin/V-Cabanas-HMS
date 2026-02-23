import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const FinanceContext = createContext(null);

const hasToken = () => !!localStorage.getItem('token');

const createId = (prefix) => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
};

const getDefaultSettings = () => ({
  businessName: 'My Business',
  phone: '',
  email: '',
  address: '',
  website: '',
  bankDetails: null, // { accountNumber, accountName, bankName, branch? }
  currency: 'LKR',
  taxRate: 10,
  taxEnabled: true,
  theme: 'dark',
  logo: null, // data URL for logo image
  profileAvatar: null, // data URL for user profile avatar
  invoiceThemeColor: '#F97316', // Orange - used for invoice bands, headers, totals
  openingCash: 0, // Opening cash balance at business start
  ownerCapital: 0, // Owner deposits / initial investment
  payables: 0, // Unpaid bills (manual entry until bills feature exists)
  expenseCategories: [
    'Hosting',
    'Tools & Subscriptions',
    'Advertising & Marketing',
    'Transport',
    'Office & Utilities',
    'Personal Use',
    'Rent',
    'Salaries & Wages',
    'Insurance',
    'Software & Licenses',
    'Travel',
    'Meals & Entertainment',
    'Supplies & Materials',
    'Professional Services',
    'Bank & Finance Charges',
    'Other',
  ],
  // Notification settings (off by default)
  emailNotifications: false,
  smsNotifications: false,
  // General settings
  autoSave: false,
  showCurrencySymbol: true, // Commonly used, on by default
  invoiceAutoNumbering: false,
  autoExport: false,
  // Format settings
  dateFormat: 'DD/MM/YYYY',
  numberFormat: '1,234.56',
});

export const FinanceProvider = ({ children }) => {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [settings, setSettings] = useState(getDefaultSettings);
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const loadData = async () => {
    if (!hasToken()) {
      setIncomes([]);
      setExpenses([]);
      setClients([]);
      setInvoices([]);
      setSettings(getDefaultSettings());
      setAssets([]);
      setLoans([]);
      setTransfers([]);
      return;
    }
    try {
      const [incomesRes, expensesRes, clientsRes, invoicesRes, settingsRes, assetsRes, loansRes, transfersRes, bankDetailsRes] = await Promise.all([
        api.incomes.list().catch(() => []),
        api.expenses.list().catch(() => []),
        api.clients.list().catch(() => []),
        api.invoices.list().catch(() => []),
        api.settings.get().catch(() => getDefaultSettings()),
        api.assets.list().catch(() => []),
        api.loans.list().catch(() => []),
        api.transfers.list().catch(() => []),
        api.bankDetails.get().catch(() => ({ bankDetails: null })),
      ]);
      setIncomes(Array.isArray(incomesRes) ? incomesRes : []);
      setExpenses(Array.isArray(expensesRes) ? expensesRes : []);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setInvoices(Array.isArray(invoicesRes) ? invoicesRes : []);
      const settingsMerged = settingsRes && typeof settingsRes === 'object' ? { ...getDefaultSettings(), ...settingsRes } : getDefaultSettings();
      // Always use full default expense categories so Add Expense popup shows all options
      settingsMerged.expenseCategories = getDefaultSettings().expenseCategories;
      settingsMerged.bankDetails = bankDetailsRes?.bankDetails ?? null;
      setSettings(settingsMerged);
      setAssets(Array.isArray(assetsRes) ? assetsRes : []);
      setLoans(Array.isArray(loansRes) ? loansRes : []);
      setTransfers(Array.isArray(transfersRes) ? transfersRes : []);
    } catch {
      setIncomes([]);
      setExpenses([]);
      setClients([]);
      setInvoices([]);
      setSettings(getDefaultSettings());
      setAssets([]);
      setLoans([]);
      setTransfers([]);
    }
  };

  // Load from database when logged in, refetch on focus
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (hasToken()) loadData();
    };
    const onLogin = () => loadData();
    window.addEventListener('focus', onFocus);
    window.addEventListener('auth:login', onLogin);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('auth:login', onLogin);
    };
  }, []);

  const addClient = async (data) => {
    if (hasToken()) {
      const client = await api.clients.create({ name: data.name, email: data.email, phone: data.phone, address: data.address, projects: data.projects });
      setClients((prev) => [client, ...prev]);
      return client;
    }
    const client = { id: createId('CL'), name: data.name.trim(), email: data.email?.trim() || '', phone: data.phone?.trim() || '', address: data.address?.trim() || '', projects: data.projects || [], createdAt: data.createdAt || new Date().toISOString() };
    setClients((prev) => [client, ...prev]);
    return client;
  };

  const addIncome = async (data) => {
    const payload = { ...data, currency: settings.currency };
    if (hasToken()) {
      const income = await api.incomes.create(payload);
      setIncomes((prev) => [income, ...prev]);
      return income;
    }
    const income = { id: createId('INC'), clientId: data.clientId || null, clientName: data.clientName?.trim() || '', serviceType: data.serviceType?.trim() || '', paymentMethod: data.paymentMethod || 'cash', amount: Number(data.amount) || 0, currency: settings.currency, date: data.date || new Date().toISOString(), notes: data.notes || '', createdAt: new Date().toISOString(), isRecurring: Boolean(data.isRecurringInflow), recurringFrequency: data.recurringFrequency || 'monthly', recurringEndDate: data.continueIndefinitely ? null : data.recurringEndDate || null, recurringNotes: data.recurringNotes || '' };
    setIncomes((prev) => [income, ...prev]);
    return income;
  };

  const addExpense = async (data) => {
    const payload = { ...data, currency: settings.currency };
    if (hasToken()) {
      const expense = await api.expenses.create(payload);
      setExpenses((prev) => [expense, ...prev]);
      return expense;
    }
    const expense = { id: createId('EXP'), category: data.category || 'Other', amount: Number(data.amount) || 0, currency: settings.currency, date: data.date || new Date().toISOString(), notes: data.notes || '', paymentMethod: data.paymentMethod || 'cash', isRecurring: Boolean(data.isRecurring), recurringFrequency: data.recurringFrequency || 'monthly', recurringEndDate: data.continueIndefinitely ? null : data.recurringEndDate || null, recurringNotes: data.recurringNotes || '', receipt: data.receipt || null, createdAt: new Date().toISOString() };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  };

  const addInvoice = async (data) => {
    const inv = { ...data, taxRate: settings.taxEnabled ? settings.taxRate : 0, taxAmount: data.taxAmount ?? (settings.taxEnabled ? (Number(data.subtotal) || 0) * (settings.taxRate / 100) : 0), total: data.total || Number(data.subtotal) + (data.taxAmount ?? 0), bankDetails: data.bankDetails || null, showSignatureArea: Boolean(data.showSignatureArea) };
    if (hasToken()) {
      const invoice = await api.invoices.create(inv);
      setInvoices((prev) => [invoice, ...prev]);
      return invoice;
    }
    const invoiceNumber = data.invoiceNumber || createId('INV');
    const invoice = { id: invoiceNumber, invoiceNumber, clientId: data.clientId || null, clientName: data.clientName?.trim() || '', clientEmail: data.clientEmail?.trim() || '', clientPhone: data.clientPhone?.trim() || '', items: data.items || [], subtotal: Number(data.subtotal) || 0, taxRate: settings.taxEnabled ? settings.taxRate : 0, taxAmount: inv.taxAmount, total: Number(inv.total) || Number(data.subtotal) + inv.taxAmount, paymentMethod: data.paymentMethod || 'bank', status: data.status || 'unpaid', dueDate: data.dueDate || new Date().toISOString(), createdAt: data.createdAt || new Date().toISOString(), notes: data.notes || '', bankDetails: data.bankDetails || null, showSignatureArea: Boolean(data.showSignatureArea) };
    setInvoices((prev) => [invoice, ...prev]);
    return invoice;
  };

  const updateInvoiceStatus = async (invoiceId, status) => {
    if (hasToken()) await api.invoices.updateStatus(invoiceId, status);
    setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId || inv.invoiceNumber === invoiceId ? { ...inv, status } : inv)));
  };

  const updateIncome = async (id, data) => {
    if (hasToken()) {
      const updated = await api.incomes.update(id, data);
      setIncomes((prev) => prev.map((i) => (i.id === id ? updated : i)));
      return;
    }
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, clientId: data.clientId ?? i.clientId, clientName: data.clientName ?? i.clientName, serviceType: data.serviceType ?? i.serviceType, paymentMethod: data.paymentMethod ?? i.paymentMethod, amount: Number(data.amount) ?? i.amount, date: data.date ?? i.date, notes: data.notes ?? i.notes, isRecurring: data.isRecurringInflow ?? i.isRecurring, recurringFrequency: data.recurringFrequency ?? i.recurringFrequency, recurringEndDate: data.continueIndefinitely ? null : (data.recurringEndDate ?? i.recurringEndDate), recurringNotes: data.recurringNotes ?? i.recurringNotes } : i)));
  };

  const deleteIncome = async (id) => {
    if (hasToken()) await api.incomes.delete(id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const updateExpense = async (id, data) => {
    if (hasToken()) {
      const updated = await api.expenses.update(id, data);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
      return;
    }
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, category: data.category ?? e.category, amount: Number(data.amount) ?? e.amount, date: data.date ?? e.date, paymentMethod: data.paymentMethod ?? e.paymentMethod, isRecurring: data.isRecurring ?? e.isRecurring, recurringFrequency: data.recurringFrequency ?? e.recurringFrequency, recurringEndDate: data.continueIndefinitely ? null : (data.recurringEndDate ?? e.recurringEndDate), recurringNotes: data.recurringNotes ?? e.recurringNotes, notes: data.notes ?? e.notes, receipt: data.receipt ?? e.receipt } : e)));
  };

  const deleteExpense = async (id) => {
    if (hasToken()) await api.expenses.delete(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const updateClient = async (id, data) => {
    if (hasToken()) {
      const updated = await api.clients.update(id, data);
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return;
    }
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, name: data.name ?? c.name, email: data.email ?? c.email, phone: data.phone ?? c.phone, address: data.address ?? c.address } : c)));
  };

  const deleteClient = async (id) => {
    if (hasToken()) await api.clients.delete(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const deleteInvoice = async (id) => {
    if (hasToken()) await api.invoices.delete(id);
    setInvoices((prev) => prev.filter((inv) => inv.id !== id && inv.invoiceNumber !== id));
  };

  const updateSettings = async (partial) => {
    if (hasToken()) {
      try {
        // Update settings via API - backend returns updated settings
        const updated = await api.settings.update(partial);
        // Use the updated settings from database response
        if (updated && typeof updated === 'object') {
          const settingsMerged = { ...getDefaultSettings(), ...updated };
          // Preserve bankDetails from current state
          settingsMerged.bankDetails = settings.bankDetails;
          setSettings(settingsMerged);
        } else {
          // Fallback: reload from database if response format is unexpected
          const settingsRes = await api.settings.get().catch(() => getDefaultSettings());
          const settingsMerged = settingsRes && typeof settingsRes === 'object' ? { ...getDefaultSettings(), ...settingsRes } : getDefaultSettings();
          settingsMerged.bankDetails = settings.bankDetails;
          setSettings(settingsMerged);
        }
      } catch (error) {
        console.error('Failed to update settings:', error);
        // Still update local state for offline mode, but show error
        setSettings((prev) => ({ ...prev, ...partial }));
        throw error;
      }
    } else {
      // Offline mode: just update local state
      setSettings((prev) => ({ ...prev, ...partial }));
    }
  };

  const saveBankDetails = async (data) => {
    if (!hasToken()) throw new Error('Login required to save bank details');
    const res = await api.bankDetails.save(data);
    setSettings((prev) => ({ ...prev, bankDetails: res.bankDetails }));
    return res;
  };

  const addAsset = async (data) => {
    if (hasToken()) {
      const asset = await api.assets.create(data);
      setAssets((prev) => [asset, ...prev]);
      return asset;
    }
    const asset = { id: createId('AST'), name: data.name?.trim() || 'Asset', amount: Number(data.amount) || 0, date: data.date || new Date().toISOString(), createdAt: new Date().toISOString() };
    setAssets((prev) => [asset, ...prev]);
    return asset;
  };

  const deleteAsset = async (id) => {
    if (hasToken()) await api.assets.delete(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const addLoan = async (data) => {
    if (hasToken()) {
      const loan = await api.loans.create(data);
      setLoans((prev) => [loan, ...prev]);
      return loan;
    }
    const loan = { id: createId('LN'), name: data.name?.trim() || 'Loan', amount: Number(data.amount) || 0, date: data.date || new Date().toISOString(), createdAt: new Date().toISOString() };
    setLoans((prev) => [loan, ...prev]);
    return loan;
  };

  const deleteLoan = async (id) => {
    if (hasToken()) await api.loans.delete(id);
    setLoans((prev) => prev.filter((l) => l.id !== id));
  };

  const addTransfer = async (data) => {
    if (hasToken()) {
      const t = await api.transfers.create(data);
      setTransfers((prev) => [t, ...prev]);
      return t;
    }
    const t = { id: createId('TRF'), fromAccount: data.fromAccount, toAccount: data.toAccount, amount: Number(data.amount) || 0, date: data.date || new Date().toISOString().slice(0, 10), notes: data.notes || '', createdAt: new Date().toISOString() };
    setTransfers((prev) => [t, ...prev]);
    return t;
  };

  const deleteTransfer = async (id) => {
    if (hasToken()) await api.transfers.delete(id);
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  const totals = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const isSameMonth = (iso) => {
      const d = new Date(iso);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    };

    const isSameYear = (iso) => new Date(iso).getFullYear() === thisYear;

    const monthlyIncome = incomes.filter((i) => isSameMonth(i.date)).reduce((sum, i) => sum + i.amount, 0);
    const yearlyIncome = incomes.filter((i) => isSameYear(i.date)).reduce((sum, i) => sum + i.amount, 0);

    const monthlyExpenses = expenses.filter((e) => isSameMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const yearlyExpenses = expenses.filter((e) => isSameYear(e.date)).reduce((sum, e) => sum + e.amount, 0);

    const monthlyProfit = monthlyIncome - monthlyExpenses;
    const yearlyProfit = yearlyIncome - yearlyExpenses;

    const pendingPayments = invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

    const estimatedTaxMonthly =
      settings.taxEnabled && monthlyProfit > 0 ? (monthlyProfit * settings.taxRate) / 100 : 0;
    const estimatedTaxYearly =
      settings.taxEnabled && yearlyProfit > 0 ? (yearlyProfit * settings.taxRate) / 100 : 0;

    const openingCash = Number(settings.openingCash) || 0;
    const norm = (pm) => String(pm || '').toLowerCase().replace(/\s+/g, '_');
    const isCash = (pm) => !pm || norm(pm) === 'cash';
    const isBank = (pm) => ['bank', 'card', 'online', 'online_transfer', 'online_payment'].includes(norm(pm));
    const incomeCash = incomes.filter((i) => isCash(i.paymentMethod)).reduce((s, i) => s + i.amount, 0);
    const incomeBank = incomes.filter((i) => isBank(i.paymentMethod)).reduce((s, i) => s + i.amount, 0);
    const expenseCash = expenses.filter((e) => isCash(e.paymentMethod)).reduce((s, e) => s + e.amount, 0);
    const expenseBank = expenses.filter((e) => isBank(e.paymentMethod)).reduce((s, e) => s + e.amount, 0);
    const cashToBank = transfers.filter((t) => t.fromAccount === 'cash' && t.toAccount === 'bank').reduce((s, t) => s + (t.amount || 0), 0);
    const bankToCash = transfers.filter((t) => t.fromAccount === 'bank' && t.toAccount === 'cash').reduce((s, t) => s + (t.amount || 0), 0);
    const cashInHand = openingCash + incomeCash - expenseCash - cashToBank + bankToCash;
    const bankBalance = incomeBank - expenseBank + cashToBank - bankToCash;

    return {
      monthlyIncome,
      yearlyIncome,
      monthlyExpenses,
      yearlyExpenses,
      monthlyProfit,
      yearlyProfit,
      pendingPayments,
      estimatedTaxMonthly,
      estimatedTaxYearly,
      cashInHand,
      bankBalance,
    };
  }, [incomes, expenses, invoices, transfers, settings.taxEnabled, settings.taxRate, settings.openingCash]);

  const value = {
    incomes,
    expenses,
    clients,
    invoices,
    settings,
    assets,
    loans,
    loadData,
    addClient,
    addIncome,
    addExpense,
    addInvoice,
    updateIncome,
    deleteIncome,
    updateExpense,
    deleteExpense,
    updateClient,
    deleteClient,
    updateInvoiceStatus,
    deleteInvoice,
    updateSettings,
    saveBankDetails,
    addAsset,
    deleteAsset,
    addLoan,
    deleteLoan,
    transfers,
    addTransfer,
    deleteTransfer,
    totals,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return ctx;
};

