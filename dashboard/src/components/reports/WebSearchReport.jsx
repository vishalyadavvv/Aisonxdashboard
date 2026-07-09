import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * WebSearchReport — Premium PDF Template
 * Live Web Mentions & AI Visibility Sentiment
 */
const WebSearchReport = ({ brandName, data, date }) => {
  const profile = data?.profile || {};
  const score = data?.score || profile.visibilityScore || 0;

  const modelResults = {
    ChatGPT: data?.chatgpt || data?.openai || profile.openai,
    Gemini: data?.gemini || profile.gemini,
  };

  const getScoreGrade = (s) => {
    if (s >= 80) return { label: 'Excellent', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    if (s >= 60) return { label: 'Good', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    if (s >= 40) return { label: 'Fair', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    return { label: 'Low', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  };

  const grade = getScoreGrade(score);

  const renderContent = (content) => {
    if (!content) return null;
    const text = typeof content === 'string' ? content : content.content || '';
    const lines = text.split('\n').filter(p => p.trim().length > 8).slice(0, 6);
    return lines.map((line, idx) => {
      const clean = line.replace(/^[0-9]+[.)]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[source:.*?]/gi, '').trim();
      if (!clean) return null;
      return (
        <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#4F46E5', marginTop: '5px', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: '#1F2937', lineHeight: '1.65', fontWeight: '600', margin: 0 }}>{clean}</p>
        </div>
      );
    });
  };

  return (
    <BaseReportLayout
      title="Web Visibility Audit"
      subtitle="Real-Time Brand Mentions & Semantic Sentiment"
      brandName={brandName}
      date={date}
      reportType="Web Search"
      accentColor="#4F46E5"
    >
      {/* ── Score + Interpretation ─────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Visibility Intelligence Summary</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'stretch' }}>
          {/* Score Card */}
          <div style={{
            background: '#1F2937', // Solid background instead of gradient
            borderRadius: '16px',
            padding: '28px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#4F46E520' }} />
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#E2E8F0', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Authority Score
            </div>
            <div style={{ fontSize: '52px', fontWeight: '700', color: '#ffffff', lineHeight: 1, letterSpacing: '-2px' }}>{score}%</div>
            <div style={{
              marginTop: '12px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: grade.bg,
              border: `1px solid ${grade.border}`,
              fontSize: '9px',
              fontWeight: '600',
              color: grade.color,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>{grade.label} Visibility</div>

            {/* Mini gauge bar */}
            <div style={{ width: '100%', height: '4px', backgroundColor: '#334155', borderRadius: '2px', marginTop: '16px', overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, height: '100%', backgroundColor: grade.color, borderRadius: '2px' }} />
            </div>
          </div>

          {/* Interpretation Card */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
              AI Engine Synthesis
            </div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937', lineHeight: '1.7', marginBottom: '16px', fontStyle: 'italic' }}>
              "{profile.interpretation || `Real-time analysis detected brand presence across AI training corpora. Sentiment is ${profile.sentiment || 'neutral'} based on live indexed citations.`}"
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {profile.sentiment && (
                <div>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>Sentiment</div>
                  <span className={`rpt-tag ${profile.sentiment.toLowerCase().includes('pos') ? 'rpt-badge-green' : profile.sentiment.toLowerCase().includes('neg') ? 'rpt-badge-red' : 'rpt-badge-amber'}`}>
                    {profile.sentiment}
                  </span>
                </div>
              )}
              {profile.domainType && (
                <div>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>Domain Type</div>
                  <span className="rpt-tag rpt-badge-blue">{profile.domainType}</span>
                </div>
              )}
              {profile.coreOffering && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>Core Offering</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#1F2937', marginTop: '4px' }}>{profile.coreOffering}</div>
                </div>
              )}
              {(profile.prompts || []).length > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '8px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Strong Presence Around</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(profile.prompts || []).slice(0, 5).map((k, i) => (
                      <span key={i} className="rpt-tag rpt-badge-purple">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── LLM Snapshots ─────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Large Language Model Responses</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {Object.entries(modelResults).map(([model, content], i) => content && (
            <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', breakInside: 'avoid' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FAFBFC',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: model === 'Gemini' ? '#2563EB' : '#7C3AED' }} />
                  <span style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{model}</span>
                </div>
                <span style={{ fontSize: '8px', fontWeight: '600', color: '#666666', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Research Node</span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                {renderContent(content)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Discovery Assessment Table ─────────────────────────────── */}
      {profile.aiVisibilityAssessment && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div className="rpt-section-title" style={{ marginBottom: 0 }}>AI Discovery Assessment</div>
            <span className="rpt-tag rpt-badge-blue">
              Level: {profile.aiVisibilityAssessment.overallLevel || 'N/A'}
            </span>
          </div>
          {profile.aiVisibilityAssessment.interpretation && (
            <div className="rpt-insight" style={{ marginBottom: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <p style={{ fontSize: '13px', color: '#1F2937', lineHeight: '1.65', fontWeight: '600', margin: 0, fontStyle: 'italic' }}>
                "{profile.aiVisibilityAssessment.interpretation}"
              </p>
            </div>
          )}
          <table className="rpt-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Discovery Metric</th>
                <th style={{ width: '18%', textAlign: 'center' }}>Assessment</th>
                <th>Discovery Evidence</th>
              </tr>
            </thead>
            <tbody>
              {(profile.aiVisibilityAssessment.criteria || []).map((c, i) => {
                const low = (c.assessment || '').toLowerCase();
                let cls = 'rpt-badge-amber';
                if (low.includes('high') || low.includes('strong') || low.includes('confirmed') || low.includes('active')) cls = 'rpt-badge-green';
                else if (low.includes('moderate') || low.includes('possible')) cls = 'rpt-badge-blue';
                else if (low.includes('very low') || low.includes('weak')) cls = 'rpt-badge-red';
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: '600', color: '#1F2937' }}>{c.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`rpt-tag ${cls}`}>{c.assessment}</span>
                    </td>
                    <td style={{ color: '#1F2937', fontSize: '12px', lineHeight: '1.55', fontWeight: '500' }}>{c.evidence}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Optimization Checklist ─────────────────────────────── */}
      {profile.checklist && profile.checklist.length > 0 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">Optimization Checklist</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {profile.checklist.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#ECFDF5', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0 }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '2px' }} />
                </div>
                <p style={{ fontSize: '13px', color: '#1F2937', margin: 0, lineHeight: '1.6', fontWeight: '600' }}>{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Top AI Sources ──────────────────────────────────────── */}
      {profile.citations && profile.citations.length > 0 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">Top AI Sources</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {profile.citations.map((c, i) => {
              let url = typeof c === 'string' ? c : c.url;
              let domainName = typeof c === 'string' ? '' : c.domain;
              if (!domainName || domainName === '...' || domainName === 'Verified Source' || domainName === 'Source') {
                try {
                  const host = new URL(url).hostname;
                  domainName = host.replace('www.', '').split('.')[0];
                  domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
                } catch (e) {
                  domainName = 'Verified Source';
                }
              }
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FAFBFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{domainName}</span>
                    <span style={{ fontSize: '10px', color: '#4F46E5', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url === '#' ? 'Source Link Unavailable' : url}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Summary Footer Bar ────────────────────────────────────── */}
      <section style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '18px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            ['Domain Type', profile.domainType || 'General'],
            ['Sentiment', profile.sentiment || 'Neutral'],
            ['Core Offering', profile.coreOffering ? profile.coreOffering.slice(0, 40) + '...' : 'N/A'],
          ].map(([lbl, val], i) => (
            <div key={i}>
              <div style={{ fontSize: '8px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>{lbl}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#333333' }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '8px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '3px' }}>Scan Engine</div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#4F46E5' }}>AISONX Live Node v3.0</div>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default WebSearchReport;
