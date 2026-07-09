import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Professional PDF Export Utility — "Font-Aware Smart Clipping"
 * 
 * Improvements:
 * 1. Waits for Google Fonts (Inter) to fully load before rendering
 * 2. Forces white background with correct print colors
 * 3. Smart page-break detection at safe content boundaries
 * 4. Adds professional header/footer with branding on each page
 */
export const downloadPDF = async (elementId, filename = 'report') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn('[PDF] Element not found:', elementId);
    return;
  }

  try {
    // ── Step 1: Ensure Google Fonts are loaded ─────────────────
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    // Extra wait to ensure font rendering is complete
    await new Promise(resolve => setTimeout(resolve, 600));

    // ── Step 2: Collect safe page-break zones ─────────────────
    const safeZones = [];
    const rootRect = element.getBoundingClientRect();
    
    const collectSafeZones = (el) => {
      if (!el || window.getComputedStyle(el).display === 'none') return;
      
      const rect = el.getBoundingClientRect();
      const top = rect.top - rootRect.top;
      const bottom = top + rect.height;
      
      const isBreakable =
        el.tagName === 'TR' ||
        el.tagName === 'SECTION' ||
        el.tagName === 'P' ||
        el.tagName === 'H2' ||
        el.tagName === 'H3' ||
        el.tagName === 'LI' ||
        el.classList.contains('rpt-insight') ||
        el.classList.contains('rpt-kpi') ||
        (el.style && el.style.breakInside === 'avoid');

      if (isBreakable && rect.height > 0) {
        safeZones.push({ top, bottom });
      } 
      
      // Always traverse children to find granular break points inside larger containers
      Array.from(el.children).forEach(child => collectSafeZones(child));
    };
    
    collectSafeZones(element);
    safeZones.sort((a, b) => a.bottom - b.bottom);

    // ── Step 3: High-fidelity single-pass render ───────────────
    const renderScale = 2.5; // Optimized for crisp text without excessive file size
    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: -window.scrollY,
      windowWidth: element.offsetWidth,
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        // Hide interactive elements in the PDF clone
        const toHide = clonedDoc.querySelectorAll('button, [data-html2canvas-ignore], .no-print, nav, [role="navigation"]');
        toHide.forEach(el => el.style.display = 'none');

        // Force white background and reset positioning on the cloned root
        const root = clonedDoc.getElementById(elementId);
        if (root) {
          root.style.backgroundColor = '#ffffff';
          root.style.margin = '0';
          root.style.padding = '0';
          root.style.position = 'relative';
          root.style.left = '0';
          root.style.top = '0';
          root.style.width = '800px'; // Enforce fixed width for A4 consistency
        }

        // Ensure all text is color-accurate (no oklch issues)
        const allText = clonedDoc.querySelectorAll('*');
        allText.forEach(el => {
          const computed = window.getComputedStyle(el);
          // If color uses oklch (not supported in canvas), fall back
          if (computed.color && computed.color.includes('oklch')) {
            el.style.color = '#1E293B';
          }
          if (computed.backgroundColor && computed.backgroundColor.includes('oklch')) {
            el.style.backgroundColor = 'transparent';
          }
        });
      }
    });

    // ── Step 4: Smart Clipping Pagination ─────────────────────
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const marginX = 0;   // No horizontal margin (report fills width)
    const marginTop = 0;
    const marginBottom = 12; // Space for footer
    const contentWidth = pdfWidth - (2 * marginX);

    // px per mm in canvas space
    const pxPerMm = canvas.width / contentWidth;
    // Available height per page in canvas pixels
    const pagePxHeight = (pdfHeight - marginTop - marginBottom) * pxPerMm;

    let currentCanvasY = 0;
    let pageNum = 1;

    while (currentCanvasY < canvas.height) {
      if (pageNum > 1) pdf.addPage();

      let breakY = currentCanvasY + pagePxHeight;

      // Smart break: find nearest safe zone gap
      if (breakY < canvas.height) {
        // Find the last safe element whose bottom fits in the current page
        const safeZone = safeZones.findLast(zone => (zone.bottom * renderScale) <= breakY);
        // Ensure the found break point actually moves us forward (avoid infinite loop)
        if (safeZone && (safeZone.bottom * renderScale) > currentCanvasY + 50) {
          // Add a tiny buffer so we don't slice exactly on the border
          breakY = (safeZone.bottom * renderScale) + (2 * renderScale);
        }
      } else {
        breakY = canvas.height;
      }

      const segmentHeight = breakY - currentCanvasY;
      const pdfSegmentHeight = segmentHeight / pxPerMm;

      // Slice canvas segment
      const segmentCanvas = document.createElement('canvas');
      segmentCanvas.width = canvas.width;
      segmentCanvas.height = segmentHeight;
      const sCtx = segmentCanvas.getContext('2d');
      sCtx.fillStyle = '#ffffff';
      sCtx.fillRect(0, 0, segmentCanvas.width, segmentCanvas.height);
      sCtx.drawImage(canvas, 0, currentCanvasY, canvas.width, segmentHeight, 0, 0, canvas.width, segmentHeight);

      // Use high-quality JPEG instead of PNG to vastly reduce file size (from ~30MB to ~3MB)
      // while maintaining crisp text rendering (0.95 quality is visually lossless here).
      const segmentData = segmentCanvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(segmentData, 'JPEG', marginX, marginTop, contentWidth, pdfSegmentHeight, undefined, 'FAST');

      // Add professional page footer
      addPageFooter(pdf, pageNum);

      currentCanvasY = breakY;
      pageNum++;
    }

    // ── Step 5: Save ───────────────────────────────────────────
    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    
    console.log(`[PDF] Saving PDF: ${safeName}, Canvas Size: ${canvas.width}x${canvas.height}`);
    
    // Fallback manual download trigger to bypass iframe/IDE silent blocks
    try {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (fallbackErr) {
      console.warn('[PDF] Fallback save failed, trying native jsPDF save...', fallbackErr);
      pdf.save(safeName);
    }

  } catch (error) {
    console.error('[PDF Export Error]:', error);
    throw error; // Re-throw so caller can show toast
  }
};

/**
 * Add a subtle professional footer to each PDF page.
 */
function addPageFooter(pdf, pageNumber) {
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const footerY = pdfHeight - 8;

  // Separator line
  pdf.setDrawColor(241, 245, 249); // #F1F5F9
  pdf.setLineWidth(0.3);
  pdf.line(0, footerY - 3, pdfWidth, footerY - 3);

  // Left: branding
  pdf.setFontSize(6.5);
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.setFont('helvetica', 'bold');
  pdf.text('DGTLMART AI INTELLIGENCE  ·  STRICTLY CONFIDENTIAL  ·  NOT FOR REDISTRIBUTION', 10, footerY);

  // Right: page number
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.text(`PAGE ${pageNumber}`, pdfWidth - 10, footerY, { align: 'right' });
}