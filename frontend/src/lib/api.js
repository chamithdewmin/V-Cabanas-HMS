/**
 * MyAccounts API client
 * Base URL: same domain /api when deployed, or VITE_API_URL env
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('token');

const request = async (path, options = {}) => {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    const err = data.error || data.message || (data.data && (data.data.error || data.data.message)) || `HTTP ${res.status}`;
    throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
  return data;
};

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => request('/auth/me'),
    forgotPassword: (phone) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone, otp) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),
    resetPassword: (resetToken, newPassword) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) }),
    sendResetDataOtp: () => request('/auth/send-reset-data-otp', { method: 'POST' }),
    confirmResetData: (otp) => request('/auth/confirm-reset-data', { method: 'POST', body: JSON.stringify({ otp }) }),
  },
  clients: {
    list: () => request('/clients'),
    create: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  },
  incomes: {
    list: () => request('/incomes'),
    create: (data) => request('/incomes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/incomes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/incomes/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list: () => request('/expenses'),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: () => request('/invoices'),
    get: (id) => request(`/invoices/${id}`),
    create: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    delete: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },
  bankDetails: {
    get: () => request('/bank-details'),
    save: (data) => request('/bank-details', { method: 'POST', body: JSON.stringify(data) }),
  },
  assets: {
    list: () => request('/assets'),
    create: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
  },
  loans: {
    list: () => request('/loans'),
    create: (data) => request('/loans', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/loans/${id}`, { method: 'DELETE' }),
  },
  cars: {
    list: () => request('/cars'),
    create: (data) => request('/cars', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/cars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/cars/${id}`, { method: 'DELETE' }),
  },
  customers: {
    list: () => request('/customers'),
    create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => request('/orders'),
    create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    list: () => request('/users'),
    create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  },
  sms: {
    getSettings: () => request('/sms/settings'),
    saveSettings: (data) => request('/sms/settings', { method: 'PUT', body: JSON.stringify(data) }),
    test: () => request('/sms/test', { method: 'POST' }),
    sendBulk: (data) => request('/sms/send-bulk', { method: 'POST', body: JSON.stringify(data) }),
  },
  transfers: {
    list: () => request('/transfers'),
    create: (data) => request('/transfers', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/transfers/${id}`, { method: 'DELETE' }),
  },
  reminders: {
    list: () => request('/reminders'),
    create: (data) => request('/reminders', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/reminders/${id}`, { method: 'DELETE' }),
  },
  ai: {
    getSummary: () => request('/ai/summary'),
    getSuggestions: () => request('/ai/suggestions', { method: 'POST', body: JSON.stringify({}) }),
    ask: (question) => request('/ai/ask', { method: 'POST', body: JSON.stringify({ question: question.trim() }) }),
  },
};

export const useApi = () => !!import.meta.env.VITE_API_URL || window.location.origin.includes('myaccounts.logozodev.com');
