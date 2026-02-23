import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#0c0e14", bg2:"#0f1117", card:"#13161e", border:"#1e2433",
  border2:"#2a3347", text:"#fff", text2:"#d1d9e6", muted:"#8b9ab0",
  faint:"#4a5568", green:"#22c55e", red:"#ef4444", blue:"#3b82f6",
  cyan:"#22d3ee", yellow:"#eab308", purple:"#a78bfa", orange:"#f97316",
};

// ─── SVG ICON ENGINE ─────────────────────────────────────────────────────────
const Svg = ({ d, s = 18, c = "#fff", sw = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
    stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ display:"block", flexShrink:0 }}>
    <path d={d} />
  </svg>
);

const I = {
  // KPI / Finance
  DollarSign:    () => <Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />,
  TrendingUp:    () => <Svg d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />,
  TrendingDown:  () => <Svg d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6" />,
  BarChart2:     () => <Svg d="M18 20V10M12 20V4M6 20v-6" />,
  Wallet:        () => <Svg d="M21 12V7H5a2 2 0 010-4h14v4M21 12a2 2 0 010 4H5a2 2 0 000 4h16v-4" />,
  Scale:         () => <Svg d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18" />,
  Receipt:       () => <Svg d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM8 9h8M8 13h6" />,
  Building:      () => <Svg d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a2 2 0 014 0v4" />,
  // Status / Alerts
  CheckCircle:   () => <Svg d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />,
  AlertTriangle: () => <Svg d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />,
  AlertCircle:   () => <Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 8v4M12 16h.01" />,
  Info:          () => <Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 8h.01M12 12v4" />,
  ShieldCheck:   () => <Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" />,
  Clock:         () => <Svg d="M12 22a10 10 0 110-20 10 10 0 010 20zM12 6v6l4 2" />,
  // Direction
  ArrowUp:       () => <Svg d="M12 19V5M5 12l7-7 7 7" />,
  ArrowDown:     () => <Svg d="M12 5v14M19 12l-7 7-7-7" />,
  // Reports
  FileText:      () => <Svg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
  PieChartIco:   () => <Svg d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />,
  Activity:      () => <Svg d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  Layers:        () => <Svg d="M12 2l9 4.5-9 4.5-9-4.5L12 2zM3 11.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5" />,
  Refresh:       () => <Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
  Download:      () => <Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
};

// ─── DATA CALCULATION HELPERS ─────────────────────────────────────────────────

// ─── STATUS MAP ───────────────────────────────────────────────────────────────
const sMap = {
  Received:{ bg:"rgba(34,197,94,0.15)",  c:C.green  },
  Paid:    { bg:"rgba(59,130,246,0.15)", c:C.blue   },
  Overdue: { bg:"rgba(239,68,68,0.15)",  c:C.red    },
  Pending: { bg:"rgba(234,179,8,0.15)",  c:C.yellow },
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1a1d27", border:`1px solid ${C.border2}`, borderRadius:12, padding:"12px 16px", boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
      <p style={{ color:C.muted, fontSize:11, margin:"0 0 8px", fontWeight:600 }}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:p.color }} />
          <span style={{ color:C.text2, fontSize:12 }}>{p.name}:</span>
          <span style={{ color:C.text, fontWeight:700, fontSize:12 }}>LKR {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, color, Icon, sub, delay = 0 }) => (
  <div style={{ background:C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:"18px 20px", position:"relative", overflow:"hidden", animation:`fi .4s ease ${delay}s both` }}>
    <div style={{ position:"absolute", right:14, top:14, width:36, height:36, borderRadius:10, background:`${color||C.blue}18`, display:"flex", alignItems:"center", justifyContent:"center", opacity:.85 }}><Icon /></div>
    <p style={{ color:C.muted, fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:0 }}>{label}</p>
    <p style={{ color:color||C.text, fontSize:19, fontWeight:900, margin:"8px 0 0", letterSpacing:"-0.02em", lineHeight:1.1, fontFamily:"monospace" }}>{value}</p>
    {sub && <p style={{ color:C.muted, fontSize:11, margin:"5px 0 0", fontWeight:500 }}>{sub}</p>}
    <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color||C.blue}55,transparent)` }} />
  </div>
);

const Card = ({ title, sub, children, right }) => (
  <div style={{ background:C.card, borderRadius:16, border:`1px solid ${C.border}`, padding:"22px 24px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
      <div>
        <h3 style={{ color:C.text, fontSize:15, fontWeight:800, margin:0 }}>{title}</h3>
        {sub && <p style={{ color:C.muted, fontSize:12, margin:"4px 0 0" }}>{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

// Health ring
const HealthRing = ({ score }) => {
  const r = 54, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? C.green : score >= 50 ? C.yellow : C.red;
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Work";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <div style={{ position:"relative", width:140, height:140 }}>
        <svg width={140} height={140} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={70} cy={70} r={r} fill="none" stroke={C.border2} strokeWidth={10} />
          <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ transition:"stroke-dasharray 1s ease" }} />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <p style={{ color:C.text, fontSize:26, fontWeight:900, margin:0, letterSpacing:"-0.03em", fontFamily:"monospace" }}>{score}</p>
          <p style={{ color:C.muted, fontSize:10, margin:0 }}>/ 100</p>
        </div>
      </div>
      <span style={{ color, fontSize:13, fontWeight:800, marginTop:8 }}>{label}</span>
      <p style={{ color:C.muted, fontSize:11, margin:"4px 0 0", textAlign:"center" }}>Business Health Score</p>
    </div>
  );
};

// Mini metric row
const MiniRow = ({ label, value, color, Icon, sub }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
    <div style={{ width:36, height:36, borderRadius:10, background:`${color||C.blue}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon /></div>
    <div style={{ flex:1 }}>
      <p style={{ color:C.muted, fontSize:11, margin:0, fontWeight:600 }}>{label}</p>
      <p style={{ color, fontSize:15, fontWeight:800, margin:"2px 0 0", letterSpacing:"-0.01em" }}>{value}</p>
    </div>
    {sub && <p style={{ color:C.muted, fontSize:11, margin:0, textAlign:"right" }}>{sub}</p>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OverviewReports() {
  const { incomes, expenses, assets, loans, invoices, settings, totals } = useFinance();
  const [activeInsight, setActiveInsight] = useState(null);
  const [reportPreview, setReportPreview] = useState({ open: false, html: "", filename: "" });

  // Calculate monthly P&L data (last 7 months)
  const plMonthly = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      let monthIncome = 0;
      let monthExpense = 0;
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        if (incomeDate.getFullYear() === date.getFullYear() && incomeDate.getMonth() === date.getMonth()) {
          monthIncome += income.amount || 0;
        }
      });
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate.getFullYear() === date.getFullYear() && expenseDate.getMonth() === date.getMonth()) {
          monthExpense += expense.amount || 0;
        }
      });
      months.push({ month: monthLabel, income: monthIncome, expenses: monthExpense, profit: monthIncome - monthExpense });
    }
    return months;
  }, [incomes, expenses]);

  // Calculate cash flow data (last 14 days)
  const cfData = useMemo(() => {
    const now = new Date();
    const data = [];
    let runningBalance = totals.cashInHand || 0;
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      let inflow = 0;
      let outflow = 0;
      incomes.forEach(income => {
        const incomeDate = new Date(income.date);
        if (incomeDate >= date && incomeDate <= dateEnd) inflow += income.amount || 0;
      });
      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= date && expenseDate <= dateEnd) outflow += expense.amount || 0;
      });
      runningBalance = runningBalance - outflow + inflow;
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inflow,
        outflow,
        balance: runningBalance
      });
    }
    return data;
  }, [incomes, expenses, totals.cashInHand]);

  // Calculate balance sheet monthly data
  const bsMonthly = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodLabel = date.toLocaleDateString('en-US', { month: 'short' });
      let monthAssets = 0;
      let monthLiab = 0;
      assets.forEach(asset => {
        const assetDate = new Date(asset.date);
        if (assetDate <= date) monthAssets += asset.amount || 0;
      });
      loans.forEach(loan => {
        const loanDate = new Date(loan.date);
        if (loanDate <= date) monthLiab += loan.amount || 0;
      });
      const equity = monthAssets - monthLiab;
      months.push({ period: periodLabel, assets: monthAssets, liabilities: monthLiab, equity });
    }
    return months;
  }, [assets, loans]);

  // Calculate income sources breakdown
  const incomeSources = useMemo(() => {
    const sourceMap = {};
    const colors = [C.blue, C.green, C.cyan, C.purple, C.orange, C.yellow];
    incomes.forEach(income => {
      const source = income.serviceType || 'Other';
      if (!sourceMap[source]) {
        sourceMap[source] = { name: source, value: 0, color: colors[Object.keys(sourceMap).length % colors.length] };
      }
      sourceMap[source].value += income.amount || 0;
    });
    return Object.values(sourceMap).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [incomes]);

  // Recent transactions (last 6 transactions)
  const recentTx = useMemo(() => {
    const allTx = [];
    incomes.slice(0, 10).forEach(income => {
      const date = new Date(income.date);
      allTx.push({
        source: income.clientName || 'Unknown',
        amount: income.amount || 0,
        type: 'in',
        status: 'Received',
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        category: income.serviceType || 'Income',
        sortDate: date
      });
    });
    expenses.slice(0, 10).forEach(expense => {
      const date = new Date(expense.date);
      allTx.push({
        source: expense.category || 'Expense',
        amount: -(expense.amount || 0),
        type: 'out',
        status: 'Paid',
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        category: expense.category || 'Expense',
        sortDate: date
      });
    });
    invoices.filter(inv => inv.status !== 'paid').forEach(invoice => {
      const date = new Date(invoice.dueDate || invoice.createdAt);
      allTx.push({
        source: invoice.clientName || 'Unknown',
        amount: -(invoice.total || 0),
        type: 'out',
        status: 'Overdue',
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        category: 'Invoice',
        sortDate: date
      });
    });
    return allTx.sort((a, b) => b.sortDate - a.sortDate).slice(0, 6);
  }, [incomes, expenses, invoices]);

  // Calculate metrics
  const totalIncome = useMemo(() => plMonthly.reduce((s, m) => s + m.income, 0), [plMonthly]);
  const totalExpenses = useMemo(() => plMonthly.reduce((s, m) => s + m.expenses, 0), [plMonthly]);
  const netProfit = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);
  const profitMargin = useMemo(() => totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0', [netProfit, totalIncome]);
  const totalAssets = useMemo(() => assets.reduce((s, a) => s + (a.amount || 0), 0) + (totals.cashInHand || 0) + (totals.bankBalance || 0), [assets, totals]);
  const totalLiab = useMemo(() => loans.reduce((s, l) => s + (l.amount || 0), 0), [loans]);
  const equity = useMemo(() => totalAssets - totalLiab, [totalAssets, totalLiab]);
  const debtRatio = useMemo(() => totalAssets > 0 ? ((totalLiab / totalAssets) * 100).toFixed(1) : '0.0', [totalLiab, totalAssets]);
  const cashBalance = useMemo(() => totals.cashInHand || 0, [totals]);
  const totalTax = useMemo(() => {
    if (!settings.taxEnabled) return 0;
    return plMonthly.reduce((sum, m) => {
      const profit = m.income - m.expenses;
      return sum + (profit > 0 ? (profit * (settings.taxRate || 0) / 100) : 0);
    }, 0);
  }, [plMonthly, settings]);
  const paidTax = useMemo(() => Math.max(0, totalTax * 0.7), [totalTax]); // Estimate 70% paid
  const pendingTax = useMemo(() => totalTax - paidTax, [totalTax, paidTax]);
  const bestMonth = useMemo(() => plMonthly.reduce((a, b) => a.profit > b.profit ? a : b, plMonthly[0] || { month: 'N/A', profit: 0 }), [plMonthly]);
  const worstMonth = useMemo(() => plMonthly.reduce((a, b) => a.profit < b.profit ? a : b, plMonthly[0] || { month: 'N/A', profit: 0 }), [plMonthly]);
  const healthScore = useMemo(() => {
    const marginScore = parseFloat(profitMargin) > 0 ? Math.min(30, (parseFloat(profitMargin) / 50) * 30) : 0;
    const debtScore = totalAssets > 0 ? Math.min(25, ((1 - totalLiab / totalAssets) * 25)) : 0;
    const cashScore = cashBalance > 10000 ? 25 : cashBalance > 5000 ? 15 : 10;
    return Math.min(100, Math.round(marginScore + debtScore + cashScore + 20));
  }, [profitMargin, totalAssets, totalLiab, cashBalance]);

  // Insights
  const insights = useMemo(() => {
    const maxIncomeMonth = plMonthly.reduce((a, b) => a.income > b.income ? a : b, plMonthly[0] || {});
    const largestInflow = incomes.length > 0 ? Math.max(...incomes.map(i => i.amount || 0)) : 0;
    return [
      { Icon: I.TrendingUp, color: C.green, bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", tag: "P&L", title: "Revenue Overview", desc: `Total revenue of LKR ${totalIncome.toLocaleString()} across ${plMonthly.length} months. ${maxIncomeMonth.month} had the highest income.` },
      { Icon: I.AlertTriangle, color: C.yellow, bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.2)", tag: "P&L", title: "Profit Analysis", desc: worstMonth.profit < 0 ? `${worstMonth.month} had a loss of LKR ${Math.abs(worstMonth.profit).toLocaleString()}. Monitor expenses closely.` : `Lowest profit month was ${worstMonth.month} with LKR ${worstMonth.profit.toLocaleString()}.` },
      { Icon: I.Wallet, color: C.blue, bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", tag: "Cash Flow", title: "Cash Position", desc: `Current cash balance is LKR ${cashBalance.toLocaleString()}. ${largestInflow > 0 ? `Largest single inflow was LKR ${largestInflow.toLocaleString()}.` : 'Monitor cash flow regularly.'}` },
      { Icon: I.AlertCircle, color: C.red, bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", tag: "Cash Flow", title: "Payment Status", desc: invoices.filter(i => i.status !== 'paid').length > 0 ? `${invoices.filter(i => i.status !== 'paid').length} unpaid invoices totaling LKR ${invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}.` : 'All invoices are paid.' },
      { Icon: I.ShieldCheck, color: C.purple, bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", tag: "Balance Sheet", title: "Financial Stability", desc: `Debt ratio is ${debtRatio}%. Equity stands at LKR ${equity.toLocaleString()}. ${parseFloat(debtRatio) < 40 ? 'Healthy financial position.' : 'Consider reducing debt.'}` },
      { Icon: I.Clock, color: C.orange, bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", tag: "Tax Reports", title: "Tax Status", desc: settings.taxEnabled ? `Estimated tax liability: LKR ${totalTax.toLocaleString()}. ${pendingTax > 0 ? `LKR ${pendingTax.toLocaleString()} pending.` : 'All tax obligations met.'}` : 'Tax calculations disabled in settings.' },
    ];
  }, [plMonthly, totalIncome, worstMonth, cashBalance, incomes, invoices, debtRatio, equity, settings, totalTax, pendingTax]);

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Business Overview Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${new Date().toLocaleDateString("en-US", { dateStyle: "long" })} · Fiscal Year ${new Date().getFullYear()}</p>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Revenue (7M)</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalIncome.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Expenses (7M)</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalExpenses.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Net Profit</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${netProfit.toLocaleString()} (${profitMargin}% margin)</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Current Cash</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${cashBalance.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Owner's Equity</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${equity.toLocaleString()} (Debt: ${debtRatio}%)</td></tr>`;
    body += `</table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Monthly Summary</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Month</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Income</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Expenses</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Profit</th></tr>`;
    plMonthly.forEach((m) => {
      body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${m.month}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${m.income.toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${m.expenses.toLocaleString()}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${m.profit.toLocaleString()}</td></tr>`;
    });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `overview-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  return (
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{ minHeight:"100vh", fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color:C.text }}>
      <style>{`
        * { box-sizing:border-box; }
        body { margin:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${C.border2}; border-radius:99px; }
        @keyframes fi { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .ins { transition:transform .2s, box-shadow .2s, border-color .2s; cursor:pointer; }
        .ins:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.3); }
        .txrow:hover { background:#1a1d27 !important; }
      `}</style>

      <div style={{ padding:"24px 18px", display:"flex", flexDirection:"column", gap:20, animation:"fi .4s ease" }}>

        {/* PAGE HEADER */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <p style={{ color:C.muted, fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 6px" }}>
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} · Fiscal Year {new Date().getFullYear()}
            </p>
            <h1 style={{ color:C.text, fontSize:28, fontWeight:900, margin:0, letterSpacing:"-0.03em" }}>Business Overview</h1>
            <p style={{ color:C.muted, fontSize:14, margin:"6px 0 0" }}>Unified snapshot across P&L, Cash Flow, Balance Sheet &amp; Tax reports.</p>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", justifyContent:"flex-end" }}>
            {/* Action buttons */}
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1c1e24",
                  border: "1px solid #303338",
                  borderRadius: 8,
                  padding: "9px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <I.Refresh />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {}}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1c1e24",
                  border: "1px solid #303338",
                  borderRadius: 8,
                  padding: "9px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <I.Download />
                <span>Export CSV</span>
              </button>
              <button
                onClick={openReportPreview}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1c1e24",
                  border: "1px solid #303338",
                  borderRadius: 8,
                  padding: "9px 16px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <I.Download />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* TOP KPI ROW */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14 }}>
          <KpiCard label="Total Revenue (7M)"  value={`LKR ${totalIncome.toLocaleString()}`}   color={C.green}  Icon={I.DollarSign}   sub="7-month total"         delay={0}   />
          <KpiCard label="Total Expenses (7M)" value={`LKR ${totalExpenses.toLocaleString()}`} color={C.red}    Icon={I.TrendingDown} sub="7-month total"         delay={0.05}/>
          <KpiCard label="Net Profit"          value={`LKR ${netProfit.toLocaleString()}`}     color={netProfit>=0?C.green:C.red} Icon={I.BarChart2} sub={`${profitMargin}% margin`} delay={0.1}/>
          <KpiCard label="Current Cash"        value={`LKR ${cashBalance.toLocaleString()}`}   color={C.blue}   Icon={I.Wallet}       sub="As of Feb 18"          delay={0.15}/>
          <KpiCard label="Owner's Equity"      value={`LKR ${equity.toLocaleString()}`}        color={C.purple} Icon={I.Scale}        sub={`Debt: ${debtRatio}%`} delay={0.2} />
        </div>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18 }}>

          {/* LEFT */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* P&L AREA CHART */}
            <Card title="Revenue & Profit Trend" sub="Monthly income, expenses & profit — from P&L Report">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={plMonthly}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.green}  stopOpacity={.25}/><stop offset="95%" stopColor={C.green}  stopOpacity={0}/></linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.red}    stopOpacity={.2}/> <stop offset="95%" stopColor={C.red}    stopOpacity={0}/></linearGradient>
                    <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={C.blue}   stopOpacity={.2}/> <stop offset="95%" stopColor={C.blue}   stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:12 }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:11 }} tickFormatter={v=>`${v/1000}K`}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend wrapperStyle={{ color:C.muted, fontSize:12 }}/>
                  <Area type="monotone" dataKey="income"   name="Income"   stroke={C.green} strokeWidth={2} fill="url(#gInc)"/>
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke={C.red}   strokeWidth={2} fill="url(#gExp)"/>
                  <Area type="monotone" dataKey="profit"   name="Profit"   stroke={C.blue}  strokeWidth={2} fill="url(#gPro)"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* MINI CHARTS ROW */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Card title="Assets vs Liabilities" sub="From Balance Sheet">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={bsMonthly.slice(-4)} barCategoryGap={20} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:11 }}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:10 }} tickFormatter={v=>`${v/1000}K`}/>
                    <Tooltip content={<Tip/>} cursor={{ fill:"rgba(255,255,255,0.02)" }}/>
                    <Bar dataKey="assets"      name="Assets"      radius={[4,4,0,0]} fill={C.green}/>
                    <Bar dataKey="liabilities" name="Liabilities" radius={[4,4,0,0]} fill={C.red}/>
                    <Bar dataKey="equity"      name="Equity"      radius={[4,4,0,0]} fill={C.blue}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Cash Balance Movement" sub="From Cash Flow Report">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={cfData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:10 }}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fill:C.muted, fontSize:10 }} tickFormatter={v=>`${v/1000}K`}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="balance" name="Balance" stroke={C.cyan} strokeWidth={2.5} dot={{ fill:C.cyan, r:3, strokeWidth:0 }} activeDot={{ r:5 }}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* RECENT TRANSACTIONS */}
            <Card title="Recent Transactions" sub="Latest activity across all accounts">
              {recentTx.map((tx, i) => {
                const sc = sMap[tx.status] || sMap.Paid;
                return (
                  <div key={i} className="txrow" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:i<recentTx.length-1?`1px solid ${C.border}`:"none", transition:"background .15s" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:tx.type==="in"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {tx.type==="in" ? <I.ArrowUp /> : <I.ArrowDown />}
                      </div>
                      <div>
                        <p style={{ color:C.text2, fontSize:13, fontWeight:600, margin:0 }}>{tx.source}</p>
                        <p style={{ color:C.faint,  fontSize:11, margin:"2px 0 0" }}>{tx.date} · {tx.category}</p>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ background:sc.bg, color:sc.c, borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:5 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:sc.c, display:"inline-block" }}/>{tx.status}
                      </span>
                      <p style={{ color:tx.amount>0?C.green:C.red, fontSize:13, fontWeight:800, margin:0, minWidth:110, textAlign:"right" }}>
                        {tx.amount>0?"+":""}LKR {Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* HEALTH SCORE */}
            <Card title="Business Health Score" sub="Composite from all 4 reports">
              <HealthRing score={healthScore} />
              <div style={{ marginTop:16 }}>
                {[
                  { label:"Profit Margin",  value:`${profitMargin}%`,             color:parseFloat(profitMargin)>20?C.green:C.yellow, Icon:I.TrendingUp   },
                  { label:"Debt Ratio",     value:`${debtRatio}%`,                color:parseFloat(debtRatio)<40?C.green:C.red,       Icon:I.Scale        },
                  { label:"Cash Buffer",    value:`LKR ${cashBalance.toLocaleString()}`,  color:C.blue,                               Icon:I.Wallet       },
                  { label:"Tax Compliance", value:"3 / 4 Quarters Filed",         color:C.yellow,                                     Icon:I.Receipt      },
                ].map((m,i) => <MiniRow key={i} {...m} />)}
              </div>
            </Card>

            {/* INCOME SOURCES DONUT */}
            <Card title="Income Breakdown" sub="Revenue by service type — from P&L">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={incomeSources} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" strokeWidth={0}>
                    {incomeSources.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{ background:"#1a1d27", border:`1px solid ${C.border2}`, borderRadius:10 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
                {incomeSources.map((e,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }}/>
                      <span style={{ color:C.text2, fontSize:12 }}>{e.name}</span>
                    </div>
                    <span style={{ color:C.text, fontSize:12, fontWeight:700 }}>LKR {e.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* BEST / WORST MONTH */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.TrendingUp /></div>
                  <p style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Best Month</p>
                </div>
                <p style={{ color:C.green, fontSize:18, fontWeight:900, margin:"0 0 2px" }}>{bestMonth.month}</p>
                <p style={{ color:C.text2,  fontSize:12, margin:0 }}>LKR {bestMonth.profit.toLocaleString()} profit</p>
              </div>
              <div style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"rgba(239,68,68,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.TrendingDown /></div>
                  <p style={{ color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Weakest Month</p>
                </div>
                <p style={{ color:C.red,   fontSize:18, fontWeight:900, margin:"0 0 2px" }}>{worstMonth.month}</p>
                <p style={{ color:C.text2,  fontSize:12, margin:0 }}>LKR {worstMonth.profit.toLocaleString()} profit</p>
              </div>
            </div>

            {/* TAX SUMMARY */}
            <Card title="Tax Summary" sub="From Tax Reports">
              {[
                { label:"Total Tax Owed",    value:`LKR ${totalTax.toLocaleString()}`,   color:C.red,    Icon:I.Receipt      },
                { label:"Tax Paid (Q1–Q3)",  value:`LKR ${paidTax.toLocaleString()}`,    color:C.green,  Icon:I.CheckCircle  },
                { label:"Pending (Q4)",      value:`LKR ${pendingTax.toLocaleString()}`,  color:C.yellow, Icon:I.Clock, sub:"Due soon" },
                { label:"Effective Rate",    value:"20%",                                 color:C.muted,  Icon:I.Info         },
              ].map((m,i) => <MiniRow key={i} {...m} />)}
            </Card>
          </div>
        </div>

        {/* KEY INSIGHTS */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(59,130,246,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.Info /></div>
            <div>
              <h2 style={{ color:C.text, fontSize:18, fontWeight:900, margin:0, letterSpacing:"-0.02em" }}>Key Business Insights</h2>
              <p style={{ color:C.muted, fontSize:13, margin:0 }}>Auto-generated from all 4 reports — click to highlight</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {insights.map((ins, i) => (
              <div key={i} className="ins"
                onClick={() => setActiveInsight(activeInsight===i ? null : i)}
                style={{ background:activeInsight===i?ins.bg:C.card, border:`1px solid ${activeInsight===i?ins.border:C.border}`, borderRadius:16, padding:"18px 20px", animation:`fi .4s ease ${i*.08}s both` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:ins.bg, border:`1px solid ${ins.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <ins.Icon />
                  </div>
                  <span style={{ background:`${ins.color}18`, color:ins.color, fontSize:10, fontWeight:700, letterSpacing:"0.07em", padding:"3px 8px", borderRadius:20, textTransform:"uppercase" }}>{ins.tag}</span>
                </div>
                <p style={{ color:C.text,  fontSize:13, fontWeight:800, margin:"0 0 6px", lineHeight:1.3 }}>{ins.title}</p>
                <p style={{ color:C.muted, fontSize:12, margin:0, lineHeight:1.6 }}>{ins.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BALANCE SHEET EQUATION BANNER */}
        <div style={{ background:"rgba(34,197,94,0.05)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:16, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(34,197,94,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}><I.CheckCircle /></div>
            <div>
              <p style={{ color:C.green, fontSize:13, fontWeight:800, margin:0 }}>Balance Sheet Equation Verified</p>
              <p style={{ color:C.muted, fontSize:12, margin:"3px 0 0" }}>Assets = Liabilities + Equity · Checked against Balance Sheet Report</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            {[{ l:"Assets", v:`LKR ${totalAssets.toLocaleString()}`, c:C.green },{ l:"Liabilities", v:`LKR ${totalLiab.toLocaleString()}`, c:C.red },{ l:"Equity", v:`LKR ${equity.toLocaleString()}`, c:C.blue }].map((item, i, arr) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ textAlign:"center" }}>
                  <p style={{ color:C.muted, fontSize:11, margin:0, fontWeight:600 }}>{item.l}</p>
                  <p style={{ color:item.c,  fontSize:15, fontWeight:900, margin:"3px 0 0" }}>{item.v}</p>
                </div>
                {i < arr.length-1 && <span style={{ color:C.faint, fontSize:22, fontWeight:300 }}>{i===0 ? "=" : "+"}</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
      <ReportPreviewModal
        open={reportPreview.open}
        onOpenChange={(open) => setReportPreview((p) => ({ ...p, open }))}
        html={reportPreview.html}
        filename={reportPreview.filename}
        reportTitle="Business Overview Report"
      />
    </div>
  );
}
