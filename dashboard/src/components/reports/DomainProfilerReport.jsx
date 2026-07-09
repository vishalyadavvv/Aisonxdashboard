import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * DomainProfilerReport — Premium PDF Template
 * Strategic Domain Intelligence & Perceptual Mapping
 */
const DomainProfilerReport = ({ brandName, data, date }) => {
  const topics = data?.topics || [];
  const presenceTags = data?.presenceTags || [];
  const prompts = data?.prompts || [];
  const competitors = data?.competitors || [];

  const clusterGroups = [
    { label: 'Topic Matrix', items: topics, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', badgeCls: 'rpt-badge-blue' },
    { label: 'AI Search Prompts', items: prompts, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', badgeCls: 'rpt-badge-purple' },
    { label: 'Competitor Landscape', items: competitors, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', badgeCls: 'rpt-badge-red' },
  ].filter(g => g.items.length > 0);

  return (
    <BaseReportLayout
      title="Domain Architecture Profile"
      subtitle="Strategic Positioning & Perceptual Mapping"
      brandName={brandName}
      date={date}
      reportType="Domain Profile"
      accentColor="#0891B2"
    >
      {/* ── Institutional DNA ─────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Institutional DNA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Domain Synthesis */}
          <div style={{
            background: '#1F2937', // Solid pure black
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: '#0891B220' }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '80px', height: '80px', borderRadius: '50%', background: '#0891B215' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' }}>Domain Synthesis</div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', lineHeight: '1.7', margin: 0, fontStyle: 'italic' }}>
                "{data.description || data.coreOffering || 'Automated synthesis of domain architecture and market positioning nodes.'}"
              </p>
            </div>
          </div>

          {/* Classification Matrix */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', background: '#FAFBFC' }}>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '14px' }}>Classification Matrix</div>
            {[
              { key: 'Architecture', val: data.domainType || 'N/A' },
              { key: 'Audience Model', val: data.brandType || 'N/A' },
              { key: 'Total Pages', val: data.totalPages || data.totalUrls || 'N/A' },
              { key: 'Strategic Focus', val: data.brandFocus || 'Digital Entry', highlight: true },
              { key: 'Perceptual Sentiment', val: (data.sentiment || 'Neutral').split('.')[0], green: true },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0', borderBottom: i < 4 ? '1px solid #E2E8F0' : 'none'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.key}</span>
                <span style={{
                  fontSize: '13px', fontWeight: '600',
                  color: row.highlight ? '#0891B2' : row.green ? '#059669' : '#1F2937'
                }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand Sentiment Analysis ───────────────────────────────── */}
      {data.sentiment && data.sentiment.length > 50 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">Brand Sentiment & Market Perception</div>
          <div className="rpt-insight" style={{ background: '#ECFDF5', padding: '20px', borderRadius: '14px', border: '1px solid #D1FAE5', borderLeft: '4px solid #10B981' }}>
            <p style={{ fontSize: '14px', color: '#064E3B', lineHeight: '1.65', fontWeight: '600', margin: 0 }}>
              {data.sentiment}
            </p>
          </div>
        </section>
      )}

      {/* ── Target Persona Analysis ───────────────────────────── */}
      {data.targetPersona && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">Audience & Persona Alignment</div>
          <div className="rpt-insight" style={{ background: '#FFF7ED', padding: '20px', borderRadius: '14px', border: '1px solid #FFEDD5', borderLeft: '4px solid #F97316' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Target Persona</div>
              {data.confidenceScore && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#EA580C', backgroundColor: '#FFEDD5', padding: '4px 10px', borderRadius: '12px' }}>
                    {data.confidenceScore}% Confidence
                  </div>
                </div>
              )}
            </div>
            <p style={{ fontSize: '14px', color: '#1F2937', lineHeight: '1.65', fontWeight: '600', margin: 0 }}>
              {data.targetPersona}
            </p>
            {data.confidenceScore && (
              <div style={{ width: '100%', backgroundColor: '#FFEDD5', borderRadius: '4px', height: '4px', marginTop: '16px' }}>
                <div style={{ backgroundColor: '#F97316', height: '4px', borderRadius: '4px', width: `${data.confidenceScore}%` }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Semantic Footprint Clusters ───────────────────────────── */}
      {clusterGroups.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div className="rpt-section-title">Semantic Footprint Clusters</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${clusterGroups.length}, 1fr)`, gap: '14px' }}>
            {clusterGroups.map(({ label, items, color, bg, border, badgeCls }, gi) => (
              <div key={gi} style={{
                border: `1px solid ${border}`,
                borderTop: `3px solid ${color}`,
                borderRadius: '14px',
                padding: '18px',
                background: '#ffffff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                  <div style={{ fontSize: '11px', fontWeight: '600', color: color, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {items.slice(0, 14).map((t, i) => (
                    <span key={i} className={`rpt-tag ${badgeCls}`}>{t}</span>
                  ))}
                  {items.length > 14 && (
                    <span className="rpt-tag rpt-badge-slate">+{items.length - 14} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Market Presence Matrix ───────────────────────────────── */}
      {presenceTags.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div className="rpt-section-title">Market Presence Matrix</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {presenceTags.map((tag, i) => (
              <div key={i} style={{
                background: i % 3 === 0 ? '#1F2937' : i % 3 === 1 ? '#0891B2' : '#111827',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '16px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: '1.4' }}>{tag}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Strategic Recommendation ─────────────────────────────── */}
      <section style={{
        background: '#EFF6FF', // Solid background instead of gradient
        border: '1px solid #BFDBFE',
        borderLeft: '4px solid #0891B2',
        borderRadius: '0 16px 16px 0',
        padding: '22px 24px',
        breakInside: 'avoid',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>✦</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Strategic Recommendation</div>
            <p style={{ fontSize: '14px', color: '#1F2937', lineHeight: '1.7', margin: 0, fontWeight: '600' }}>
              Based on your <strong>{data.brandFocus || 'digital'}</strong> positioning, we recommend prioritizing technical readiness signals for{' '}
              <strong>{topics[0] || 'your core services'}</strong> to solidify your AI semantic authority. Focus on consistent entity signals and comprehensive structured data markup to improve discoverability in AI-generated responses.
            </p>
          </div>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default DomainProfilerReport;
