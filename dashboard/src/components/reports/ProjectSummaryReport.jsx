import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * ProjectSummaryReport — Premium PDF Template
 * Single-page professional Brand Visibility Snapshot
 */
const ProjectSummaryReport = ({ project, date }) => {
  const score = project?.latestScore || 0;

  const getScoreStyle = (s) => {
    if (s >= 80) return { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Excellent' };
    if (s >= 60) return { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Good' };
    if (s >= 40) return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Moderate' };
    return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Needs Work' };
  };

  const scoreStyle = getScoreStyle(score);
  const prompts = project?.prompts || [];

  return (
    <BaseReportLayout
      title="Project Visibility Summary"
      subtitle="Strategic Brand Snapshot"
      brandName={project?.brandName || project?.name}
      date={date}
      reportType="Project Summary"
      accentColor="#6366F1"
    >
      {/* ── Score + Details ────────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Brand Visibility Snapshot</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px', alignItems: 'stretch' }}>

          {/* Score Card */}
          <div style={{
            background: '#1F2937', // Solid background instead of gradient
            borderRadius: '16px',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: '#6366F120' }} />
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.22em' }}>Latest GEO Score</div>
            <div style={{ fontSize: '64px', fontWeight: '700', color: '#ffffff', letterSpacing: '-3px', lineHeight: 1 }}>{score}%</div>
            <span className="rpt-tag" style={{ backgroundColor: scoreStyle.bg, color: scoreStyle.color, border: `1px solid ${scoreStyle.border}` }}>
              {scoreStyle.label} Performance
            </span>
            <div style={{ width: '100%', height: '4px', backgroundColor: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, height: '100%', backgroundColor: scoreStyle.color }} />
            </div>
          </div>

          {/* Project Details */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', background: '#FAFBFC' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '16px' }}>Project Configuration</div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Target Domain</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937' }}>{project?.domain || 'Not specified'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Audit Prompts', value: prompts.length },
                { label: 'Target Market', value: project?.market?.name || 'Global' },
                { label: 'Last Scan', value: project?.lastScanAt ? new Date(project.lastScanAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never' },
              ].map((item, i) => (
                <div key={i} className="rpt-kpi">
                  <div className="rpt-kpi-label">{item.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', marginTop: '4px' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Audit Parameters ───────────────────────────────── */}
      {prompts.length > 0 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div className="rpt-section-title">Active Audit Parameters</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {prompts.map((p, i) => {
              const colors = ['rpt-badge-blue', 'rpt-badge-purple', 'rpt-badge-green', 'rpt-badge-amber'];
              return (
                <span key={i} className={`rpt-tag ${colors[i % 4]}`}>{p}</span>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Intelligence Note ─────────────────────────────────────── */}
      <section style={{
        background: '#F8FAFC', // Solid background instead of gradient
        border: '1px solid #C7D2FE',
        borderLeft: '4px solid #6366F1',
        borderRadius: '0 16px 16px 0',
        padding: '22px 24px',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '24px', flexShrink: 0 }}>💡</div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Intelligence Note</div>
            <p style={{ fontSize: '14px', color: '#1F2937', lineHeight: '1.7', margin: 0, fontWeight: '600', fontStyle: 'italic' }}>
              "This project is currently being monitored for organic AI search visibility. For a full breakdown of engine-specific sentiment, citation frequency, and discovery gaps, please refer to the detailed Intelligence Audit in the project dashboard."
            </p>
          </div>
        </div>
      </section>

      {/* ── Quick Stats Row ───────────────────────────────────────── */}
      {project?.latestScore !== undefined && (
        <section style={{
          marginTop: '24px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {[
            { label: 'GEO Score', value: `${score}%` },
            { label: 'Prompts Tracked', value: prompts.length },
            { label: 'Market', value: project?.market?.name || 'Global' },
            { label: 'Status', value: project?.lastScanAt ? 'Active' : 'Pending' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>{item.value}</div>
            </div>
          ))}
        </section>
      )}
    </BaseReportLayout>
  );
};

export default ProjectSummaryReport;
