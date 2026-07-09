import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * ProjectIntelligenceReport — Premium PDF Template
 * Full Spectrum GEO Visibility & Perceptual Report
 */
const ProjectIntelligenceReport = ({ brandName, data, history = [], date }) => {
  const lastSnapshot = history[0] || {};
  const prevSnapshot = history[1] || {};
  const rankings = lastSnapshot.promptRankings || [];

  const top1 = rankings.filter(r => r.found && r.rank === 1).length;
  const top3 = rankings.filter(r => r.found && r.rank > 0 && r.rank <= 3).length;
  const top10 = rankings.filter(r => r.found && r.rank > 0 && r.rank <= 10).length;
  const total = data?.prompts?.length || rankings.length || 0;
  const citations = rankings.filter(r => r.linkFound).length;

  const score = lastSnapshot.overallScore || 0;
  const prevScore = (history[1] || {}).overallScore || 0;
  const scoreDelta = score - prevScore;

  // Consensus-based KPI calculations mirroring the frontend dashboard
  const engineNames = ['openai', 'gemini'];
  let mentionSum = 0;
  let linkSum = 0;
  let validEngines = 0;

  engineNames.forEach(eng => {
    const engRankings = rankings.filter(r => r.engine === eng);
    if (engRankings.length > 0) {
      const engMentions = engRankings.filter(r => r.found).length;
      const engLinks = engRankings.filter(r => r.linkFound).length;
      mentionSum += (engMentions / engRankings.length);
      linkSum += (engLinks / engRankings.length);
      validEngines++;
    }
  });

  const mentionRate = validEngines > 0 ? Math.round((mentionSum / validEngines) * 100) : 0;
  const linkRate = validEngines > 0 ? Math.round((linkSum / validEngines) * 100) : 0;
  const sources = lastSnapshot.authoritySignals?.webGroundedRecency || 0;

  const engineScores = lastSnapshot.engineScores || {};

  const getStatusTag = (found, rank) => {
    if (!found) return { cls: 'rpt-badge-red', label: 'Not Found' };
    if (rank <= 1) return { cls: 'rpt-badge-green', label: `#${rank} Top` };
    if (rank <= 3) return { cls: 'rpt-badge-blue', label: `#${rank}` };
    if (rank <= 10) return { cls: 'rpt-badge-amber', label: `#${rank}` };
    return { cls: 'rpt-badge-slate', label: `#${rank}` };
  };

  return (
    <BaseReportLayout
      title="Brand Intelligence Audit"
      subtitle="Full Spectrum GEO Visibility & Perceptual Report"
      brandName={brandName}
      date={date}
      reportType="Project Intelligence"
      accentColor="#F59E0B"
    >
      {/* ── Executive KPI Summary ─────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Executive Visibility Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr', gap: '10px' }}>

          {/* Main Score Card */}
          <div style={{
            background: '#1F2937', // Solid background instead of gradient
            borderRadius: '16px',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: '#F59E0B20' }} />
            <div>
              <div style={{ fontSize: '8px', fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '6px' }}>GEO Health Index</div>
              <div style={{ fontSize: '42px', fontWeight: '700', color: '#ffffff', letterSpacing: '-2px', lineHeight: 1 }}>{score}%</div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div style={{ height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '2px' }} />
              </div>
              {scoreDelta !== 0 && (
                <div style={{ marginTop: '8px', fontSize: '9px', fontWeight: '700', color: scoreDelta > 0 ? '#34D399' : '#F87171' }}>
                  {scoreDelta > 0 ? '▲' : '▼'} {Math.abs(scoreDelta)}% from previous scan
                </div>
              )}
            </div>
          </div>

          {[
            { label: 'Brand Mentions', value: `${mentionRate}%`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Citations (Links)', value: `${linkRate}%`, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'Web-Grounding', value: `${sources}%`, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            { label: 'Top 3 Placements', value: top3, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          ].map((kpi, i) => (
            <div key={i} style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderRadius: '16px', padding: '22px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '8px', fontWeight: '600', color: kpi.color, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#1F2937', letterSpacing: '-0.5px' }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Engine Semantic Alignment ─────────────────────────── */}
      {(engineScores.openai || engineScores.gemini) && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">AI Engine Semantic Alignment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { label: 'OpenAI (GPT-4o)', score: engineScores.openai || 0, color: '#10A37F', bg: '#ECFDF5', note: 'Based on organic mention frequency and semantic proximity.' },
              { label: 'Google Gemini', score: engineScores.gemini || 0, color: '#4285F4', bg: '#EFF6FF', note: 'Based on Search Generative Experience (SGE) grounding.' },
            ].map((engine, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', background: '#FAFBFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{engine.label}</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: engine.color }}>{engine.score}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: `${engine.score}%`, height: '100%', backgroundColor: engine.color, borderRadius: '3px' }} />
                </div>
                <p style={{ fontSize: '11px', color: '#1F2937', fontWeight: '700', lineHeight: '1.5', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {engine.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Prompt Performance Table ──────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="rpt-section-title" style={{ marginBottom: 0 }}>Prompt Performance Matrix</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span className="rpt-tag rpt-badge-green">Top 3: {top3}</span>
            <span className="rpt-tag rpt-badge-blue">Top 10: {top10}</span>
            <span className="rpt-tag rpt-badge-slate">Total: {total}</span>
          </div>
        </div>

        <table className="rpt-table">
          <thead>
            <tr>
              <th>Audit Parameter</th>
              <th style={{ textAlign: 'center' }}>Rank</th>
              <th style={{ textAlign: 'center' }}>Mention</th>
              <th style={{ textAlign: 'center' }}>Link</th>
              <th style={{ textAlign: 'right' }}>Visibility</th>
            </tr>
          </thead>
          <tbody>
            {rankings.slice(0, 15).map((r, i) => {
              const tag = getStatusTag(r.found, r.rank);
              const hasCitations = r.citations && r.citations.length > 0;
              const showDetails = r.found || (r.score > 0 && hasCitations) || r.snippet;
              
              return (
                <React.Fragment key={i}>
                  <tr>
                  <td>
                    <div style={{ fontWeight: '600', color: '#1F2937', fontSize: '13px' }}>{r.prompt}</div>
                    <div style={{ fontSize: '10px', color: '#444444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{r.engine}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`rpt-tag ${tag.cls}`}>{r.found ? `#${r.rank}` : '—'}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: r.found ? '#059669' : '#1F2937' }}>{r.found ? 'YES' : 'NO'}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: r.linkFound ? '#2563EB' : '#1F2937' }}>{r.linkFound ? 'YES' : 'NO'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1F2937' }}>{r.score || 0}%</span>
                  </td>
                  </tr>
                  {showDetails && (
                    <tr>
                      <td colSpan="5" style={{ padding: '12px 16px', background: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
                        <div style={{ paddingLeft: '8px', borderLeft: '3px solid #2563EB' }}>
                          <p style={{ fontSize: '11px', color: '#374151', fontStyle: 'italic', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                            "{r.snippet || 'No specific insight captured.'}"
                          </p>
                          {hasCitations && (
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Verified Sources</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {r.citations.slice(0, 3).map((cit, idx) => {
                                  let displayUrl = cit;
                                  try { displayUrl = new URL(cit).href.replace(/^https?:\/\/(www\.)?/, ''); } catch(e) {}
                                  return (
                                    <span key={idx} style={{ fontSize: '9px', padding: '3px 8px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '4px', border: '1px solid #BFDBFE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                                      {displayUrl}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {rankings.length > 15 && (
          <p style={{ fontSize: '9px', color: '#666666', marginTop: '8px', fontStyle: 'italic' }}>
            * {rankings.length - 15} additional parameters analyzed but omitted for brevity. View live dashboard for full dataset.
          </p>
        )}
      </section>

      {/* ── Competitor Benchmarking ──────────────────────────────── */}
      {data?.competitors?.length > 0 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">Competitor Benchmarking</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {data.competitors.map((comp, idx) => {
              const normalize = (d) => (d || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
              const targetDomain = normalize(comp.domain);
              const compRankings = lastSnapshot?.competitorRankings?.filter(cr => {
                const aiDomain = normalize(cr.competitorDomain);
                const isDomainMatch = aiDomain && targetDomain && aiDomain === targetDomain;
                const isNameMatch = cr.competitorName?.toLowerCase() === comp.name?.toLowerCase();
                return isDomainMatch || isNameMatch;
              }) || [];
              const compScoreInput = compRankings.length > 0
                ? Math.round(compRankings.reduce((a, b) => a + (b.score || 0), 0) / compRankings.length)
                : 0;
              const compScore = (compRankings.some(cr => cr.found || cr.rank > 0) && compScoreInput < 15) ? 15 : compScoreInput;
              const userRawVisibility = lastSnapshot?.rawVisibility || score;
              const gap = compScore - userRawVisibility;

              return (
                <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', background: '#FAFBFC', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>{comp.name}</div>
                      <div style={{ fontSize: '10px', color: '#555555' }}>{comp.domain}</div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>{compScore}%</div>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${compScore}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '2px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555555' }}>Visibility vs You</span>
                    <span className={`rpt-tag ${gap > 0 ? 'rpt-badge-red' : 'rpt-badge-green'}`}>
                      {gap > 0 ? `+${gap}% LEAD` : `${Math.abs(gap)}% GAP`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Strategic Outlook ─────────────────────────────────────── */}
      <section style={{
        background: '#1F2937', // Solid background instead of gradient
        borderRadius: '18px',
        padding: '28px 32px',
        breakInside: 'avoid',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: '#F59E0B12' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: '16px' }}>Strategic Outlook</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.7', margin: 0, fontWeight: '600' }}>
                Your current visibility index of <strong style={{ color: '#ffffff' }}>{score}%</strong> across your target market indicates{' '}
                {score >= 70 ? 'a strong foothold' : score >= 40 ? 'growing momentum' : 'significant room for growth'} in AI grounding.
                Focus on increasing <em style={{ color: '#F59E0B' }}>cited source</em> frequency by optimizing structured data and building entity authority.
              </p>
            </div>
            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '8px', fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Next Audit Recommended</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                  {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '8px', fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Priority Action</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B' }}>Strengthen Citation Depth</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default ProjectIntelligenceReport;
