import React from 'react';

/**
 * BaseReportLayout — Premium Professional PDF Report Template
 * Uses 100% inline styles for full html2canvas/jsPDF compatibility.
 * Typography: Inter (loaded via Google Fonts in the style block).
 */
const BaseReportLayout = ({ children, title, subtitle, brandName, date, reportType = 'Audit Report', accentColor = '#4F46E5' }) => {
  const displayDate = date || new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const reportId = '#' + Math.random().toString(36).substring(2, 9).toUpperCase();

  // Derive a lighter tint from accent
  const accentLight = accentColor + '14'; // ~8% opacity hex

  const styles = {
    // ─── Root ───────────────────────────────────────────────────────
    root: {
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      width: '794px',
      minHeight: '1123px',
      backgroundColor: '#ffffff',
      color: '#1F2937',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
    },

    // ─── Cover Strip ────────────────────────────────────────────────
    coverStrip: {
      backgroundColor: '#111827', // Solid dark color, no gradient
      padding: '40px 48px 36px',
      position: 'relative',
      overflow: 'hidden',
    },
    coverDecoration: { display: 'none' },
    coverDecorationSm: { display: 'none' },

    // ─── Branding Row ────────────────────────────────────────────────
    brandRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '28px',
      position: 'relative',
      zIndex: 2,
    },
    logoBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    logoIcon: {
      width: '36px',
      height: '36px',
      backgroundColor: accentColor,
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      letterSpacing: '-0.3px',
    },
    logoSub: {
      fontSize: '11px',
      fontWeight: '600',
      color: '#666666',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
    },
    reportBadge: {
      fontSize: '9px',
      fontWeight: '700',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#666666',
      border: '1px solid #334155',
      padding: '4px 12px',
      borderRadius: '20px',
    },

    // ─── Cover Title ─────────────────────────────────────────────────
    coverMeta: {
      position: 'relative',
      zIndex: 2,
    },
    reportTypeLabel: {
      fontSize: '9px',
      fontWeight: '700',
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
      color: accentColor,
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    reportTypeDot: {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      backgroundColor: accentColor,
      display: 'inline-block',
    },
    coverTitle: {
      fontSize: '36px', // Increased size
      fontWeight: '700',
      color: '#ffffff',
      lineHeight: '1.05',
      letterSpacing: '-0.6px',
      marginBottom: '8px',
      textTransform: 'uppercase',
    },
    coverSubtitle: {
      fontSize: '14px', // Increased size
      fontWeight: '600',
      color: '#E5E7EB', // Lighter for visibility against black
      letterSpacing: '0.03em',
      marginBottom: '20px',
    },

    // ─── Entity Bar ──────────────────────────────────────────────────
    entityBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '12px',
      padding: '14px 20px',
      marginTop: '20px',
    },
    entityLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    entityAvatar: {
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      backgroundColor: accentColor + '30',
      border: `2px solid ${accentColor}50`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '700',
      color: '#ffffff',
    },
    entityName: {
      fontSize: '17px',
      fontWeight: '600',
      color: '#ffffff',
      letterSpacing: '-0.2px',
    },
    entityLabel: {
      fontSize: '9px',
      fontWeight: '600',
      color: '#555555',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
    },
    entityRight: {
      display: 'flex',
      gap: '24px',
    },
    entityMeta: {
      textAlign: 'right',
    },
    entityMetaLabel: {
      fontSize: '8px',
      fontWeight: '700',
      color: '#555555',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: '2px',
    },
    entityMetaVal: {
      fontSize: '11px',
      fontWeight: '700',
      color: '#CBD5E1',
    },

    // ─── Main Content ────────────────────────────────────────────────
    main: {
      padding: '40px 48px',
    },

    // ─── Footer ──────────────────────────────────────────────────────
    footer: {
      borderTop: '1px solid #F1F5F9',
      padding: '16px 48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FAFAFA',
    },
    footerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    footerText: {
      fontSize: '8px',
      fontWeight: '700',
      color: '#666666',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
    },
    footerDot: {
      width: '2px',
      height: '2px',
      borderRadius: '50%',
      backgroundColor: '#CBD5E1',
    },
    footerPowered: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '8px',
      fontWeight: '700',
      color: '#666666',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
    },
    footerAccentDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: accentColor,
    },
  };

  const initials = (brandName || 'B').slice(0, 2).toUpperCase();

  return (
    <div style={styles.root}>
      {/* ── Google Fonts Embed ─────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        
        /* Section heading utility */
        .rpt-section-title {
          font-size: 12px !important;
          font-weight: 900 !important;
          letter-spacing: 0.15em !important;
          text-transform: uppercase !important;
          color: #1F2937 !important;
          padding-bottom: 10px !important;
          border-bottom: 2px solid #F1F5F9 !important;
          margin-bottom: 20px !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .rpt-section-title::before {
          content: '' !important;
          display: inline-block !important;
          width: 3px !important;
          height: 14px !important;
          background-color: ${accentColor} !important;
          border-radius: 2px !important;
          flex-shrink: 0 !important;
        }
        
        /* KPI Card utility */
        .rpt-kpi {
          background: #F8FAFC !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 14px !important;
          padding: 18px !important;
        }
        .rpt-kpi-label {
          font-size: 10px !important;
          font-weight: 800 !important;
          letter-spacing: 0.15em !important;
          text-transform: uppercase !important;
          color: #1F2937 !important;
          margin-bottom: 6px !important;
        }
        .rpt-kpi-value {
          font-size: 28px !important;
          font-weight: 900 !important;
          color: #1F2937 !important;
          letter-spacing: -0.5px !important;
          line-height: 1 !important;
        }
        
        /* Table utility */
        .rpt-table { width: 100% !important; border-collapse: collapse !important; }
        .rpt-table th {
          font-size: 11px !important;
          font-weight: 900 !important;
          letter-spacing: 0.15em !important;
          text-transform: uppercase !important;
          color: #1F2937 !important;
          background: #F8FAFC !important;
          padding: 12px 14px !important;
          text-align: left !important;
          border-bottom: 1px solid #E2E8F0 !important;
        }
        .rpt-table td {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #1F2937 !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid #F8FAFC !important;
          vertical-align: middle !important;
        }
        .rpt-table tr:last-child td { border-bottom: none !important; }
        .rpt-table tr:hover td { background: #FAFBFC !important; }

        /* Tag utility */
        .rpt-tag {
          display: inline-flex !important;
          align-items: center !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: 0.08em !important;
          text-transform: uppercase !important;
          padding: 4px 10px !important;
          border-radius: 6px !important;
        }

        /* Badge green/amber/red */
        .rpt-badge-green { background: #ECFDF5 !important; color: #059669 !important; border: 1px solid #A7F3D0 !important; }
        .rpt-badge-amber { background: #FFFBEB !important; color: #D97706 !important; border: 1px solid #FDE68A !important; }
        .rpt-badge-red   { background: #FEF2F2 !important; color: #DC2626 !important; border: 1px solid #FECACA !important; }
        .rpt-badge-blue  { background: #EFF6FF !important; color: #2563EB !important; border: 1px solid #BFDBFE !important; }
        .rpt-badge-purple { background: #F5F3FF !important; color: #7C3AED !important; border: 1px solid #DDD6FE !important; }
        .rpt-badge-slate { background: #F1F5F9 !important; color: #444444 !important; border: 1px solid #E2E8F0 !important; }
        
        /* Insight box */
        .rpt-insight {
          background: ${accentLight} !important;
          border: 1px solid ${accentColor}30 !important;
          border-left: 4px solid ${accentColor} !important;
          border-radius: 0 12px 12px 0 !important;
          padding: 16px 20px !important;
        }
      `}} />

      {/* ── Cover Strip ─────────────────────────────────────────── */}
      <header style={styles.coverStrip}>
        <div style={styles.coverDecoration} />
        <div style={styles.coverDecorationSm} />

        {/* Brand Row */}
        <div style={styles.brandRow}>
          <div style={styles.logoBox}>
            <img 
              src="https://res.cloudinary.com/dbbll23jz/image/upload/v1777897134/AISONX_Logo_Final_rzzvfr.png" 
              alt="AISONX Logo" 
              crossOrigin="anonymous"
              style={{ height: '42px', objectFit: 'contain' }}
            />
          </div>
          <div style={styles.reportBadge}>Confidential · {reportType}</div>
        </div>

        {/* Title Block */}
        <div style={styles.coverMeta}>
          <div style={styles.reportTypeLabel}>
            <span style={styles.reportTypeDot} />
            {subtitle}
          </div>
          <div style={styles.coverTitle}>{title}</div>
        </div>

        {/* Entity Bar */}
        <div style={styles.entityBar}>
          <div style={styles.entityLeft}>
            <div style={styles.entityAvatar}>{initials}</div>
            <div>
              <div style={styles.entityLabel}>Entity Profile</div>
              <div style={styles.entityName}>{brandName || 'Brand Report'}</div>
            </div>
          </div>
          <div style={styles.entityRight}>
            <div style={styles.entityMeta}>
              <div style={styles.entityMetaLabel}>Audit Date</div>
              <div style={styles.entityMetaVal}>{displayDate}</div>
            </div>
            <div style={styles.entityMeta}>
              <div style={styles.entityMetaLabel}>Report ID</div>
              <div style={styles.entityMetaVal}>{reportId}</div>
            </div>
            <div style={styles.entityMeta}>
              <div style={styles.entityMetaLabel}>Engine</div>
              <div style={styles.entityMetaVal}>AISONX v3.0</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Body ─────────────────────────────────────────────── */}
      <main style={styles.main}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          <span style={styles.footerText}>© 2026 AISONX Intelligence</span>
          <span style={styles.footerDot} />
          <span style={styles.footerText}>Strictly Confidential</span>
          <span style={styles.footerDot} />
          <span style={styles.footerText}>Not for redistribution</span>
        </div>
        <div style={styles.footerPowered}>
          <span style={styles.footerAccentDot} />
          Powered by AISONX Platform
        </div>
      </footer>
    </div>
  );
};

export default BaseReportLayout;
