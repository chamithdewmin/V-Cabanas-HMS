import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// ─── MASTERCARD ───────────────────────────────────────────────────────────────
const MastercardIcon = () => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EB001B", marginRight: -11, zIndex: 1 }} />
    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#F79E1B" }} />
  </div>
);

// ─── CARD FACE COMPONENT ─────────────────────────────────────────────────────
const CardFace = ({ card }) => (
  <div style={{
    width: "100%", height: "100%",
    borderRadius: 16,
    background: card.gradient,
    boxShadow: `0 20px 50px ${card.shadow}, 0 8px 20px rgba(0,0,0,0.4)`,
    padding: "22px 20px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  }}>
    {/* Glossy top */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "52%",
      background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
      borderRadius: "16px 16px 0 0",
      pointerEvents: "none",
    }} />
    {/* Circle deco */}
    <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.07)", top: -70, right: -50 }} />
    <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)", bottom: -40, left: -30 }} />

    {/* Top row */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
      <div>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
          {card.label}
        </p>
        <p style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {card.amount}
        </p>
      </div>
      {card.showMastercard ? <MastercardIcon /> : (
        <div style={{ fontSize: 28 }}>{card.emoji}</div>
      )}
    </div>

    {/* Bottom row */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 2 }}>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "monospace", letterSpacing: "0.14em", margin: 0 }}>
        {card.number}
      </p>
      <p style={{
        color: "rgba(255,255,255,0.8)",
        fontSize: 14, fontWeight: 600, margin: 0,
      }}>
        {card.expiry}
      </p>
    </div>
  </div>
);

// ─── UPWARD TRENDING GRAPH ICON ───────────────────────────────────────────────
const UpwardTrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 14L7 10L10 13L17 6"
      stroke="#22c55e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 6L13 6L13 10"
      stroke="#22c55e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── CARD ICON ────────────────────────────────────────────────────────────────
const CardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10H22" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="16" y="14" width="4" height="3" rx="0.5" fill="#fff"/>
  </svg>
);

// ─── CASH ICON ────────────────────────────────────────────────────────────────
const CashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="7" width="20" height="12" rx="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 9H7M17 9H18M6 17H7M17 17H18" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#1e2433", border: "1px solid #2a3347", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: "#fff", fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: 12, margin: "2px 0" }}>
            {currency} {p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconBg, label, value, badge, badgeColor }) => {
  const isPositive = badgeColor === "green";
  const badgeBg = isPositive 
    ? "rgba(34,197,94,0.2)" 
    : "rgba(239,68,68,0.2)";
  const badgeTextColor = isPositive ? "#22c55e" : "#ef4444";
  const badgeGlow = isPositive
    ? "0 0 8px rgba(34,197,94,0.4), 0 0 4px rgba(34,197,94,0.2)"
    : "0 0 8px rgba(239,68,68,0.4), 0 0 4px rgba(239,68,68,0.2)";

  return (
    <div style={{
      background: "#13161e",
      borderRadius: 16,
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      flex: 1,
      border: "1px solid #1e2433",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ color: "#8b9ab0", fontSize: 12, margin: 0, fontWeight: 500 }}>{label}</p>
          {badge && (
            <span style={{
              background: badgeBg,
              color: badgeTextColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              boxShadow: badgeGlow,
              fontFamily: "'Inter', sans-serif",
            }}>{badge}</span>
          )}
        </div>
        <p style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.03em" }}>{value}</p>
      </div>
    </div>
  );
};

// ─── DATE RANGE HELPERS ───────────────────────────────────────────────────────
const DATE_RANGES = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
];

function getDateRangeForPeriod(period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (period === "month") {
    start.setDate(1);
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    start.setMonth((q - 1) * 3, 1);
    end.setMonth(q * 3, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  return { start, end };
}

function getPreviousDateRange(period) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  if (period === "month") {
    start.setMonth(now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(now.getMonth(), 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    const prevQ = q === 1 ? 4 : q - 1;
    const prevYear = q === 1 ? now.getFullYear() - 1 : now.getFullYear();
    start.setFullYear(prevYear);
    start.setMonth((prevQ - 1) * 3, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(prevYear);
    end.setMonth(prevQ * 3, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setFullYear(now.getFullYear() - 1);
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(now.getFullYear() - 1);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

function isDateInRange(dateStr, start, end) {
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const { incomes, expenses, totals, settings, addTransfer, loadData } = useFinance();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("month");
  const [activeBar, setActiveBar] = useState(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [prevCard, setPrevCard] = useState(null);
  const [direction, setDirection] = useState("right");
  const [animating, setAnimating] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalMode, setBankModalMode] = useState("deposit"); // "deposit" | "withdraw"
  const [transferAmount, setTransferAmount] = useState("");

  useEffect(() => {
    document.body.classList.add("dashboard-page");
    return () => document.body.classList.remove("dashboard-page");
  }, []);

  const openBankModal = (mode) => {
    setBankModalMode(mode);
    setTransferAmount("");
    setBankModalOpen(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a positive amount.", variant: "destructive" });
      return;
    }
    const bankBal = totals.bankBalance || 0;
    const cashBal = totals.cashInHand || 0;
    if (bankModalMode === "deposit") {
      if (amount > cashBal) {
        toast({ title: "Not enough cash", description: `Cash in hand is ${formatCurrency(cashBal)}.`, variant: "destructive" });
        return;
      }
      await addTransfer({ fromAccount: "cash", toAccount: "bank", amount, date: new Date().toISOString().slice(0, 10) });
      toast({ title: "Deposited", description: `${formatCurrency(amount)} deposited to bank.` });
    } else {
      if (amount > bankBal) {
        toast({ title: "Not enough balance", description: `Bank balance is ${formatCurrency(bankBal)}.`, variant: "destructive" });
        return;
      }
      await addTransfer({ fromAccount: "bank", toAccount: "cash", amount, date: new Date().toISOString().slice(0, 10) });
      toast({ title: "Withdrawn", description: `${formatCurrency(amount)} withdrawn from bank.` });
    }
    setBankModalOpen(false);
    setTransferAmount("");
    loadData();
  };

  // Current date range bounds
  const rangeBounds = useMemo(() => getDateRangeForPeriod(dateRange), [dateRange]);
  const prevRangeBounds = useMemo(() => getPreviousDateRange(dateRange), [dateRange]);

  // Get current year for display
  const currentYear = new Date().getFullYear();

  // Calculate analytics based on date range: last 8 months, 8 quarters, or 5 years
  const analyticsData = useMemo(() => {
    const now = new Date();
    let points = [];
    if (dateRange === "month") {
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
        let monthIncome = 0, monthExpense = 0;
        incomes.forEach(income => {
          const d = new Date(income.date);
          if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth())
            monthIncome += income.amount || 0;
        });
        expenses.forEach(expense => {
          const d = new Date(expense.date);
          if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth())
            monthExpense += expense.amount || 0;
        });
        points.push({ month: monthLabel, income: monthIncome, outcome: monthExpense });
      }
    } else if (dateRange === "quarter") {
      for (let i = 7; i >= 0; i--) {
        const y = now.getFullYear();
        const m = now.getMonth();
        const q = Math.floor(m / 3) + 1;
        const totalQuarters = (y * 4) + q - i;
        const qYear = Math.floor((totalQuarters - 1) / 4);
        const qNum = ((totalQuarters - 1) % 4) + 1;
        const label = `Q${qNum} ${String(qYear).slice(-2)}`;
        const startMonth = (qNum - 1) * 3;
        let quarterIncome = 0, quarterExpense = 0;
        incomes.forEach(income => {
          const d = new Date(income.date);
          if (d.getFullYear() === qYear && d.getMonth() >= startMonth && d.getMonth() < startMonth + 3)
            quarterIncome += income.amount || 0;
        });
        expenses.forEach(expense => {
          const d = new Date(expense.date);
          if (d.getFullYear() === qYear && d.getMonth() >= startMonth && d.getMonth() < startMonth + 3)
            quarterExpense += expense.amount || 0;
        });
        points.push({ month: label, income: quarterIncome, outcome: quarterExpense });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        const label = String(y);
        let yearIncome = 0, yearExpense = 0;
        incomes.forEach(income => {
          if (new Date(income.date).getFullYear() === y) yearIncome += income.amount || 0;
        });
        expenses.forEach(expense => {
          if (new Date(expense.date).getFullYear() === y) yearExpense += expense.amount || 0;
        });
        points.push({ month: label, income: yearIncome, outcome: yearExpense });
      }
    }
    return points;
  }, [incomes, expenses, dateRange]);

  // Activity: for month = current week; for quarter/year = months in period
  const activityData = useMemo(() => {
    if (dateRange === "month") {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
      const weekData = [];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(startOfWeek);
        dayStart.setDate(startOfWeek.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        let earning = 0, spent = 0;
        incomes.forEach(income => {
          const d = new Date(income.date);
          d.setHours(0, 0, 0, 0);
          if (d >= dayStart && d <= dayEnd) earning += income.amount || 0;
        });
        expenses.forEach(expense => {
          const d = new Date(expense.date);
          d.setHours(0, 0, 0, 0);
          if (d >= dayStart && d <= dayEnd) spent += expense.amount || 0;
        });
        weekData.push({ day: days[i], earning, spent });
      }
      return weekData;
    }
    const { start, end } = rangeBounds;
    const months = [];
    const cur = new Date(start);
    while (cur <= end) {
      const monthLabel = cur.toLocaleDateString('en-US', { month: 'short' });
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      let earning = 0, spent = 0;
      incomes.forEach(income => {
        const d = new Date(income.date);
        if (d >= cur && d <= monthEnd) earning += income.amount || 0;
      });
      expenses.forEach(expense => {
        const d = new Date(expense.date);
        if (d >= cur && d <= monthEnd) spent += expense.amount || 0;
      });
      months.push({ day: monthLabel, earning, spent });
      cur.setMonth(cur.getMonth() + 1, 1);
      cur.setHours(0, 0, 0, 0);
    }
    return months;
  }, [incomes, expenses, dateRange, rangeBounds]);

  // Expense categories in current date range (with previous period for % change)
  const payments = useMemo(() => {
    const { start, end } = rangeBounds;
    const prev = prevRangeBounds;
    const categoryMap = {};
    const colors = ["#3b82f6", "#22d3ee", "#60a5fa", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
    const isCardPayment = (pm) => {
      if (!pm) return false;
      const m = String(pm).toLowerCase().replace(/\s+/g, '_');
      return ['bank', 'card', 'online', 'online_transfer', 'online_payment'].includes(m);
    };
    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      if (!categoryMap[category]) {
        categoryMap[category] = { spent: 0, lastMonthSpent: 0, total: 0, cardAmount: 0, cashAmount: 0 };
      }
      if (isDateInRange(expense.date, start, end)) {
        categoryMap[category].spent += expense.amount || 0;
        if (isCardPayment(expense.paymentMethod)) categoryMap[category].cardAmount += expense.amount || 0;
        else categoryMap[category].cashAmount += expense.amount || 0;
      }
      if (isDateInRange(expense.date, prev.start, prev.end)) {
        categoryMap[category].lastMonthSpent += expense.amount || 0;
      }
    });
    return Object.entries(categoryMap)
      .map(([category, data]) => {
        const change = data.lastMonthSpent > 0
          ? (((data.spent - data.lastMonthSpent) / data.lastMonthSpent) * 100)
          : (data.spent > 0 ? 100 : 0);
        const total = Math.max(data.spent * 1.5, data.spent);
        const useCardIcon = data.cardAmount >= data.cashAmount;
        return {
          icon: useCardIcon ? <CardIcon /> : <CashIcon />,
          label: category,
          spent: data.spent,
          total,
          color: colors[Object.keys(categoryMap).indexOf(category) % colors.length],
          percentageChange: change,
        };
      })
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 4);
  }, [expenses, rangeBounds, prevRangeBounds]);

  // Activity percentages (income vs expense in selected range)
  const activityPercentages = useMemo(() => {
    const { start, end } = rangeBounds;
    const rangeIncome = incomes
      .filter(i => isDateInRange(i.date, start, end))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const rangeExpenses = expenses
      .filter(e => isDateInRange(e.date, start, end))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const total = rangeIncome + rangeExpenses;
    if (total === 0) return { dailyPayment: 0, hobby: 0, total: 0 };
    return {
      dailyPayment: Math.round((rangeIncome / total) * 100),
      hobby: Math.round((rangeExpenses / total) * 100),
      total: 100,
    };
  }, [incomes, expenses, rangeBounds]);

  // Format currency
  const formatCurrency = (amount) => {
    return `${settings.currency || ''} ${(amount || 0).toLocaleString()}`;
  };

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name || "there";
  const bankBalance = totals.bankBalance || 0;
  const cashBalance = totals.cashInHand || 0;
  const cardBalance = bankBalance + cashBalance;
  const pendingPayments = totals.pendingPayments || 0;

  // Totals for selected date range
  const rangeTotals = useMemo(() => {
    const { start, end } = rangeBounds;
    const income = incomes
      .filter(i => isDateInRange(i.date, start, end))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const outcome = expenses
      .filter(e => isDateInRange(e.date, start, end))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { income, outcome, profit: income - outcome };
  }, [incomes, expenses, rangeBounds]);

  const totalIncome = rangeTotals.income;
  const totalOutcome = rangeTotals.outcome;
  const monthlyProfit = rangeTotals.profit;

  // Percentage changes vs previous period
  const monthlyChange = useMemo(() => {
    const prev = prevRangeBounds;
    const prevIncome = incomes
      .filter(i => isDateInRange(i.date, prev.start, prev.end))
      .reduce((sum, i) => sum + (i.amount || 0), 0);
    const prevOutcome = expenses
      .filter(e => isDateInRange(e.date, prev.start, prev.end))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const incomeChange = prevIncome > 0
      ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(2)
      : "0.00";
    const expenseChange = prevOutcome > 0
      ? (((totalOutcome - prevOutcome) / prevOutcome) * 100).toFixed(2)
      : "0.00";
    const lastProfit = prevIncome - prevOutcome;
    const profitChangePercent = lastProfit !== 0
      ? ((monthlyProfit - lastProfit) / Math.abs(lastProfit) * 100).toFixed(2)
      : "0.00";
    return { income: incomeChange, expense: expenseChange, profit: profitChangePercent };
  }, [incomes, expenses, totalIncome, totalOutcome, monthlyProfit, prevRangeBounds]);

  // Calculate percentages for all stat cards
  const statPercentages = useMemo(() => {
    const totalFinancialActivity = totalIncome + totalOutcome;
    
    // Total Income: percentage of total financial activity
    const incomePercentage = totalFinancialActivity > 0
      ? ((totalIncome / totalFinancialActivity) * 100).toFixed(2)
      : "0.00";
    
    // Total Outcome: percentage of total financial activity
    const outcomePercentage = totalFinancialActivity > 0
      ? ((totalOutcome / totalFinancialActivity) * 100).toFixed(2)
      : "0.00";
    
    // Net Profit: profit margin as percentage of total income
    const profitPercentage = totalIncome > 0
      ? ((monthlyProfit / totalIncome) * 100).toFixed(2)
      : "0.00";
    
    // Pending Payments: percentage of total income
    const pendingPaymentsPercentage = totalIncome > 0
      ? ((pendingPayments / totalIncome) * 100).toFixed(2)
      : "0.00";
    
    return {
      income: incomePercentage,
      outcome: outcomePercentage,
      profit: profitPercentage,
      pending: pendingPaymentsPercentage,
    };
  }, [totalIncome, totalOutcome, monthlyProfit, pendingPayments]);

  const s = {
    page: {
      minHeight: "100vh",
      padding: 22,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: "#fff",
    },
    card: {
      background: "#13161e",
      borderRadius: 20,
      border: "1px solid #1e2433",
      padding: 20,
    },
    label: { color: "#8b9ab0", fontSize: 12, fontWeight: 500, margin: 0 },
    val: { color: "#fff", fontSize: 26, fontWeight: 800, margin: "4px 0 0", letterSpacing: "-0.03em" },
  };

  useEffect(() => {
    document.body.classList.add("dashboard-no-scrollbar");
    return () => document.body.classList.remove("dashboard-no-scrollbar");
  }, []);

  return (
    <>
      <style>{`
        body.dashboard-no-scrollbar,
        .dashboard-container,
        .dashboard-container * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        body.dashboard-no-scrollbar::-webkit-scrollbar,
        .dashboard-container *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div className="dashboard-container -mx-3 sm:-mx-4 lg:-mx-5" style={s.page}>
      {/* HEADER + DATE RANGE TOGGLE */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, marginTop: -4 }}>
        <p style={{ color: "#8b9ab0", fontSize: 15, margin: 0, fontWeight: 500 }}>{getGreeting()}, {userName} 👋</p>
        <div style={{ display: "flex", gap: 6, background: "#1e2433", borderRadius: 10, padding: 4 }}>
          {DATE_RANGES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDateRange(value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                background: dateRange === value ? "#3b82f6" : "transparent",
                color: dateRange === value ? "#fff" : "#8b9ab0",
                transition: "all 0.2s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TOP STAT CARDS */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <StatCard 
          icon="↙" 
          iconBg="rgba(59,130,246,0.2)" 
          label="Total Income" 
          value={formatCurrency(totalIncome)} 
          badge={statPercentages.income !== "0.00" ? `${statPercentages.income}%` : null}
          badgeColor="green"
        />
        <StatCard 
          icon="↗" 
          iconBg="rgba(239,68,68,0.15)" 
          label="Total Outcome" 
          value={formatCurrency(totalOutcome)} 
          badge={statPercentages.outcome !== "0.00" ? `${statPercentages.outcome}%` : null}
          badgeColor="red"
        />
        <StatCard 
          icon={<UpwardTrendIcon />} 
          iconBg="rgba(34,197,94,0.15)" 
          label={dateRange === "month" ? "Net Profit (This month)" : dateRange === "quarter" ? "Net Profit (This quarter)" : "Net Profit (This year)"} 
          value={formatCurrency(monthlyProfit)} 
          badge={statPercentages.profit !== "0.00" ? `${statPercentages.profit}%` : null}
          badgeColor={parseFloat(statPercentages.profit) >= 0 ? "green" : "red"}
        />
        <StatCard 
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="#eab308"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          iconBg="rgba(234,179,8,0.2)" 
          label="Pending Payments" 
          value={formatCurrency(pendingPayments)} 
          badge={statPercentages.pending !== "0.00" ? `${statPercentages.pending}%` : null}
          badgeColor="red"
        />
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ANALYTICS */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>Analytics</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Income</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Outcome</span>
                </div>
                <div style={{ background: "#1e2433", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#8b9ab0" }}>
                {dateRange === "month" ? "Last 8 months" : dateRange === "quarter" ? "Last 8 quarters" : "Last 5 years"}
              </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analyticsData} barGap={4} barCategoryGap={20}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip currency={settings.currency || ''} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="income" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                <Bar dataKey="outcome" radius={[6, 6, 0, 0]} fill="#22d3ee" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* ACTIVITY */}
            <div style={{ ...s.card, minHeight: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Activity</h3>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6" }} />
                    <span style={{ color: "#8b9ab0", fontSize: 11 }}>Earning</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d3ee" }} />
                    <span style={{ color: "#8b9ab0", fontSize: 11 }}>Spent</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityData} barGap={2} barCategoryGap={14}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b9ab0", fontSize: 10 }} tickFormatter={v => `${settings.currency || ''}${(v / 1000).toFixed(0)}k`} width={30} />
                  <Tooltip content={<CustomTooltip currency={settings.currency || ''} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="earning" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                  <Bar dataKey="spent" radius={[4, 4, 0, 0]} fill="#22d3ee" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PAYMENT */}
            <div style={{ ...s.card, minHeight: 330 }}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Payment</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {payments.length > 0 ? payments.map((p, i) => {
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e2433", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {p.icon}
                          </div>
                          <span style={{ color: "#d1d9e6", fontSize: 13, fontWeight: 500 }}>{p.label}</span>
                        </div>
                        <span style={{ color: "#8b9ab0", fontSize: 11 }}>
                          <span style={{ color: "#fff", fontWeight: 600 }}>{formatCurrency(p.spent)}</span>/{formatCurrency(p.total)}
                        </span>
                      </div>
                      <div style={{ height: 3, background: "#1e2433", borderRadius: 99 }}>
                        <div style={{ height: 3, background: p.color, borderRadius: 99, width: `${Math.min((p.spent / p.total) * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p style={{ color: "#8b9ab0", fontSize: 12, textAlign: "center", margin: "20px 0" }}>No expense data available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* MY CARD */}
          <div style={s.card}>

            {/* Card Slider */}
            {(() => {
              const cards = [
                {
                  id: 0,
                  type: "credit",
                  label: "CURRENT BALANCE",
                  amount: formatCurrency(bankBalance),
                  number: settings.bankDetails?.accountNumber?.replace(/(.{4})/g, '$1 ').trim() || '**** **** **** ****',
                  expiry: new Date().toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }),
                  gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #3b82f6 100%)",
                  shadow: "rgba(37,99,235,0.45)",
                  showMastercard: true,
                },
                {
                  id: 1,
                  type: "cash",
                  label: "CASH IN HAND",
                  amount: formatCurrency(cashBalance),
                  number: "SN 2024 • 00482913",
                  expiry: `+${formatCurrency(cashBalance)}`,
                  gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 50%, #22c55e 100%)",
                  shadow: "rgba(22,163,74,0.45)",
                  showMastercard: false,
                  emoji: "💵",
                },
              ];

              const goTo = (idx) => {
                if (idx === currentCard || animating) return;
                setDirection(idx > currentCard ? "left" : "right");
                setPrevCard(currentCard);
                setAnimating(true);
                setCurrentCard(idx);
                setTimeout(() => {
                  setPrevCard(null);
                  setAnimating(false);
                }, 420);
              };

              const card = cards[currentCard];
              const prevCardData = prevCard !== null ? cards[prevCard] : null;

              const enterFrom = direction === "left" ? "100%" : "-100%";
              const exitTo = direction === "left" ? "-100%" : "100%";

              return (
                <>
                  {/* Card viewport */}
                  <div style={{ position: "relative", width: "100%", height: 210, overflow: "hidden", borderRadius: 16, marginBottom: 12 }}>
                    {/* Exiting card */}
                    {prevCardData && (
                      <div key={`prev-${prevCard}`} style={{
                        position: "absolute", inset: 0,
                        animation: `slideOut${direction === "left" ? "Left" : "Right"} 0.42s cubic-bezier(0.4,0,0.2,1) forwards`,
                      }}>
                        <CardFace card={prevCardData} />
                      </div>
                    )}

                    {/* Entering card */}
                    <div key={`curr-${currentCard}`} style={{
                      position: "absolute", inset: 0,
                      animation: animating
                        ? `slideIn${direction === "left" ? "Left" : "Right"} 0.42s cubic-bezier(0.4,0,0.2,1) forwards`
                        : "none",
                    }}>
                      <CardFace card={card} />
                    </div>
                  </div>

                  {/* Dots */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14 }}>
                    {cards.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => goTo(i)}
                        style={{
                          width: currentCard === i ? 22 : 8,
                          height: 8,
                          borderRadius: 99,
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          transition: "all 0.3s ease",
                          background: currentCard === i
                            ? (c.id === 1 ? "#16a34a" : "#3b82f6")
                            : "#2a3347",
                        }}
                      />
                    ))}
                  </div>

                  {/* Info strip */}
                  <div style={{
                    background: "#13161e",
                    borderRadius: 14,
                    padding: "14px 18px",
                    border: "1px solid #1e2433",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                    animation: animating ? "dropIn 0.45s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                  }}>
                    {card.type === "cash" ? (
                      <>
                        <div style={{ display: "flex", gap: 20 }}>
                          <div>
                            <p style={{ color: "#8b9ab0", fontSize: 11, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.07em" }}>My Cash</p>
                            <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>Cash in Hand</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openBankModal("deposit")}
                          style={{
                            background: "linear-gradient(135deg, #16a34a, #15803d)",
                            color: "#fff", border: "none", borderRadius: 10,
                            padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(22,163,74,0.35)",
                          }}
                        >
                          Deposit →
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 20 }}>
                          <div>
                            <p style={{ color: "#8b9ab0", fontSize: 11, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.07em" }}>My card</p>
                            <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>Bank Balance</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openBankModal("withdraw")}
                          style={{
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            color: "#fff", border: "none", borderRadius: 10,
                            padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
                          }}
                        >
                          Manage →
                        </button>
                      </>
                    )}
                  </div>

                  <style>{`
                    @keyframes slideInLeft {
                      from { transform: translateX(100%); }
                      to   { transform: translateX(0); }
                    }
                    @keyframes slideOutLeft {
                      from { transform: translateX(0); }
                      to   { transform: translateX(-100%); }
                    }
                    @keyframes slideInRight {
                      from { transform: translateX(-100%); }
                      to   { transform: translateX(0); }
                    }
                    @keyframes slideOutRight {
                      from { transform: translateX(0); }
                      to   { transform: translateX(100%); }
                    }
                    @keyframes dropIn {
                      0%   { transform: translateY(-60px) scale(0.9); opacity: 0; }
                      60%  { transform: translateY(8px) scale(1.02); opacity: 1; }
                      100% { transform: translateY(0) scale(1); opacity: 1; }
                    }
                  `}</style>
                </>
              );
            })()}

          </div>

          {/* ACTIVITY GAUGE */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Activity</h3>
              <div style={{ background: "#1e2433", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#8b9ab0" }}>Month ▾</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PieChart width={200} height={120}>
                <Pie 
                  data={[{ value: activityPercentages.dailyPayment || 0 }, { value: activityPercentages.hobby || 0 }]} 
                  cx={100} 
                  cy={110} 
                  startAngle={180} 
                  endAngle={0} 
                  innerRadius={65} 
                  outerRadius={92} 
                  dataKey="value" 
                  strokeWidth={0}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#22d3ee" opacity={0.25} />
                </Pie>
              </PieChart>
            </div>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: 22, textAlign: "center", margin: "-20px 0 12px", letterSpacing: "-0.02em" }}>
              {activityPercentages.total || 0}%
            </p>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Income</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "4px 0 0" }}>{activityPercentages.dailyPayment || 0}%</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
                  <span style={{ color: "#8b9ab0", fontSize: 12 }}>Expenses</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: "4px 0 0" }}>{activityPercentages.hobby || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog open={bankModalOpen} onOpenChange={setBankModalOpen}>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle>
            {bankModalMode === "deposit" ? "Deposit to Bank" : "Withdraw from Bank"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Amount (LKR)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bankModalMode === "deposit"
                ? `Cash in hand: ${formatCurrency(totals.cashInHand || 0)}`
                : `Bank balance: ${formatCurrency(totals.bankBalance || 0)}`}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBankModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              style={
                bankModalMode === "deposit"
                  ? { background: "linear-gradient(135deg, #16a34a, #15803d)" }
                  : { background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }
              }
            >
              {bankModalMode === "deposit" ? "Deposit →" : "Withdraw →"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
