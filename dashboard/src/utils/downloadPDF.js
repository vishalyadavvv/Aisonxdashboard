import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * A professional-grade PDF export utility using "Single-Render, Smart-Clip" technology.
 * This captures the entire report in high precision once, then uses DOM intelligence
 * to find "Safe Zones" (gaps between sections/rows) to intelligently snap page breaks.
 */
export const downloadPDF = async (elementId, filename = 'report') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // 1. Identify "Safe Break Points" (gaps between major UI blocks)
    // We treat KPIs, Charts, and individual Table Rows as safe break points.
    const safeZones = [];
    const collectSafeZones = (el, parentOffset = 0) => {
      const top = el.offsetTop + parentOffset;
      const bottom = top + el.offsetHeight;
      
      // If it's a "leaf" component (KPI, Chart, or Row), mark its boundaries as a safe zone
      const isBlock = el.classList.contains('grid') || 
                      el.classList.contains('recharts-responsive-container') || 
                      el.tagName === 'TR' || 
                      el.tagName === 'H2';
      
      if (isBlock) {
        safeZones.push({ top, bottom });
      } else {
        Array.from(el.children).forEach(child => collectSafeZones(child, parentOffset));
      }
    };
    
    collectSafeZones(element);
    // Sort safe zones by top position
    safeZones.sort((a, b) => a.top - b.top);

    // 2. High-Fidelity Single Pass Render (Native oklch / Tailwind v4 support)
    const renderScale = 2;
    const canvas = await html2canvas(element, {
      scale: renderScale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: -window.scrollY,
      windowWidth: element.offsetWidth, // Match the actual width of the live element
      onclone: (clonedDoc) => {
        // Hide non-printable elements in the clone
        const toHide = clonedDoc.querySelectorAll('button, [data-html2canvas-ignore], .no-print');
        toHide.forEach(el => el.style.display = 'none');
      }
    });

    // 3. Smart Clipping Pagination
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pdfWidth - (2 * margin);
    
    // The pixel-to-mm ratio must be exact to preserve aspect ratio
    // pxPerMm is the number of canvas pixels that fit into 1 mm of PDF space
    const pxPerMm = canvas.width / contentWidth; 
    const pagePxHeight = (pdfHeight - 30) * pxPerMm; // 30mm reserved for margins/footers

    let currentCanvasY = 0;
    let pageNum = 1;

    while (currentCanvasY < canvas.height) {
      if (pageNum > 1) pdf.addPage();
      
      // Find the optimal break point
      let breakY = currentCanvasY + pagePxHeight;
      
      // If we're not at the very end, find the nearest Safe Zone gap
      if (breakY < canvas.height) {
        // Find the safe zone that ends just before or at our break point
        // We use the original coordinates scaled to canvas pixels
        const safeZone = safeZones.findLast(zone => (zone.bottom * renderScale) <= breakY);
        if (safeZone && (safeZone.bottom * renderScale) > currentCanvasY) {
            breakY = safeZone.bottom * renderScale;
        }
      } else {
        breakY = canvas.height;
      }

      const segmentHeight = breakY - currentCanvasY;
      const pdfSegmentHeight = segmentHeight / pxPerMm;

      // Slice the canvas
      const segmentCanvas = document.createElement('canvas');
      segmentCanvas.width = canvas.width;
      segmentCanvas.height = segmentHeight;
      const sCtx = segmentCanvas.getContext('2d');
      sCtx.drawImage(canvas, 0, currentCanvasY, canvas.width, segmentHeight, 0, 0, canvas.width, segmentHeight);

      const segmentData = segmentCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(segmentData, 'JPEG', margin, 15, contentWidth, pdfSegmentHeight);
      
      addBranding(pdf, pageNum);
      
      currentCanvasY = breakY;
      pageNum++;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

  } catch (error) {
    console.error('Smart Clipping Engine Error:', error);
  }
};

function addBranding(pdf, pageNumber) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(8);
  pdf.setTextColor(160);
  pdf.text('DgtLmart AI Intelligence | Performance Audit Report', 15, pageHeight - 10);
  pdf.text(`Page ${pageNumber}`, pageWidth - 25, pageHeight - 10);
  pdf.setDrawColor(240);
  pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
}