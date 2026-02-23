import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const SpinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'invoiceSpin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return String(phone).trim();
}

function normalise(raw = {}, currency = 'LKR', settings = {}) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const subtotal = raw.subtotal ?? items.reduce((s, i) => s + (parseFloat(i.price || 0) * parseFloat(i.quantity ?? i.qty ?? 1)), 0);
  const taxAmount = raw.taxAmount ?? raw.tax ?? 0;
  const total = raw.total ?? (raw.subtotal ?? subtotal) + taxAmount;
  const payment = raw.bankDetails || settings?.bankDetails || {};

  const paymentMadeNum = parseFloat(raw.paymentMade ?? raw.paymentMadeAmount ?? 0) || 0;
  const totalNum = total;
  const balanceDueNum = Math.max(0, totalNum - paymentMadeNum);

  return {
    invoiceNumber: raw.invoiceNumber || raw.id || '—',
    invoiceDate: formatDate(raw.createdAt || raw.date || raw.invoiceDate),
    dueDate: formatDate(raw.dueDate || raw.createdAt || raw.date || raw.invoiceDate),
    termsLabel: raw.terms || 'Due on Receipt',
    currency: currency || settings?.currency || 'LKR',

    companyName: settings?.businessName || 'COMPANY',
    companyTagline: settings?.businessName ? '' : 'COMPANY TAGLINE HERE',
    companyAddress: settings?.address || '',
    companyPhone: formatPhoneDisplay(settings?.phone || '0741525537'),
    companyEmail: settings?.email || 'hello@logozodev.com',
    companyWebsite: settings?.website || 'www.logozodev.com',

    clientName: raw.clientName || raw.customerName || '—',
    clientPhone: raw.clientPhone || '',
    clientEmail: raw.clientEmail || '',

    items: items.map((it, i) => {
      const qty = parseFloat(it.quantity ?? it.qty ?? 1);
      const price = parseFloat(it.price || 0);
      const lineTotal = it.total ?? (price * qty);
      const title = it.name || it.description || 'Item';
      const detail = (it.description || it.name || '').trim();
      return {
        id: i + 1,
        no: String(i + 1).padStart(2, '0'),
        description: title,
        descSub: it.sku || it.note || '',
        itemDetail: detail && detail !== title ? detail : '',
        price,
        quantity: qty,
        total: lineTotal,
        rateFormatted: price.toLocaleString(),
        amountFormatted: lineTotal.toLocaleString(),
        qtyStr: qty.toFixed(2),
      };
    }),

    subtotal,
    subTotalFormatted: (subtotal ?? 0).toLocaleString(),
    taxRate: raw.taxRate ?? settings?.taxRate ?? 0,
    tax: taxAmount,
    total,
    totalFormatted: `${currency || settings?.currency || 'LKR'} ${(total ?? 0).toLocaleString()}`,
    paymentMade: paymentMadeNum,
    paymentMadeFormatted: paymentMadeNum ? `(-) ${paymentMadeNum.toLocaleString()}` : null,
    balanceDue: balanceDueNum,
    balanceDueFormatted: `${currency || settings?.currency || 'LKR'} ${balanceDueNum.toLocaleString()}`,

    paymentMethod: (raw.paymentMethod || 'bank').toString().toLowerCase(),
    payment,
    showSignatureArea: Boolean(raw.showSignatureArea),

    dearClient: raw.notes || 'Thank you for your business. Please contact us if you have any questions.',
    notes: raw.notes || 'Thanks for your business.',
    terms: 'Payment due on receipt. Thank you for your business.',
    termsConditions: Array.isArray(raw.termsConditions) ? raw.termsConditions : (raw.terms ? [raw.terms] : ['Payment due on receipt. Thank you for your business.']),
  };
}

function fmt(amount, currency = 'LKR') {
  const num = parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.slice(0, 3), minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

// Montserrat invoice template styles (logo + company details)
const invoiceStyles = {
  page: {
    fontFamily: "'Montserrat', sans-serif",
    maxWidth: '100%',
    margin: 0,
    padding: '48px 40px',
    background: '#fff',
    color: '#1a1a1a',
    position: 'relative',
    boxSizing: 'border-box',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  logoBox: {
    width: '180px',
    height: '70px',
    marginBottom: '12px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'transparent',
  },
  logoPlaceholder: {
    width: '180px',
    height: '70px',
    border: '2px dashed #ccc',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fafafa',
    color: '#aaa',
    fontSize: '12px',
    fontFamily: "'Montserrat', sans-serif",
  },
  logoRed: {
    background: '#cc0000',
    color: '#fff',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 900,
    fontSize: '26px',
    padding: '10px 20px',
    letterSpacing: '-1px',
    display: 'inline-block',
    borderRadius: '3px',
    marginBottom: '12px',
  },
  sellerInfo: { fontSize: '13px', lineHeight: '1.7', color: '#333' },
  sellerName: { fontWeight: 'bold', fontSize: '15px', marginBottom: '2px' },
  invoiceWord: { fontSize: '46px', fontWeight: 600, letterSpacing: '6px', color: '#1a1a1a', lineHeight: 1, textAlign: 'right', fontFamily: "'Montserrat', sans-serif" },
  invoiceNum: { fontSize: '14px', color: '#555', marginTop: '6px', textAlign: 'right' },
  metaSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '8px 0 20px' },
  billToLabel: { color: '#555', fontSize: '13px', marginBottom: '4px' },
  billToName: { fontWeight: 'bold', fontSize: '15px' },
  billToDetail: { fontSize: '13px', color: '#1a1a1a', marginTop: '2px' },
  metaRow: { display: 'flex', justifyContent: 'flex-end', gap: '24px', marginBottom: '4px', fontSize: '13px' },
  metaKey: { color: '#555' },
  metaVal: { color: '#1a1a1a', fontWeight: 500, minWidth: '120px', textAlign: 'right' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px', border: 'none', borderSpacing: 0 },
  th: {
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'left',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  },
  td: {
    padding: '14px 14px',
    fontSize: '13px',
    verticalAlign: 'top',
    border: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
    color: '#1a1a1a',
  },
  itemTitle: { fontWeight: 600, marginBottom: '2px', fontSize: '13px', color: '#1a1a1a' },
  itemSku: { color: '#333', fontSize: '12px', marginTop: '4px' },
  itemDesc: { color: '#333', fontSize: '12px', marginTop: '3px', lineHeight: 1.5 },
  totalsSection: { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' },
  totalsTable: { width: '300px', fontSize: '13px' },
  row: (extra = {}) => ({ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0', ...extra }),
  notes: { marginTop: '40px', fontSize: '13px' },
  notesTitle: { fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '48px' },
  sigBlock: { textAlign: 'center', fontSize: '12px', color: '#555' },
  sigLine: { borderTop: '1px solid #aaa', width: '140px', margin: '32px auto 4px' },
};

export default function InvoiceTemplate({
  invoice: invoiceProp,
  order,
  currency = 'LKR',
  autoAction = null,
  onAutoActionDone,
}) {
  const { settings } = useFinance();
  const raw = invoiceProp || order || {};
  const inv = normalise(raw, currency, settings);

  const printAreaRef = useRef(null);
  const [dlStatus, setDlStatus] = useState('idle');
  const [prtStatus, setPrtStatus] = useState('idle');

  const handleDownloadPdf = useCallback(async () => {
    if (dlStatus === 'loading') return;
    const element = printAreaRef.current;
    if (!element) return;

    setDlStatus('loading');
    try {
      const filename = `Invoice-${String(inv.invoiceNumber).replace(/^#/, '')}.pdf`;
      const scale = 2;
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const w = element.offsetWidth;
      const h = element.offsetHeight;
      const wMm = (w * 25.4) / 96;
      const hMm = (h * 25.4) / 96;
      const pdf = new jsPDF({ unit: 'mm', format: [wMm, hMm], hotfixes: ['px_scaling'] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wMm, hMm);
      pdf.save(filename);

      setDlStatus('done');
      setTimeout(() => setDlStatus('idle'), 2500);
    } catch (err) {
      console.error('PDF error:', err);
      setDlStatus('error');
      setTimeout(() => setDlStatus('idle'), 3000);
    }
  }, [dlStatus, inv.invoiceNumber]);

  const handlePrint = useCallback(() => {
    setPrtStatus('loading');
    setTimeout(() => {
      window.print();
      setPrtStatus('idle');
    }, 150);
  }, []);

  useEffect(() => {
    if (!autoAction) return;
    const run = async () => {
      if (autoAction === 'download') await handleDownloadPdf();
      else if (autoAction === 'print') handlePrint();
      onAutoActionDone?.();
    };
    run();
  }, [autoAction]);

  const numItems = inv.items.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;900&display=swap');
        .inv-root * { box-sizing: border-box; }
        .inv-root * { font-family: 'Montserrat', sans-serif !important; }
        @keyframes invoiceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden !important; }
          .inv-print-area, .inv-print-area * { visibility: visible !important; }
          .inv-print-area { position: fixed !important; left: 0; top: 0; width: 180mm !important; max-width: 180mm !important; min-height: 297mm !important; background: #fff !important; box-shadow: none !important; margin: 0 auto !important; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>

      <div className="inv-root inv-classic" style={{ background: '#d1d5db', minHeight: '100vh', padding: '32px 16px' }}>

        <div className="no-print" style={{ maxWidth: 680, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={handleDownloadPdf}
            disabled={dlStatus === 'loading'}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              background: dlStatus === 'loading' ? '#7f1d1d' : dlStatus === 'done' ? '#166534' : '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              cursor: dlStatus === 'loading' ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (dlStatus === 'idle') e.currentTarget.style.background = '#cc0000'; }}
            onMouseLeave={(e) => { if (dlStatus === 'idle') e.currentTarget.style.background = '#1a1a1a'; }}
          >
            {dlStatus === 'loading' ? <SpinIcon /> : <DownloadIcon />}
            {dlStatus === 'loading' ? 'Generating…' : dlStatus === 'done' ? '✓ Downloaded!' : dlStatus === 'error' ? 'Retry' : 'Download PDF (A4)'}
          </button>
          <button
            onClick={handlePrint}
            disabled={prtStatus === 'loading'}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              background: '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#cc0000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
          >
            <PrintIcon />
            Print
          </button>
        </div>

        <div
          ref={printAreaRef}
          className="inv-print-area"
          style={{
            width: 680,
            maxWidth: 680,
            minWidth: 680,
            margin: '0 auto',
            background: '#fff',
            boxShadow: '0 4px 40px rgba(0,0,0,0.18)',
            fontFamily: "'Montserrat', sans-serif",
            boxSizing: 'border-box',
          }}
        >
          <div style={invoiceStyles.page}>
            <div style={invoiceStyles.header}>
              <div>
                {settings?.logo ? (
                  <div style={invoiceStyles.logoBox}>
                    <img src={settings.logo} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={invoiceStyles.logoRed}>{inv.companyName}</div>
                )}
                <div style={invoiceStyles.sellerInfo}>
                  <div style={invoiceStyles.sellerName}>{inv.companyName}</div>
                  {inv.companyAddress && <div>{inv.companyAddress}</div>}
                  <div>{inv.companyPhone}</div>
                  <div>{inv.companyEmail}</div>
                  {inv.companyWebsite && <div>{inv.companyWebsite}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={invoiceStyles.invoiceWord}>INVOICE</div>
                <div style={invoiceStyles.invoiceNum}># {inv.invoiceNumber}</div>
              </div>
            </div>

            <div style={invoiceStyles.metaSection}>
              <div>
                <div style={invoiceStyles.billToLabel}>Bill To</div>
                <div style={invoiceStyles.billToName}>{inv.clientName}</div>
                {inv.clientPhone && (
                  <div style={invoiceStyles.billToDetail}>{formatPhoneDisplay(inv.clientPhone)}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {[
                  ['Invoice Date :', inv.invoiceDate],
                  ['Terms :', inv.termsLabel],
                  ['Due Date :', inv.dueDate],
                ].map(([k, v]) => (
                  <div key={k} style={invoiceStyles.metaRow}>
                    <span style={invoiceStyles.metaKey}>{k}</span>
                    <span style={invoiceStyles.metaVal}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <table style={invoiceStyles.table}>
              <thead>
                <tr>
                  <th style={{ ...invoiceStyles.th, width: '40px' }}>#</th>
                  <th style={{ ...invoiceStyles.th }}>Description</th>
                  <th style={{ ...invoiceStyles.th, width: '80px', textAlign: 'right' }}>Qty</th>
                  <th style={{ ...invoiceStyles.th, width: '100px', textAlign: 'right' }}>Rate</th>
                  <th style={{ ...invoiceStyles.th, width: '110px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((item) => (
                  <tr key={item.id} className="avoid-break">
                    <td style={invoiceStyles.td}>{item.id}</td>
                    <td style={invoiceStyles.td}>
                      <div style={invoiceStyles.itemTitle}>{item.description}</div>
                      {item.descSub ? <div style={invoiceStyles.itemSku}>SKU : {item.descSub}</div> : null}
                      {item.itemDetail ? <div style={invoiceStyles.itemDesc}>{item.itemDetail}</div> : null}
                    </td>
                    <td style={{ ...invoiceStyles.td, textAlign: 'right' }}>{item.qtyStr}</td>
                    <td style={{ ...invoiceStyles.td, textAlign: 'right' }}>{item.rateFormatted}</td>
                    <td style={{ ...invoiceStyles.td, textAlign: 'right' }}>{item.amountFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={invoiceStyles.totalsSection}>
              <div style={invoiceStyles.totalsTable}>
                <div style={invoiceStyles.row()}><span>Sub Total</span><span>{inv.subTotalFormatted}</span></div>
                <div style={invoiceStyles.row({ fontWeight: 'bold', fontSize: '15px', borderTop: '2px solid #1a1a1a', borderBottom: 'none', marginTop: '4px', paddingTop: '8px' })}>
                  <span>Total</span><span>{inv.totalFormatted}</span>
                </div>
              </div>
            </div>

            <div style={invoiceStyles.notes}>
              <div style={invoiceStyles.notesTitle}>Notes</div>
              <div>{inv.notes}</div>
            </div>

            <div style={invoiceStyles.footer}>
              <div style={invoiceStyles.sigBlock}>
                <div style={invoiceStyles.sigLine} />
                <div>Prepared By</div>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print" style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          {numItems} line item{numItems !== 1 ? 's' : ''} · {inv.currency}
        </div>
      </div>
    </>
  );
}
