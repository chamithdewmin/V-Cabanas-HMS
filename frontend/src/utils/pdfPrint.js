import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Wraps report/print content with logo (top-left), optional business name, and "Generated from MyAccounts" footer.
 * Uses the invoice/company logo uploaded in Settings.
 * @param {string} innerContent - The main HTML content
 * @param {{ logo?: string | null, businessName?: string }} options
 * @returns {string} Full HTML for print/PDF
 */
export function getPrintHtml(innerContent, options = {}) {
  const { logo, businessName } = options;
  const logoHtml = logo
    ? `<div style="margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #111;">
    <img src="${logo}" alt="Logo" style="height:48px; width:auto; max-width:200px; object-fit:contain;" onerror="this.style.display='none'" />
  </div>`
    : '';
  const titleHtml = businessName ? `<h1 style="font-size:18px; font-weight:700; margin:0 0 16px; color:#111;">${escapeHtml(businessName)}</h1>` : '';
  const footer = '<p style="font-size:10px; color:#666; margin-top:16px; padding-top:12px; border-top:1px solid #ddd;">Generated from MyAccounts</p>';
  return `<div style="padding:24px; font-family:'Inter',-apple-system,sans-serif; color:#111; background:#fff; font-size:14px; line-height:1.5; max-width:100%; min-height:200px;">${logoHtml}${titleHtml}${innerContent}${footer}</div>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Full HTML document for report print/PDF - ensures correct styling and A4 layout.
 */
function getReportDocumentHtml(html, filename) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename.replace('.pdf', '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #000; }
    @page { size: A4; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${html}</body>
</html>`;
}

/**
 * Opens print dialog for the report (no new tab). User selects "Save as PDF"
 * or "Print" in the dialog. Uses a hidden iframe so the page does not navigate.
 * @param {string} html - Full HTML content (from getPrintHtml)
 * @param {string} filename - e.g. 'balance-sheet-20260206.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportPdf(html, filename) {
  const fullDoc = getReportDocumentHtml(html, filename);
  const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:0;visibility:hidden;');
  iframe.src = url;
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  try {
    await new Promise((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load report for print'));
      setTimeout(resolve, 800);
    });

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      cleanup();
      throw new Error('Could not access report content');
    }

    const imgs = doc.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        setTimeout(resolve, 2500);
      });
    }));

    await new Promise((r) => setTimeout(r, 300));
    iframe.contentWindow.print();

    iframe.contentWindow.onafterprint = cleanup;
    setTimeout(cleanup, 3000);
  } catch (err) {
    cleanup();
    throw err;
  }
}

/**
 * Downloads report as a PDF file directly (no print dialog). Captures the given
 * DOM element with html2canvas and saves via jsPDF. Use the modal's report content element.
 * @param {HTMLElement} element - The report content div (e.g. modal's contentRef.current)
 * @param {string} filename - e.g. 'overview-report-2026-02-19.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportPdfFile(element, filename) {
  if (!element) throw new Error('No report content to download');
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
}

/**
 * Legacy: opens print dialog. Use downloadReportPdfFile for direct PDF download.
 * @param {string} html - Full HTML content (from getPrintHtml)
 * @param {string} filename - e.g. 'overview-report-2026-02-19.pdf'
 * @returns {Promise<void>}
 */
export async function downloadReportAsPdf(html, filename) {
  await downloadReportPdf(html, filename);
}
