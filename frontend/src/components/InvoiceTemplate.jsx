import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { countNightsBetween } from '@/lib/invoiceNights';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Receipt is always light: white paper, black ink (survives app dark mode). */
const TEXT = '#111111';
const WHITE = '#ffffff';
const LINE = '#e5e5e5';
const CELL_BORDER = '#e0e0e0';
const HEADER_NAVY = '#1a2e5a';
const ZEBRA_GREY = '#f5f5f5';
const TOTAL_ROW_BG = '#e8eef5';

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

/** Whole numbers as 1, 2, 3; fractional quantities keep minimal decimals (e.g. 1.5). */
function formatInvoiceQty(qty) {
  const n = parseFloat(qty);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  const trimmed = parseFloat(n.toFixed(6));
  return Number.isInteger(trimmed) ? String(Math.round(trimmed)) : String(trimmed);
}

/** Legacy line text: "Room 1, 2026-04-09 to 2026-04-10" */
function parseDateRangeFromDescription(desc) {
  const m = String(desc).match(/(\d{4}-\d{2}-\d{2})\s*to\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  return { checkIn: m[1], checkOut: m[2] };
}

function extractRoomLabelFromDescription(desc) {
  const s = String(desc).trim();
  const m = s.match(/^Room\s+([^,·]+)/i);
  if (m) return `Room ${m[1].trim()}`;
  if (/^Room\b/i.test(s)) return 'Room';
  return 'Room';
}

/** First line = room stay: show "Room X · N nights" from invoice dates or legacy date range in text. */
function roomLineDescriptionForDisplay(rawTitle, checkIn, checkOut) {
  let d1 = checkIn ? String(checkIn).slice(0, 10) : null;
  let d2 = checkOut ? String(checkOut).slice(0, 10) : null;
  if (!d1 || !d2) {
    const parsed = parseDateRangeFromDescription(rawTitle);
    if (parsed) {
      d1 = d1 || parsed.checkIn;
      d2 = d2 || parsed.checkOut;
    }
  }
  const looksLikeRoom =
    /^Room\s/i.test(rawTitle) || (d1 && d2 && /\d{4}-\d{2}-\d{2}\s*to\s*\d{4}-\d{2}-\d{2}/.test(rawTitle));
  if (!looksLikeRoom || !d1 || !d2) return rawTitle;

  const nights = countNightsBetween(d1, d2);
  const roomLabel = extractRoomLabelFromDescription(rawTitle);
  if (nights > 0) return `${roomLabel} · ${nights} night${nights !== 1 ? 's' : ''}`;
  return `${roomLabel} · Stay`;
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
      let title = it.name || it.description || 'Item';
      if (i === 0) {
        title = roomLineDescriptionForDisplay(title, checkIn, checkOut);
      }
      const detail = (it.description || it.name || '').trim();
      return {
        id: i + 1,
        description: title,
        descSub: it.sku || it.note || '',
        itemDetail: detail && detail !== title ? detail : '',
        price,
        quantity: qty,
        total: lineTotal,
        qtyStr: formatInvoiceQty(qty),
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
    background: WHITE,
    border: `0.5px solid ${LINE}`,
    borderRadius: 12,
    padding: '2.5rem 2.5rem 2rem',
    color: TEXT,
  },
  title: {
    fontSize: 28,
    fontWeight: 500,
    color: TEXT,
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    justifyContent: 'center',
    fontSize: 13,
    color: TEXT,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    color: TEXT,
  },
  dividerBold: {
    border: 'none',
    borderTop: `2px solid ${TEXT}`,
    margin: '1.5rem 0',
  },
  dividerLight: {
    border: 'none',
    borderTop: `0.5px solid ${LINE}`,
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
    color: TEXT,
    margin: '0 0 6px 0',
  },
  clientName: {
    fontWeight: 500,
    fontSize: 15,
    margin: '0 0 2px 0',
    color: TEXT,
  },
  clientEmail: {
    fontSize: 13,
    color: TEXT,
    margin: 0,
  },
  receiptLabel: {
    fontSize: 22,
    fontWeight: 500,
    letterSpacing: '0.08em',
    margin: 0,
    color: TEXT,
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 14,
    margin: '0 0 8px 0',
    color: TEXT,
  },
  bookingGrid: {
    display: 'grid',
    gridTemplateColumns: '100px 1fr',
    gap: '6px 16px',
    fontSize: 14,
  },
  bookingLabel: {
    color: TEXT,
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
        .invoice-receipt-print { color-scheme: only light; }
        .invoice-receipt-print, .invoice-receipt-print.inv-print-area { background: #ffffff !important; color: #111111 !important; }
        .invoice-receipt-print table.inv-line-items { border: 1px solid ${CELL_BORDER} !important; }
        .invoice-receipt-print table.inv-line-items thead th {
          background-color: ${HEADER_NAVY} !important;
          color: #ffffff !important;
          border: 1px solid ${HEADER_NAVY} !important;
        }
        .invoice-receipt-print table.inv-line-items tbody td,
        .invoice-receipt-print table.inv-line-items tfoot td {
          border: 1px solid ${CELL_BORDER} !important;
        }
        .invoice-receipt-print table.inv-line-items tbody tr {
          border-bottom: 1px solid ${CELL_BORDER} !important;
          background: transparent !important;
        }
        .invoice-receipt-print table.inv-line-items tfoot tr {
          background: transparent !important;
        }
        .invoice-receipt-print table.inv-line-items tfoot tr:first-child td {
          background-color: #ffffff !important;
          color: #111111 !important;
        }
        .invoice-receipt-print table.inv-line-items tfoot tr:last-child td {
          background-color: ${TOTAL_ROW_BG} !important;
          color: ${HEADER_NAVY} !important;
        }
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
              background: dlStatus === 'loading' ? '#7f1d1d' : dlStatus === 'done' ? '#166534' : '#1a2e5a',
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
              background: '#1a2e5a',
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
          className="inv-print-area invoice-receipt-print"
          style={{
            width: 680,
            maxWidth: 680,
            minWidth: 280,
            margin: '0 auto',
            background: WHITE,
            color: TEXT,
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
                  <div
                    style={{
                      marginTop: 10,
                      marginLeft: 'auto',
                      width: 'fit-content',
                      maxWidth: '100%',
                      fontSize: 13,
                      color: TEXT,
                      background: WHITE,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                        alignItems: 'baseline',
                        gap: '6px 14px',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: TEXT, fontWeight: 600 }}>Receipt #:</span>
                      <span style={{ color: TEXT, fontWeight: 400 }}>{inv.invoiceNumber}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                        alignItems: 'baseline',
                        gap: '6px 14px',
                      }}
                    >
                      <span style={{ color: TEXT, fontWeight: 600 }}>Receipt Date:</span>
                      <span style={{ color: TEXT, fontWeight: 400 }}>{inv.receiptDateFormatted}</span>
                    </div>
                  </div>
                </div>
              </div>

              <hr style={styles.dividerLight} />

              {inv.showBooking ? (
                <>
                  <p style={{ ...styles.sectionTitle, color: HEADER_NAVY }}>Booking Details</p>
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

              <table
                className="inv-line-items"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                  marginTop: 16,
                  tableLayout: 'fixed',
                  color: TEXT,
                }}
              >
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '26%' }} />
                </colgroup>
                <thead>
                  <tr>
                    {[
                      { key: 'Quantity', align: 'left' },
                      { key: 'Description', align: 'left' },
                      { key: 'Unit Price', align: 'right' },
                      { key: 'Amount', align: 'right' },
                    ].map(({ key, align }) => (
                      <th
                        key={key}
                        style={{
                          padding: '10px 14px',
                          fontWeight: 600,
                          fontSize: 13,
                          textAlign: align,
                          verticalAlign: 'middle',
                        }}
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map((row, i) => (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          color: '#333333',
                          background: i % 2 === 1 ? ZEBRA_GREY : WHITE,
                          verticalAlign: 'top',
                        }}
                      >
                        {row.qtyStr}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          color: '#333333',
                          background: i % 2 === 1 ? ZEBRA_GREY : WHITE,
                          verticalAlign: 'top',
                        }}
                      >
                        {row.description}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          color: '#333333',
                          background: i % 2 === 1 ? ZEBRA_GREY : WHITE,
                          verticalAlign: 'top',
                        }}
                      >
                        {fmt(row.price, cc)}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          color: '#333333',
                          background: i % 2 === 1 ? ZEBRA_GREY : WHITE,
                          verticalAlign: 'top',
                        }}
                      >
                        {`${fmt(row.total, cc)}*`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        padding: '10px 14px',
                        background: WHITE,
                        border: `1px solid ${CELL_BORDER}`,
                      }}
                    />
                    <td
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 600,
                        background: WHITE,
                        color: '#333333',
                        border: `1px solid ${CELL_BORDER}`,
                      }}
                    >
                      Subtotal
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 600,
                        background: WHITE,
                        color: '#333333',
                        border: `1px solid ${CELL_BORDER}`,
                      }}
                    >
                      {fmt(inv.subtotal, cc)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        padding: '10px 14px',
                        background: TOTAL_ROW_BG,
                        border: `1px solid ${CELL_BORDER}`,
                      }}
                    />
                    <td
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 15,
                        background: TOTAL_ROW_BG,
                        color: HEADER_NAVY,
                        border: `1px solid ${CELL_BORDER}`,
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontSize: 15,
                        background: TOTAL_ROW_BG,
                        color: HEADER_NAVY,
                        border: `1px solid ${CELL_BORDER}`,
                      }}
                    >
                      {fmt(inv.total, cc)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <hr style={styles.dividerLight} />

              <div>
                <p style={styles.sectionTitle}>Notes</p>
                <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{inv.notes}</p>
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
