import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * BrandAuditReport — Premium PDF Template
 * Knowledge Graph Analysis & Digital Authority
 */
const BrandAuditReport = ({ brandName, data, date }) => {
  const entities = data?.entities || [];

  const renderEntityScore = (score) => {
    if (score >= 80) return { label: 'High', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    if (score >= 50) return { label: 'Moderate', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    return { label: 'Low', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
  };

  return (
    <BaseReportLayout
      title="Brand Audit Report"
      subtitle="Knowledge Graph Analysis & Digital Authority"
      brandName={brandName}
      date={date}
      reportType="Brand Audit"
      accentColor="#7C3AED"
    >
      {entities.length > 0 ? (
        entities.map((entity, idx) => {
          const scoreInfo = renderEntityScore(entity.confidenceScore || 0);
          const typeColor = idx === 0 ? '#7C3AED' : idx === 1 ? '#2563EB' : '#059669';

          return (
            <div key={idx} style={{ breakInside: 'avoid', marginBottom: '32px', paddingBottom: '32px', borderBottom: idx < entities.length - 1 ? '2px solid #F1F5F9' : 'none' }}>
              {/* Entity Header */}
              <section style={{ marginBottom: '24px' }}>
                <div className="rpt-section-title">Entity Profile #{idx + 1}</div>

                <div style={{ display: 'grid', gridTemplateColumns: entity.image ? '80px 1fr' : '1fr', gap: '20px', alignItems: 'flex-start' }}>
                  {entity.image && (
                    <img src={entity.image} alt={entity.name} style={{
                      width: '80px', height: '80px', borderRadius: '14px', objectFit: 'cover',
                      border: '2px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }} />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', letterSpacing: '-0.4px', margin: 0 }}>{entity.name}</h2>
                      {(entity.types || []).slice(0, 2).map((t, ti) => (
                        <span key={ti} className="rpt-tag" style={{ backgroundColor: typeColor + '10', color: typeColor, border: `1px solid ${typeColor}30` }}>{t}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: '13px', color: '#1F2937', fontStyle: 'italic', fontWeight: '600', marginBottom: '14px' }}>
                      {entity.description || 'Google Knowledge Graph Entry'}
                    </p>

                    {/* KPI Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      {/* Confidence Score */}
                      <div className="rpt-kpi">
                        <div className="rpt-kpi-label">Confidence Score</div>
                        <div className="rpt-kpi-value" style={{ color: scoreInfo.color }}>{entity.confidenceScore || 0}%</div>
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ height: '3px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${entity.confidenceScore || 0}%`, height: '100%', backgroundColor: scoreInfo.color }} />
                          </div>
                          <span className="rpt-tag" style={{ marginTop: '6px', backgroundColor: scoreInfo.bg, color: scoreInfo.color, border: `1px solid ${scoreInfo.border}` }}>
                            {scoreInfo.label} Authority
                          </span>
                        </div>
                      </div>
                      {/* KG ID */}
                      <div className="rpt-kpi">
                        <div className="rpt-kpi-label">Knowledge Node ID</div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#444444', fontFamily: 'monospace', marginTop: '4px' }}>
                          {entity.kgId || 'Not indexed'}
                        </div>
                      </div>
                      {/* Types */}
                      <div className="rpt-kpi">
                        <div className="rpt-kpi-label">Entity Classification</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {(entity.types || ['Unknown']).slice(0, 3).map((t, i) => (
                            <span key={i} className="rpt-tag rpt-badge-purple">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Entity Synthesis */}
              {entity.detailedDescription && (
                <section style={{ marginBottom: '20px' }}>
                  <div className="rpt-section-title">Entity Synthesis</div>
                  <div className="rpt-insight" style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: '14px', color: '#1F2937', lineHeight: '1.7', fontWeight: '600', margin: 0 }}>
                      {entity.detailedDescription}
                    </p>
                  </div>
                </section>
              )}

              {/* Links */}
              {(entity.url || entity.descriptionUrl) && (
                <section>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {entity.url && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FAFBFC' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🌐</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Official Site</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entity.url}</div>
                        </div>
                      </div>
                    )}
                    {entity.kgId && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FAFBFC' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🔍</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Search Node</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>google.com/search?kgmid={entity.kgId}</div>
                        </div>
                      </div>
                    )}
                    {entity.descriptionUrl && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FAFBFC' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>📄</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Knowledge Source</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#7C3AED', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entity.descriptionUrl.replace('https://', '').replace('en.wikipedia.org', 'Wikipedia')}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          );
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#F8FAFC', border: '2px dashed #E2E8F0', borderRadius: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>No Knowledge Graph Data Found</p>
          <p style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '8px' }}>This brand may not be indexed in Google's Knowledge Graph yet.</p>
        </div>
      )}

      {/* ── Recommendation ────────────────────────────────────────── */}
      {entities.length > 0 && (
        <section style={{
          background: '#1F2937', // Solid background instead of gradient
          borderRadius: '16px',
          padding: '24px 28px',
          breakInside: 'avoid',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>✦</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Strategic Recommendation</div>
              <p style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.7', margin: 0, fontWeight: '600' }}>
                To strengthen your Knowledge Graph presence, focus on building structured data markup, acquiring mentions from authoritative sources, and ensuring entity consistency across all digital properties. A high confidence score (80%+) significantly improves AI citation rates.
              </p>
            </div>
          </div>
        </section>
      )}
    </BaseReportLayout>
  );
};

export default BrandAuditReport;
