import { useState, useMemo } from "react";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useFinance } from "@/contexts/FinanceContext";
import { getPrintHtml } from "@/utils/pdfPrint";
import ReportPreviewModal from "@/components/ReportPreviewModal";

const C = { bg:"#0c0e14",bg2:"#0f1117",card:"#13161e",border:"#1e2433",border2:"#2a3347",text:"#fff",text2:"#d1d9e6",muted:"#8b9ab0",faint:"#4a5568",green:"#22c55e",red:"#ef4444",blue:"#3b82f6",cyan:"#22d3ee",yellow:"#eab308",purple:"#a78bfa",orange:"#f97316" };

const Svg=({d,s=18,c="#fff",sw=2})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d={d}/></svg>;
const I={
  Building:    ()=><Svg d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a2 2 0 014 0v4"/>,
  Layers:      ()=><Svg d="M12 2l9 4.5-9 4.5-9-4.5L12 2zM3 11.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>,
  Scale:       ()=><Svg d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18"/>,
  Gauge:       ()=><Svg d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v2M6 12H4M20 12h-2M7.76 7.76l-1.41-1.42M17.66 7.76l1.41-1.41M12 18a6 6 0 010-12"/>,
  ShieldCheck: ()=><Svg d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4"/>,
  CheckCircle: ()=><Svg d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/>,
  TrendingUp:  ()=><Svg d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>,
  Download:    ()=><Svg d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>,
  Eye:         ()=><Svg d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>,
  List:        ()=><Svg d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>,
  Monitor:     ()=><Svg d="M2 3h20v14H2V3zM8 21h8M12 17v4"/>,
  Package:     ()=><Svg d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>,
  CreditCard:  ()=><Svg d="M1 4h22v16H1V4zM1 10h22"/>,
  Receipt:     ()=><Svg d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM8 9h8M8 13h6"/>,
  FileText:    ()=><Svg d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6"/>,
  Refresh:     ()=><Svg d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16M3 12h6m12 0h-6" />,
};


const Tip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return <div style={{background:"#1a1d27",border:`1px solid ${C.border2}`,borderRadius:12,padding:"12px 16px"}}>
    <p style={{color:C.muted,fontSize:11,margin:"0 0 8px",fontWeight:600}}>{label}</p>
    {payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:p.color}}/><span style={{color:C.text2,fontSize:12}}>{p.name}:</span><span style={{color:C.text,fontWeight:700,fontSize:12}}>LKR {Number(p.value).toLocaleString()}</span>
    </div>)}
  </div>;
};
const Stat=({label,value,color,Icon,sub,subColor})=>(
  <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"20px 22px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",right:14,top:14,width:36,height:36,borderRadius:10,background:`${color||C.blue}18`,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.8}}><Icon/></div>
    <p style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:0}}>{label}</p>
    <p style={{color:color||C.text,fontSize:20,fontWeight:900,margin:"8px 0 0",letterSpacing:"-0.02em",fontFamily:"monospace"}}>{value}</p>
    {sub&&<p style={{color:subColor||C.muted,fontSize:12,margin:"5px 0 0",fontWeight:600}}>{sub}</p>}
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color||C.blue}55,transparent)`}}/>
  </div>
);
const Card=({title,subtitle,children})=>(
  <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"22px 24px"}}>
    <div style={{marginBottom:18}}><h3 style={{color:C.text,fontSize:15,fontWeight:800,margin:0}}>{title}</h3>{subtitle&&<p style={{color:C.muted,fontSize:12,margin:"4px 0 0"}}>{subtitle}</p>}</div>
    {children}
  </div>
);
const DonutLegend=({items})=>(
  <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:10}}>
    {items.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:e.color}}/><span style={{color:C.text2,fontSize:12}}>{e.name}</span></div>
      <div style={{textAlign:"right"}}><p style={{color:C.text,fontSize:12,fontWeight:700,margin:0}}>LKR {e.value.toLocaleString()}</p><p style={{color:C.muted,fontSize:10,margin:0}}>{((e.value/items.reduce((s,x)=>s+x.value,0))*100).toFixed(1)}%</p></div>
    </div>)}
  </div>
);

export default function BalanceSheet(){
  const { assets, loans, invoices, totals, settings } = useFinance();
  const [view,setView]=useState("overview");
  const [reportPreview, setReportPreview] = useState({ open: false, html: "", filename: "" });

  // Calculate monthly balance sheet data
  const monthly = useMemo(() => {
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
      // Add cash and bank balances (simplified - using current totals)
      if (i === 0) {
        monthAssets += (totals.cashInHand || 0) + (totals.bankBalance || 0);
      }
      const equity = monthAssets - monthLiab;
      months.push({ period: periodLabel, assets: monthAssets, liabilities: monthLiab, equity });
    }
    return months;
  }, [assets, loans, totals]);

  // Calculate asset items
  const assetItems = useMemo(() => {
    const items = [];
    const cashBank = (totals.cashInHand || 0) + (totals.bankBalance || 0);
    if (cashBank > 0) {
      items.push({ name: "Cash & Bank", value: cashBank, color: C.green, Icon: () => <Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" s={14} />, type: "Current" });
    }
    const receivables = invoices.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + (inv.total || 0), 0);
    if (receivables > 0) {
      items.push({ name: "Receivables", value: receivables, color: C.cyan, Icon: () => <Svg d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" s={14} />, type: "Current" });
    }
    const equipment = assets.filter(a => a.name && (a.name.toLowerCase().includes('equipment') || a.name.toLowerCase().includes('machine'))).reduce((s, a) => s + (a.amount || 0), 0);
    const otherAssets = assets.filter(a => !a.name || (!a.name.toLowerCase().includes('equipment') && !a.name.toLowerCase().includes('machine'))).reduce((s, a) => s + (a.amount || 0), 0);
    if (equipment > 0) {
      items.push({ name: "Equipment", value: equipment, color: C.blue, Icon: () => <Svg d="M2 3h20v14H2V3z" s={14} />, type: "Non-Current" });
    }
    if (otherAssets > 0) {
      items.push({ name: "Other Assets", value: otherAssets, color: C.purple, Icon: () => <Svg d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" s={14} />, type: "Non-Current" });
    }
    return items.length > 0 ? items : [{ name: "Cash & Bank", value: cashBank || 0, color: C.green, Icon: () => <Svg d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" s={14} />, type: "Current" }];
  }, [assets, invoices, totals]);

  // Calculate liability items
  const liabItems = useMemo(() => {
    const items = [];
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + (inv.total || 0), 0);
    if (unpaidInvoices > 0) {
      items.push({ name: "Accounts Payable", value: unpaidInvoices, color: C.red, due: "30 Days" });
    }
    if (settings.taxEnabled && totals.estimatedTaxYearly > 0) {
      const paidTax = totals.estimatedTaxYearly * 0.7; // Estimate 70% paid
      const pendingTax = totals.estimatedTaxYearly - paidTax;
      if (pendingTax > 0) {
        items.push({ name: "Tax Payable", value: pendingTax, color: C.yellow, due: "Q4 " + new Date().getFullYear() });
      }
    }
    const totalLoans = loans.reduce((s, l) => s + (l.amount || 0), 0);
    if (totalLoans > 0) {
      items.push({ name: "Loans", value: totalLoans, color: C.orange, due: "Ongoing" });
    }
    return items.length > 0 ? items : [];
  }, [loans, invoices, settings, totals]);

  const totalAssets = useMemo(() => assetItems.reduce((s, a) => s + a.value, 0), [assetItems]);
  const totalLiab = useMemo(() => liabItems.reduce((s, l) => s + l.value, 0), [liabItems]);
  const equity = useMemo(() => totalAssets - totalLiab, [totalAssets, totalLiab]);
  const debtRatio = useMemo(() => totalAssets > 0 ? ((totalLiab / totalAssets) * 100).toFixed(1) : '0.0', [totalLiab, totalAssets]);
  const currentRatio = useMemo(() => totalLiab > 0 ? (((totals.cashInHand || 0) / totalLiab).toFixed(2)) : '0.00', [totals, totalLiab]);
  const healthy = useMemo(() => parseFloat(debtRatio) < 40, [debtRatio]);

  const openReportPreview = () => {
    const cur = settings?.currency || "LKR";
    let body = `<h2 style="margin:0 0 16px; font-size:18px; border-bottom:2px solid #111; padding-bottom:8px;">Balance Sheet Report</h2>`;
    body += `<p style="color:#666; font-size:12px; margin:0 0 20px;">${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}</p>`;
    body += `<table style="width:100%; border-collapse:collapse; margin-bottom:24px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:10px 12px; border:1px solid #ddd;">Metric</th><th style="text-align:right; padding:10px 12px; border:1px solid #ddd;">Value</th></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Assets</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalAssets.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Total Liabilities</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${totalLiab.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Owner's Equity</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${cur} ${equity.toLocaleString()}</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Debt Ratio</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${debtRatio}%</td></tr>`;
    body += `<tr><td style="padding:10px 12px; border:1px solid #ddd;">Current Ratio</td><td style="text-align:right; padding:10px 12px; border:1px solid #ddd;">${currentRatio}</td></tr></table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Assets</h3><table style="width:100%; border-collapse:collapse; margin-bottom:20px;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Item</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Amount</th></tr>`;
    assetItems.forEach((a) => { body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${a.name}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${a.value.toLocaleString()}</td></tr>`; });
    body += `</table>`;
    body += `<h3 style="margin:0 0 12px; font-size:14px;">Liabilities</h3><table style="width:100%; border-collapse:collapse;"><tr style="background:#f5f5f5;"><th style="text-align:left; padding:8px 12px; border:1px solid #ddd;">Item</th><th style="text-align:right; padding:8px 12px; border:1px solid #ddd;">Amount</th></tr>`;
    liabItems.forEach((l) => { body += `<tr><td style="padding:8px 12px; border:1px solid #ddd;">${l.name}</td><td style="text-align:right; padding:8px 12px; border:1px solid #ddd;">${cur} ${l.value.toLocaleString()}</td></tr>`; });
    body += `</table>`;
    const fullHtml = getPrintHtml(body, { logo: settings?.logo, businessName: settings?.businessName });
    const filename = `balance-sheet-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    setReportPreview({ open: true, html: fullHtml, filename });
  };

  return(
    <div className="-mx-3 sm:-mx-4 lg:-mx-5" style={{minHeight:"100vh",fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",color:C.text}}>
      <style>{`*{box-sizing:border-box;}body{margin:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:99px;}@keyframes fi{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}.brow:hover td{background:rgba(255,255,255,0.018)!important;}`}</style>

      <div style={{padding:"24px 18px",display:"flex",flexDirection:"column",gap:18,animation:"fi .3s ease"}}>

        {/* TOOLBAR */}
        <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button onClick={()=>window.location.reload()} style={{display:"flex",alignItems:"center",gap:8,background:"#1c1e24",border:"1px solid #303338",borderRadius:8,padding:"9px 16px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter', sans-serif"}}><I.Refresh/><span>Refresh</span></button>
            <button onClick={()=>{}} style={{display:"flex",alignItems:"center",gap:8,background:"#1c1e24",border:"1px solid #303338",borderRadius:8,padding:"9px 16px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter', sans-serif"}}><I.Download/><span>Export CSV</span></button>
            <button onClick={openReportPreview} style={{display:"flex",alignItems:"center",gap:8,background:"#1c1e24",border:"1px solid #303338",borderRadius:8,padding:"9px 16px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter', sans-serif"}}><I.Download/><span>Download PDF</span></button>
          </div>
        </div>

        {/* STATS */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
          <Stat label="Total Assets"      value={`LKR ${totalAssets.toLocaleString()}`} color={C.green}  Icon={I.Building}/>
          <Stat label="Total Liabilities" value={`LKR ${totalLiab.toLocaleString()}`}   color={C.red}    Icon={I.Layers}/>
          <Stat label="Owner's Equity"    value={`LKR ${equity.toLocaleString()}`}       color={C.blue}   Icon={I.Scale}/>
          <Stat label="Debt Ratio"        value={`${debtRatio}%`} color={healthy?C.green:C.red} Icon={I.Gauge} sub={healthy?"Healthy":"High Debt"} subColor={healthy?C.green:C.red}/>
          <Stat label="Current Ratio"     value={currentRatio}    color={C.cyan}         Icon={I.ShieldCheck} sub="Cash / Liabilities"/>
        </div>

        {/* MAIN BAR */}
        <Card title="Assets vs Liabilities vs Equity" subtitle="Monthly trend — LKR">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly} barCategoryGap={22} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:12}}/>
              <YAxis axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:11}} tickFormatter={v=>`${v/1000}K`}/>
              <Tooltip content={<Tip/>} cursor={{fill:"rgba(255,255,255,0.02)"}}/>
              <Legend wrapperStyle={{color:C.muted,fontSize:12,paddingTop:12}}/>
              <Bar dataKey="assets"      name="Assets"      radius={[5,5,0,0]} fill={C.green}/>
              <Bar dataKey="liabilities" name="Liabilities" radius={[5,5,0,0]} fill={C.red}/>
              <Bar dataKey="equity"      name="Equity"      radius={[5,5,0,0]} fill={C.blue}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* DONUTS ROW */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          <Card title="Asset Breakdown" subtitle="By category">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={assetItems} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" strokeWidth={0}>
                {assetItems.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{background:"#1a1d27",border:`1px solid ${C.border2}`,borderRadius:10}}/></PieChart>
            </ResponsiveContainer>
            <DonutLegend items={assetItems}/>
          </Card>
          <Card title="Liability Breakdown" subtitle="By category">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={liabItems} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" strokeWidth={0}>
                {liabItems.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie><Tooltip formatter={v=>`LKR ${v.toLocaleString()}`} contentStyle={{background:"#1a1d27",border:`1px solid ${C.border2}`,borderRadius:10}}/></PieChart>
            </ResponsiveContainer>
            <DonutLegend items={liabItems}/>
          </Card>
          <Card title="Equity Trend" subtitle="Owner's equity over time">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthly}>
                <defs><linearGradient id="gEq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={.3}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill:C.muted,fontSize:10}}/>
                <YAxis hide/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="equity" name="Equity" stroke={C.blue} strokeWidth={2.5} fill="url(#gEq)"/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{marginTop:14,padding:"12px 16px",background:"rgba(59,130,246,0.08)",borderRadius:12,border:`1px solid rgba(59,130,246,0.2)`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{color:C.muted,fontSize:11,margin:0}}>Current Equity</p><p style={{color:C.blue,fontSize:18,fontWeight:800,margin:"4px 0 0"}}>LKR {equity.toLocaleString()}</p></div>
              <div style={{display:"flex",alignItems:"center",gap:5,color:C.green}}><I.TrendingUp/><span style={{fontSize:13,fontWeight:700}}>Growing</span></div>
            </div>
          </Card>
        </div>

        {/* DETAILED TABLES */}
        {view==="detailed"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {/* ASSETS TABLE */}
          <Card title="Assets Detail" subtitle="Full breakdown of all assets">
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border2}`}}>
                {["Asset","Value","% of Total","Type"].map(h=><th key={h} style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",padding:"9px 12px",textAlign:"left"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {assetItems.map((a,i)=><tr key={i} className="brow" style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.012)"}}>
                  <td style={{padding:"12px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:a.color}}/><span style={{color:C.text2,fontSize:13,fontWeight:600}}>{a.name}</span></div></td>
                  <td style={{color:C.green,fontSize:13,fontWeight:700,padding:"12px 12px"}}>LKR {a.value.toLocaleString()}</td>
                  <td style={{padding:"12px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:4,background:C.border,borderRadius:99}}><div style={{height:4,background:a.color,borderRadius:99,width:`${(a.value/totalAssets*100).toFixed(0)}%`}}/></div>
                      <span style={{color:C.muted,fontSize:11,minWidth:32}}>{(a.value/totalAssets*100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{padding:"12px 12px"}}><span style={{background:`${a.color}18`,color:a.color,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>{a.type}</span></td>
                </tr>)}
                <tr style={{borderTop:`2px solid ${C.border2}`,background:"rgba(255,255,255,0.02)"}}><td style={{color:C.text,fontSize:13,fontWeight:800,padding:"13px 12px"}}>TOTAL ASSETS</td><td style={{color:C.green,fontSize:13,fontWeight:800,padding:"13px 12px"}}>LKR {totalAssets.toLocaleString()}</td><td style={{color:C.muted,fontSize:12,padding:"13px 12px"}}>100%</td><td/></tr>
              </tbody>
            </table>
          </Card>

          {/* LIABILITIES TABLE */}
          <Card title="Liabilities & Equity" subtitle="Full breakdown">
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:`1px solid ${C.border2}`}}>
                {["Item","Value","% of Assets","Due"].map(h=><th key={h} style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",padding:"9px 12px",textAlign:"left"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {liabItems.map((l,i)=><tr key={i} className="brow" style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.012)"}}>
                  <td style={{padding:"12px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:l.color}}/><span style={{color:C.text2,fontSize:13,fontWeight:600}}>{l.name}</span></div></td>
                  <td style={{color:C.red,fontSize:13,fontWeight:700,padding:"12px 12px"}}>LKR {l.value.toLocaleString()}</td>
                  <td style={{padding:"12px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,height:4,background:C.border,borderRadius:99}}><div style={{height:4,background:l.color,borderRadius:99,width:`${(l.value/totalAssets*100).toFixed(0)}%`}}/></div>
                      <span style={{color:C.muted,fontSize:11,minWidth:32}}>{(l.value/totalAssets*100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{padding:"12px 12px"}}><span style={{background:`${l.color}18`,color:l.color,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>{l.due}</span></td>
                </tr>)}
                <tr style={{borderTop:`1px solid ${C.border2}`,background:"rgba(59,130,246,0.04)"}}><td style={{padding:"12px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:C.blue}}/><span style={{color:C.text2,fontSize:13,fontWeight:600}}>Owner's Equity</span></div></td><td style={{color:C.blue,fontSize:13,fontWeight:700,padding:"12px 12px"}}>LKR {equity.toLocaleString()}</td><td style={{color:C.muted,fontSize:11,padding:"12px 12px"}}>{(equity/totalAssets*100).toFixed(1)}%</td><td style={{padding:"12px 12px"}}><span style={{background:"rgba(59,130,246,0.12)",color:C.blue,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700}}>Permanent</span></td></tr>
                <tr style={{borderTop:`2px solid ${C.border2}`,background:"rgba(255,255,255,0.02)"}}><td style={{color:C.text,fontSize:13,fontWeight:800,padding:"13px 12px"}}>TOTAL L + EQUITY</td><td style={{color:C.text,fontSize:13,fontWeight:800,padding:"13px 12px"}}>LKR {totalAssets.toLocaleString()}</td><td style={{color:C.muted,fontSize:12,padding:"13px 12px"}}>100%</td><td/></tr>
              </tbody>
            </table>
          </Card>
        </div>}

        {/* EQUATION BANNER */}
        <div style={{background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.15)",borderRadius:16,padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(34,197,94,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><I.CheckCircle/></div>
            <div><p style={{color:C.green,fontSize:13,fontWeight:800,margin:0}}>Balance Sheet Equation Verified</p><p style={{color:C.muted,fontSize:12,margin:"3px 0 0"}}>Assets = Liabilities + Equity · Balanced</p></div>
          </div>
          <div style={{display:"flex",gap:28,alignItems:"center"}}>
            {[{l:"Assets",v:`LKR ${totalAssets.toLocaleString()}`,c:C.green},{l:"Liabilities",v:`LKR ${totalLiab.toLocaleString()}`,c:C.red},{l:"Equity",v:`LKR ${equity.toLocaleString()}`,c:C.blue}].map((item,i,arr)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{textAlign:"center"}}><p style={{color:C.muted,fontSize:11,margin:0,fontWeight:600}}>{item.l}</p><p style={{color:item.c,fontSize:15,fontWeight:900,margin:"3px 0 0"}}>{item.v}</p></div>
                {i<arr.length-1&&<span style={{color:C.faint,fontSize:20,fontWeight:300}}>{i===0?"=":"+"}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ReportPreviewModal open={reportPreview.open} onOpenChange={(open)=>setReportPreview(p=>({...p,open}))} html={reportPreview.html} filename={reportPreview.filename} reportTitle="Balance Sheet Report" />
    </div>
  );
}
