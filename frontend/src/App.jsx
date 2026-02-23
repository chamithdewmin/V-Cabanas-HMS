import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useFinance } from './contexts/FinanceContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import ReportOverview from './pages/reports/ReportOverview';
import ReportIncome from './pages/reports/ReportIncome';
import ReportExpense from './pages/reports/ReportExpense';
import ReportTax from './pages/reports/ReportTax';
import BalanceSheet from './pages/reports/BalanceSheet';
import ReportProfitLoss from './pages/reports/ReportProfitLoss';
import ReportCashFlow from './pages/reports/ReportCashFlow';
import CashFlow from './pages/CashFlow';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Users from './pages/Users';
import SMS from './pages/SMS';
import Reminders from './pages/Reminders';
import AIInsights from './pages/AIInsights';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Layout from './components/Layout';

function App() {
  const { isAuthenticated, loading, user } = useAuth();
  const { settings } = useFinance();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ai-insights" element={<AIInsights />} />
        <Route path="income" element={<POS />} />
        <Route path="expenses" element={<Inventory />} />
        <Route path="invoices" element={<Orders />} />
        <Route path="clients" element={<Customers />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="reports" element={<Navigate to="/reports/overview" replace />} />
        <Route path="reports/overview" element={<ReportOverview />} />
        <Route path="reports/profit-loss" element={<ReportProfitLoss />} />
        <Route path="reports/cash-flow" element={<ReportCashFlow />} />
        <Route path="reports/income" element={<ReportIncome />} />
        <Route path="reports/expense" element={<ReportExpense />} />
        <Route path="reports/tax" element={<ReportTax />} />
        <Route path="reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="users" element={user?.email === 'logozodev@gmail.com' ? <Users /> : <Navigate to="/ai-insights" replace />} />
        <Route path="sms" element={<SMS />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;