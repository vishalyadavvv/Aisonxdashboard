import React from 'react';

/**
 * BaseReportLayout
 * A print-optimized wrapper for all AI Intelligence reports.
 * Designed to fit A4 dimensions with professional DgtLmart branding.
 */
const BaseReportLayout = ({ children, title, subtitle, brandName, date }) => {
  const displayDate = date || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div 
      className="report-container bg-white text-slate-900 font-sans flex flex-col" 
      style={{ 
        width: '210mm', 
        minHeight: '297mm',
        margin: '0 auto',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Header Section */}
      <header className="px-12 pt-12 pb-8 border-b-4 border-slate-900 flex justify-between items-start">
        <div className="max-w-[60%]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
               <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain invert" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">DgtLmart <span className="text-slate-400 font-bold">AI</span></span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-4">
            {title}
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[11px]">
            {subtitle}
          </p>
        </div>
        
        <div className="text-right">
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entity Profile</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{brandName}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Report ID</p>
            <p className="text-xs font-bold text-slate-600">#{Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
          </div>
          <div className="mt-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Date</p>
             <p className="text-xs font-bold text-slate-900">{displayDate}</p>
          </div>
        </div>
      </header>

      {/* Main Report Body */}
      <main className="flex-1 px-12 py-12">
        {children}
      </main>

      {/* Footer Section */}
      <footer className="px-12 py-10 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-4">
          <span>&copy; 2026 DgtLmart Intelligence</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full" />
          <span>Strictly Confidential</span>
        </div>
        <div>
          Advanced Brand Visibility Audit
        </div>
      </footer>
      
      {/* Print Styles Override */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .report-container { width: 100% !important; margin: 0 !important; }
        }
        .report-container h2 { font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.025em; border-left: 4px solid #0f172a; padding-left: 1rem; margin-bottom: 1.5rem; margin-top: 2rem; }
        .report-container .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; }
        .report-container .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .report-container .data-table th { background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; padding: 0.75rem 1rem; text-align: left; }
        .report-container .data-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #1e293b; font-weight: 600; }
      `}} />
    </div>
  );
};

export default BaseReportLayout;
