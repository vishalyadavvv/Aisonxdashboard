import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * RankingPerformanceReport — Premium PDF Template
 * Professional AI Keyword Visibility & Position Audit
 */
const RankingPerformanceReport = ({ brandName, data, history = [], metrics, date }) => {
  const lastSnapshot = history[0] || {};
  const prevSnapshot = history[1] || {};
  const rankings = lastSnapshot.promptRankings || [];

  const avgRank = (() => {
    const ranked = rankings.filter(r => r.found && r.rank > 0);
    if (!ranked.length) return null;
    return (ranked.reduce((a, b) => a + b.rank, 0) / ranked.length).toFixed(1);
  })();

  const kpis = [
    { label: 'Total Keywords', value: metrics?.total || 0, color: '#1F2937', bg: '#F8FAFC', border: '#E2E8F0' },
    { label: 'Top 3 Rankings', value: metrics?.top3 || 0, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', delta: metrics?.deltas?.top3 },
    { label: 'Visibility Index', value: `${lastSnapshot?.overallScore || 0}%`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', delta: metrics?.deltas?.overallScore },
    { label: 'Avg. Position', value: avgRank ? `#${avgRank}` : '—', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  ];

  const distribution = [
    { label: 'Top 1', value: metrics?.top1 || 0, color: '#059669', bg: '#ECFDF5' },
    { label: 'Top 2–3', value: (metrics?.top3 || 0) - (metrics?.top1 || 0), color: '#0891B2', bg: '#E0F7FA' },
    { label: 'Top 4–5', value: (metrics?.top5 || 0) - (metrics?.top3 || 0), color: '#7C3AED', bg: '#F3E8FF' },
    { label: 'Top 6–10', value: (metrics?.top10 || 0) - (metrics?.top5 || 0), color: '#D97706', bg: '#FEF9C3' },
    { label: 'Unranked', value: metrics?.unranked || 0, color: '#666666', bg: '#F1F5F9' },
  ];

  return (
    <BaseReportLayout
      title="Keyword Ranking Performance"
      subtitle="Professional AI Visibility & Position Audit"
      brandName={brandName}
      date={date}
      reportType="Rankings Audit"
      accentColor="#059669"
    >
      {/* ── KPI Grid ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Performance Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
          {kpis.map((kpi, i) => (
            <div key={i} style={{
              background: kpi.bg,
              border: `1px solid ${kpi.border}`,
              borderRadius: '16px',
              padding: '20px 16px',
              textAlign: 'center',
              position: 'relative',
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: kpi.color, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>{kpi.label}</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937', letterSpacing: '-0.5px', lineHeight: 1 }}>{kpi.value}</div>
              {kpi.delta !== undefined && kpi.delta !== 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '600', color: kpi.delta > 0 ? '#059669' : '#DC2626' }}>
                  {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta)} vs prev
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Distribution Matrix ───────────────────────────────────── */}
      <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
        <div className="rpt-section-title">Position Distribution Matrix</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {distribution.map((item, i) => (
            <div key={i} style={{
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderBottom: `3px solid ${item.color}`,
              borderRadius: '12px',
              padding: '16px 10px',
              textAlign: 'center',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: item.bg, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
              </div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#1F2937' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Visual bar */}
        {(metrics?.total || 0) > 0 && (
          <div style={{ marginTop: '14px', height: '8px', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
            {distribution.map((item, i) => {
              const pct = Math.round(((item.value || 0) / (metrics?.total || 1)) * 100);
              return pct > 0 && (
                <div key={i} style={{ width: `${pct}%`, height: '100%', backgroundColor: item.color }} title={`${item.label}: ${item.value}`} />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Rankings Table ────────────────────────────────────────── */}
      <section style={{ breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="rpt-section-title" style={{ marginBottom: 0 }}>Keyword Ranking Performance</div>
          <span className="rpt-tag rpt-badge-green">Latest Snapshot — {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>

        <table className="rpt-table">
          <thead>
            <tr>
              <th>Audit Parameter</th>
              <th style={{ textAlign: 'center' }}>Current</th>
              <th style={{ textAlign: 'center' }}>Previous</th>
              <th style={{ textAlign: 'center' }}>Trend</th>
              <th style={{ textAlign: 'right' }}>Reach Est.</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => {
              const prevRes = prevSnapshot?.promptRankings?.find(pr => pr.prompt === r.prompt && pr.engine === r.engine);
              const delta = (r.found && prevRes?.found) ? prevRes.rank - r.rank : 0;
              const isTop = r.found && r.rank > 0 && r.rank <= 3;

              return (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#1F2937', fontSize: '13px' }}>{r.prompt}</div>
                    <div style={{ fontSize: '10px', color: '#444444', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{r.engine}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`rpt-tag ${isTop ? 'rpt-badge-green' : r.found ? 'rpt-badge-slate' : 'rpt-badge-red'}`}>
                      {r.found ? `#${r.rank}` : '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1F2937' }}>
                      {prevRes?.found ? `#${prevRes.rank}` : '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {delta !== 0 ? (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: delta > 0 ? '#059669' : '#DC2626' }}>
                        {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                      </span>
                    ) : (
                      <span style={{ color: '#1F2937', fontSize: '14px', fontWeight: '600' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1F2937' }}>
                      {r.found ? `${Math.max(30, 100 - r.rank * 5)}%` : '0%'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* ── Disclosure ───────────────────────────────────────────── */}
      <section style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: '#555555', lineHeight: '1.6', marginTop: '16px', fontStyle: 'italic', maxWidth: '800px' }}>
          This ranking report is generated using AISONX's proprietary AI-GEO Audit engine. Results represent organic visibility within Search Generative Experiences (SGE) and LLM output buffers at the time of the scan. Rankings may vary based on user context and model version.
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default RankingPerformanceReport;
