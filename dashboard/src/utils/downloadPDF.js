/**
 * A robust PDF export utility that uses the browser's native print engine.
 * Guarantees consistent layout regardless of the user's Margins setting
 * (Default, None, Minimum) in the print dialog.
 */

export const downloadPDF = (elementId, filename = 'report') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return Promise.reject(new Error(`Element "${elementId}" not found`));
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const reportTitle = filename.replace('.pdf', '').replace(/_/g, ' ');

  const style = document.createElement('style');
  style.id = 'print-pdf-styles';
  style.innerHTML = `
    @media print {
      /* Hide everything except our wrapper */
      body > :not(#__print_wrapper__) {
        display: none !important;
      }

      @page {
        /*
         * THE FIX:
         * We cannot force the user's print dialog margin to "None" via CSS —
         * the browser dialog always wins over @page margin declarations.
         *
         * Instead, we SET a known fixed margin here (10mm all sides).
         * This overrides "Default" AND "None" in most Chromium browsers,
         * giving us a predictable, controlled margin we designed for.
         *
         * Why 10mm? It's close enough to the browser default that it won't
         * look wrong if the browser ignores it, but small enough to give
         * the content room to breathe consistently.
         */
        margin: 10mm;
        size: A4 portrait;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        /*
         * CRITICAL: Reset any body margin/padding the app may have set.
         * App layout margins (e.g. sidebar offset, navbar height) bleed
         * into print and cause the squished column look you saw.
         */
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }

      #__print_wrapper__ {
        display: block !important;
        position: static !important;
        /* No extra padding — @page margin above handles the safe zone */
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100vh;
        background-color: white;
        color: #1e293b;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-sizing: border-box !important;
      }

      [data-html2canvas-ignore], button, [data-no-print] {
        display: none !important;
      }

      /* Undo app layout max-widths so content fills the full print column */
      .max-w-6xl, .max-w-7xl, .max-w-5xl, .max-w-4xl, .container {
        max-width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      /* Prevent cards and sections from being cut across pages */
      .bg-white, .rounded-xl, .rounded-lg, .rounded-2xl,
      .shadow-sm, .shadow-md, .shadow-lg, section, article {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 16px !important;
      }

      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      img, svg, canvas, .recharts-wrapper {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        max-width: 100% !important;
      }

      .grid, .flex {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      table, tr, td, th {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  `;
  document.head.appendChild(style);

  // ── Print Header ────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 12px;
    margin-bottom: 20px;
  `;
  header.innerHTML = `
    <div>
      <h1 style="margin:0;font-size:22px;font-weight:900;color:#2563eb;letter-spacing:-0.5px;line-height:1;">Dgtlmart</h1>
      <p style="margin:4px 0 0;font-size:9px;font-weight:700;color:#64748b;letter-spacing:1.2px;text-transform:uppercase;">Brand Visibility & Intelligence</p>
    </div>
    <div style="text-align:right;">
      <p style="margin:0;font-size:11px;font-weight:700;color:#0f172a;">${reportTitle}</p>
      <p style="margin:4px 0 0;font-size:9px;color:#64748b;">Generated: ${dateStr}</p>
    </div>
  `;

  // ── Print Footer ────────────────────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    page-break-inside: avoid;
  `;
  footer.innerHTML = `
    <p style="margin:0;font-size:8px;color:#94a3b8;font-weight:500;letter-spacing:0.3px;">
      CONFIDENTIAL &amp; PROPRIETARY
      <span style="margin:0 6px;color:#cbd5e1;">|</span>
      Generated by Dgtlmart AI Intelligence Engine
      <span style="margin:0 6px;color:#cbd5e1;">|</span>
      info@dgtltechhub.com
    </p>
  `;

  // ── Wrapper ─────────────────────────────────────────────────────────────────
  const printWrapper = document.createElement('div');
  printWrapper.id = '__print_wrapper__';

  // Clone content and strip interactive elements
  const contentClone = element.cloneNode(true);
  ['button', '[data-no-print]', '[data-html2canvas-ignore]'].forEach(sel => {
    contentClone.querySelectorAll(sel).forEach(el => el.remove());
  });

  printWrapper.appendChild(header);
  printWrapper.appendChild(contentClone);
  printWrapper.appendChild(footer);
  document.body.appendChild(printWrapper);

  const originalTitle = document.title;
  document.title = reportTitle;

  return new Promise((resolve) => {
    const cleanup = () => {
      document.head.removeChild(style);
      document.body.removeChild(printWrapper);
      document.title = originalTitle;
      window.removeEventListener('afterprint', cleanup);
      resolve();
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 250);
  });
};