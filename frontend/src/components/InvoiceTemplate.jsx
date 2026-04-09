import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const NAVY = '#1a2e5a';
const MUTED = '#888';

const LocationIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

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

function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function formatReceiptDateDDMMYYYY(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDateLong(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
  const subtotal =
    raw.subtotal ?? items.reduce((s, i) => s + parseFloat(i.price || 0) * parseFloat(i.quantity ?? i.qty ?? 1), 0);
  const taxAmount = raw.taxAmount ?? raw.tax ?? 0;
  const total = raw.total ?? (raw.subtotal ?? subtotal) + taxAmount;

  const checkIn = raw.checkIn || raw.bookingCheckIn;
  const checkOut = raw.checkOut || raw.bookingCheckOut;
  const adults = raw.adults ?? raw.booking?.adults;
  const children = raw.children ?? raw.booking?.children;

  let guestsLine = '';
  if (adults != null || children != null) {
    const a = adults != null ? Number(adults) : null;
    const c = children != null ? Number(children) : null;
    const parts = [];
    if (a != null && !Number.isNaN(a)) parts.push(`${a} adult${a !== 1 ? 's' : ''}`);
    if (c != null && !Number.isNaN(c)) parts.push(`${c} child${c !== 1 ? 'ren' : ''}`);
    guestsLine = parts.join(', ');
  }

  return {
    invoiceNumber: raw.invoiceNumber || raw.id || '—',
    invoiceDate: formatDateShort(raw.createdAt || raw.date || raw.invoiceDate),
    receiptDateFormatted: formatReceiptDateDDMMYYYY(raw.createdAt || raw.date || raw.invoiceDate),
    dueDate: formatDateShort(raw.dueDate || raw.createdAt || raw.date || raw.invoiceDate),
    termsLabel: raw.terms || 'Due on Receipt',
    currency: currency || settings?.currency || 'LKR',

    companyName: settings?.businessName || 'COMPANY',
    companyAddress: settings?.address || '',
    companyPhone: formatPhoneDisplay(settings?.phone || ''),
    companyEmail: settings?.email || '',
    companyWebsite: settings?.website || '',

    clientName: raw.clientName || raw.customerName || '—',
    clientPhone: raw.clientPhone || '',
    clientEmail: raw.clientEmail || '',

    showBooking: Boolean(checkIn || checkOut),
    bookingCheckInLong: checkIn ? formatDateLong(checkIn) : '',
    bookingCheckOutLong: checkOut ? formatDateLong(checkOut) : '',
    guestsLine,

    items: items.map((it, i) => {
      const qty = parseFloat(it.quantity ?? it.qty ?? 1);
      const price = parseFloat(it.price || 0);
      const lineTotal = it.total ?? price * qty;
      const title = it.name || it.description || 'Item';
      const detail = (it.description || it.name || '').trim();
      return {
        id: i + 1,
        description: title,
        descSub: it.sku || it.note || '',
        itemDetail: detail && detail !== title ? detail : '',
        price,
        quantity: qty,
        total: lineTotal,
        qtyStr: qty.toFixed(2),
      };
    }),

    subtotal,
    taxRate: raw.taxRate ?? settings?.taxRate ?? 0,
    tax: taxAmount,
    total,

    notes: raw.notes || 'Thank you for staying with us. We look forward to your next visit :)',
  };
}

function fmt(amount, currency = 'LKR') {
  const num = parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.slice(0, 3),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

const styles = {
  wrap: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  },
  card: {
    background: '#fff',
    border: '0.5px solid #e0e0e0',
    borderRadius: 12,
    padding: '2.5rem 2.5rem 2rem',
    color: '#111',
  },
  title: {
    fontSize: 28,
    fontWeight: 500,
    color: NAVY,
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    justifyContent: 'center',
    fontSize: 13,
    color: MUTED,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: MUTED,
  },
  dividerBold: {
    border: 'none',
    borderTop: `2px solid ${NAVY}`,
    margin: '1.5rem 0',
  },
  dividerLight: {
    border: 'none',
    borderTop: '0.5px solid #e0e0e0',
    margin: '1.25rem 0',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: MUTED,
    margin: '0 0 6px 0',
  },
  clientName: {
    fontWeight: 500,
    fontSize: 15,
    margin: '0 0 2px 0',
  },
  clientEmail: {
    fontSize: 13,
    color: MUTED,
    margin: 0,
  },
  receiptLabel: {
    fontSize: 22,
    fontWeight: 500,
    letterSpacing: '0.08em',
    margin: 0,
    color: NAVY,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  metaKey: {
    color: MUTED,
    fontWeight: 500,
    paddingRight: 12,
    textAlign: 'right',
    paddingTop: 3,
    paddingBottom: 3,
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 14,
    margin: '0 0 8px 0',
    color: NAVY,
  },
  bookingGrid: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr',
    gap: '6px 16px',
    fontSize: 14,
  },
  bookingLabel: {
    color: MUTED,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
    marginTop: 16,
  },
  thead: {
    background: NAVY,
    color: '#fff',
  },
  th: {
    padding: '10px 14px',
    fontWeight: 500,
    fontSize: 13,
  },
  td: {
    padding: '10px 14px',
  },
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
  const cc = inv.currency || 'LKR';

  const printAreaRef = useRef(null);
  const [dlStatus, setDlStatus] = useState('idle');
  const [prtStatus, setPrtStatus] = useState('idle');

  const handleDownloadPdf = useCallback(async () => {
    if (dlStatus === 'loading') return;
    const element = printAreaRef.current;
    if (!element) return;

    setDlStatus('loading');
    try {
      const safeNum = String(inv.invoiceNumber).replace(/[/\\?%*:|"<>]/g, '-');
      const filename = `Receipt-${safeNum}.pdf`;
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
  const metaItems = [
    inv.companyAddress ? { icon: <LocationIcon />, text: inv.companyAddress } : null,
    inv.companyPhone ? { icon: <PhoneIcon />, text: inv.companyPhone } : null,
    inv.companyEmail ? { icon: <MailIcon />, text: inv.companyEmail } : null,
  ].filter(Boolean);

  return (
    <>
      <style>{`
        .inv-root * { box-sizing: border-box; }
        @keyframes invoiceSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body * { visibility: hidden !important; }
          .inv-print-area, .inv-print-area * { visibility: visible !important; }
          .inv-print-area { position: fixed !important; left: 0; top: 0; width: 180mm !important; max-width: 180mm !important; min-height: 297mm !important; background: #fff !important; box-shadow: none !important; margin: 0 auto !important; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 15mm; }
        }
      `}</style>

      <div className="inv-root" style={{ background: '#d1d5db', minHeight: '100vh', padding: '32px 16px' }}>
        <div className="no-print" style={{ maxWidth: 680, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={dlStatus === 'loading'}
            style={{
              fontWeight: 600,
              fontSize: 14,
              background: dlStatus === 'loading' ? '#7f1d1d' : dlStatus === 'done' ? '#166534' : NAVY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              cursor: dlStatus === 'loading' ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            }}
          >
            {dlStatus === 'loading' ? <SpinIcon /> : <DownloadIcon />}
            {dlStatus === 'loading' ? 'Generating…' : dlStatus === 'done' ? '✓ Downloaded!' : dlStatus === 'error' ? 'Retry' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={prtStatus === 'loading'}
            style={{
              fontWeight: 600,
              fontSize: 14,
              background: NAVY,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
            }}
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
            minWidth: 280,
            margin: '0 auto',
            background: '#fff',
            boxShadow: '0 4px 40px rgba(0,0,0,0.18)',
            boxSizing: 'border-box',
          }}
        >
          <div style={styles.wrap}>
            <div style={styles.card}>
              <div style={{ textAlign: 'center' }}>
                {settings?.logo ? (
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                    <img src={settings.logo} alt="" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain' }} />
                  </div>
                ) : null}
                <h1 style={styles.title}>{inv.companyName}</h1>
                {metaItems.length > 0 ? (
                  <div style={styles.metaRow}>
                    {metaItems.map((item, i) => (
                      <span key={i} style={styles.metaItem}>
                        {item.icon} {item.text}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <hr style={styles.dividerBold} />

              <div style={styles.topSection}>
                <div>
                  <p style={styles.sectionLabel}>Paid By</p>
                  <p style={styles.clientName}>{inv.clientName}</p>
                  {inv.clientEmail ? <p style={styles.clientEmail}>{inv.clientEmail}</p> : null}
                  {inv.clientPhone ? <p style={{ ...styles.clientEmail, marginTop: 4 }}>{formatPhoneDisplay(inv.clientPhone)}</p> : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={styles.receiptLabel}>RECEIPT</p>
                  <table style={{ marginTop: 10, fontSize: 13, marginLeft: 'auto' }}>
                    <tbody>
                      <tr>
                        <td style={styles.metaKey}>Receipt #:</td>
                        <td style={{ textAlign: 'left' }}>{inv.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style={styles.metaKey}>Receipt Date:</td>
                        <td style={{ textAlign: 'left' }}>{inv.receiptDateFormatted}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <hr style={styles.dividerLight} />

              {inv.showBooking ? (
                <>
                  <p style={styles.sectionTitle}>Booking Details</p>
                  <div style={styles.bookingGrid}>
                    <span style={styles.bookingLabel}>Check-in</span>
                    <span>{inv.bookingCheckInLong || '—'}</span>
                    <span style={styles.bookingLabel}>Check-out</span>
                    <span>{inv.bookingCheckOutLong || '—'}</span>
                    <span style={styles.bookingLabel}>Guests</span>
                    <span>{inv.guestsLine || '—'}</span>
                  </div>
                  <hr style={styles.dividerLight} />
                </>
              ) : null}

              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {['Quantity', 'Description', 'Unit Price', 'Amount'].map((h) => (
                      <th
                        key={h}
                        style={{
                          ...styles.th,
                          textAlign: h === 'Quantity' ? 'center' : h === 'Description' ? 'left' : 'right',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '0.5px solid #e0e0e0',
                        background: i % 2 === 0 ? '#fafafa' : '#fff',
                      }}
                    >
                      <td style={{ ...styles.td, textAlign: 'center', color: MUTED }}>{row.qtyStr}</td>
                      <td style={styles.td}>{row.description}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: MUTED }}>{fmt(row.price, cc)}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>{`${fmt(row.total, cc)}*`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 4 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 14px', width: '50%' }} />
                    <td style={{ padding: '6px 14px', color: MUTED }}>Subtotal</td>
                    <td style={{ padding: '6px 14px', textAlign: 'right' }}>{fmt(inv.subtotal, cc)}</td>
                  </tr>
                  {inv.tax > 0 ? (
                    <tr>
                      <td style={{ padding: '6px 14px' }} />
                      <td style={{ padding: '6px 14px', color: MUTED }}>Tax</td>
                      <td style={{ padding: '6px 14px', textAlign: 'right' }}>{fmt(inv.tax, cc)}</td>
                    </tr>
                  ) : null}
                  <tr style={{ borderTop: '0.5px solid #e0e0e0' }}>
                    <td style={{ padding: '6px 14px' }} />
                    <td
                      style={{
                        padding: '6px 14px',
                        color: '#111',
                        fontWeight: 600,
                        fontSize: 15,
                        background: '#e8eef5',
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        padding: '6px 14px',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: 15,
                        background: '#e8eef5',
                      }}
                    >
                      {fmt(inv.total, cc)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <hr style={styles.dividerLight} />

              <div>
                <p style={styles.sectionTitle}>Notes</p>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{inv.notes}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print" style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#6b7280' }}>
          {numItems} line item{numItems !== 1 ? 's' : ''} · {cc}
        </div>
      </div>
    </>
  );
}
