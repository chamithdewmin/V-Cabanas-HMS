import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useFinance } from './contexts/FinanceContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import ReportOverview from './pages/reports/ReportOverview';
import ReportIncome from './pages/reports/ReportIncome';
import ReportExpense from './pages/reports/ReportExpense';
import ReportTax from './pages/reports/ReportTax';
import ReportProfitLoss from './pages/reports/ReportProfitLoss';
import ReportCashFlow from './pages/reports/ReportCashFlow';
import ReportMonthly from './pages/reports/ReportMonthly';
import CashFlow from './pages/CashFlow';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Users from './pages/Users';
import LoginActivity from './pages/LoginActivity';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Booking from './pages/Booking';
import Pricing from './pages/Pricing';
import SalaryManagement from './pages/SalaryManagement';
import DailyNotes from './pages/DailyNotes';
import Layout from './components/Layout';
import { staffHomePath } from './lib/navAccess';

function AppHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={staffHomePath(user?.role)} replace />;
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Login />;
  return <Navigate to={staffHomePath(user?.role)} replace />;
}

function ForgotPasswordRoute() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <ForgotPassword />;
  return <Navigate to={staffHomePath(user?.role)} replace />;
}

function App() {
  const { isAuthenticated, loading } = useAuth();
  const { settings } = useFinance();

  useEffect(() => {
    try {
      const cachedTheme = localStorage.getItem('vcabanas-theme');
      if (cachedTheme !== 'dark' && cachedTheme !== 'light') return;
      const root = document.documentElement;
      if (cachedTheme === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    } catch (_) {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme === 'dark' ? 'dark' : 'light';
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('vcabanas-theme', theme);
    } catch (_) {}
  }, [settings.theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" role="status" aria-label="Loading" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<AppHomeRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="expenses" element={<Inventory />} />
        <Route path="invoices" element={<Orders />} />
        <Route path="clients" element={<Customers />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="booking" element={<Booking />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="salary-management" element={<SalaryManagement />} />
        <Route path="daily-notes" element={<DailyNotes />} />
        <Route path="reports" element={<Navigate to="/reports/overview" replace />} />
        <Route path="reports/overview" element={<ReportOverview />} />
        <Route path="reports/profit-loss" element={<ReportProfitLoss />} />
        <Route path="reports/cash-flow" element={<ReportCashFlow />} />
        <Route path="reports/income" element={<ReportIncome />} />
        <Route path="reports/expense" element={<ReportExpense />} />
        <Route path="reports/tax" element={<ReportTax />} />
        <Route path="reports/monthly" element={<ReportMonthly />} />
        <Route path="users" element={<Users />} />
        <Route path="login-activity" element={<LoginActivity />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;