import React from 'react';
import BaseReportLayout from './BaseReportLayout';

const PdfSignalRow = ({ label, status, goodLabel, badLabel, isReverse, allowUnknown }) => {
  let isUnknown = status === undefined || status === null || status === 'Unknown';
  if (isUnknown && !allowUnknown) isUnknown = false; // default to false/bad if unknown not explicitly supported

  if (isUnknown) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: '#475569' }}>{label}</span>
        <span style={{ fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>Unknown</span>
      </div>
    );
  }

  let isGood = Boolean(status);
  if (typeof status === 'string') {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'allowed' || lowerStatus === 'yes' || lowerStatus === 'present' || lowerStatus === 'clear') isGood = true;
    else if (lowerStatus === 'blocked' || lowerStatus === 'restricted' || lowerStatus === 'no' || lowerStatus === 'missing') isGood = false;
  }
  if (isReverse) isGood = !isGood;

  const badgeColor = isGood ? '#059669' : '#DC2626';
  const badgeBg = isGood ? '#ECFDF5' : '#FEF2F2';
  const badgeBorder = isGood ? '#A7F3D0' : '#FECACA';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937' }}>{label}</span>
      <span style={{ fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
        {isGood ? goodLabel : badLabel}
      </span>
    </div>
  );
};

const PdfSchemaItems = ({ technicalSignals }) => {
  const sd = technicalSignals?.structuredData;
  const items = [];

  if (!sd?.organizationPresent) items.push({ title: 'Organization Schema', desc: 'Add Organization markup to your homepage to define your brand identity.', effort: 'Low', impact: 15 });
  if (!sd?.breadcrumbPresent) items.push({ title: 'WebSite Schema', desc: 'Implement WebSite schema with sitelinks search box.', effort: 'Low', impact: 10 });
  if (!sd?.articlePresent) items.push({ title: 'Article Schema', desc: 'Add Article schema to your blog posts for better content understanding.', effort: 'Medium', impact: 12 });
  if (!sd?.faqPresent) items.push({ title: 'FAQ Schema', desc: 'Add FAQPage schema to pages with Q&A content for rich snippets.', effort: 'Low', impact: 8 });
  if (!sd?.productPresent) items.push({ title: 'Product/Service Schema', desc: 'Add Product schema to highlight your offerings to AI systems.', effort: 'Medium', impact: 10 });

  if (items.length === 0) {
    return <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#059669', fontWeight: '600' }}>Excellent! All key schemas are already implemented.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1F2937' }}>{item.title}</div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: item.effort === 'Low' ? '#059669' : '#D97706', background: item.effort === 'Low' ? '#ECFDF5' : '#FFFBEB', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${item.effort === 'Low' ? '#A7F3D0' : '#FDE68A'}` }}>
                {item.effort} Effort
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', marginBottom: '10px' }}>{item.desc}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: '600', color: '#64748B' }}>Est. Impact</span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#0EA5E9' }}>+{item.impact}%</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const PdfContentOptItem = ({ title, desc, hasIt, impact }) => {
  if (hasIt) return null;
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#1F2937' }}>{title}</div>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#1D4ED8', background: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>Medium Effort</div>
        </div>
        <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', marginBottom: '10px' }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: '600', color: '#64748B' }}>Est. Impact</span>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#0EA5E9' }}>+{impact}%</span>
      </div>
    </div>
  );
};

/**
 * AIReadinessReport — Premium PDF Template
 * Technical AI Readiness & Content Discoverability
 */
const AIReadinessReport = ({ brandName, data, date }) => {
  const score = data?.coverageScore || 0;
  const ds = data?.domainSynthesis || data || {};
  const queries = data?.queries || [];
  const present = queries.filter(q => q.status === 'present').length;
  const missing = queries.filter(q => q.status !== 'present').length;

  const getScoreStyle = (s) => {
    if (s >= 80) return { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    if (s >= 60) return { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    if (s >= 40) return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  };
  const scoreStyle = getScoreStyle(score);

  return (
    <BaseReportLayout
      title="Technical Readiness Report"
      subtitle="AI Perception & Content Discoverability Analysis"
      brandName={brandName}
      date={date}
      reportType="AI Readiness"
      accentColor="#0EA5E9"
    >
      {/* ── Executive Summary ─────────────────────────────────────── */}
      <section style={{ marginBottom: '32px' }}>
        <div className="rpt-section-title">Intelligence Briefing</div>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px', alignItems: 'center' }}>

          {/* Circular Score Gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `conic-gradient(${scoreStyle.color} ${score * 3.6}deg, #E2E8F0 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ fontSize: '26px', fontWeight: '700', color: scoreStyle.color, lineHeight: 1 }}>{score}%</div>
                <div style={{ fontSize: '7px', fontWeight: '700', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</div>
              </div>
            </div>
            <span className="rpt-tag" style={{ backgroundColor: scoreStyle.bg, color: scoreStyle.color, border: `1px solid ${scoreStyle.border}` }}>
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate' : 'Needs Work'}
            </span>
          </div>

          {/* Summary Text + KPIs */}
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', lineHeight: '1.7', marginBottom: '18px' }}>
              {data?.summary || `This report analyzes your website's technical and semantic readiness for AI-driven discovery. We evaluate how LLMs (GPT-4, Claude, Gemini) index your brand's digital assets and surface them in generated responses.`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Intent Coverage', value: `${data?.corePagesFound || 0}/${data?.totalPages || 0}`, color: '#0EA5E9' },
                { label: 'Sitemap URLs', value: data?.totalSitemapUrls || 0, color: '#7C3AED' },
                { label: 'Queries Present', value: present, color: '#059669' },
                { label: 'Gaps Found', value: data?.totalMissing || missing, color: '#DC2626' },
              ].map((kpi, i) => (
                <div key={i} className="rpt-kpi" style={{ textAlign: 'center' }}>
                  <div className="rpt-kpi-label">{kpi.label}</div>
                  <div className="rpt-kpi-value" style={{ fontSize: '20px', color: kpi.color }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Semantic Footprint ─────────────────────────────────────── */}
      {(ds.coreOffering || ds.description || ds.domainType) && (
        <section style={{ marginBottom: '32px' }}>
          <div className="rpt-section-title">Semantic Footprint Analysis</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Brand Synthesis */}
            <div className="rpt-insight" style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>Brand Synthesis</div>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937', lineHeight: '1.65', margin: 0, fontStyle: 'italic' }}>
                "{ds.coreOffering || ds.description || 'General business entity identified with digital presence.'}"
              </p>
            </div>

            {/* Classification Matrix */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>Architecture Classification</div>
              {[
                { key: 'Primary Vertical', val: ds.domainType || 'General' },
                { key: 'Entity Classification', val: ds.brandType || 'N/A' },
                { key: 'Content Freshness', val: 'Optimized' },
                { key: 'Market Sentiment', val: ds.sentiment || 'Neutral' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? '1px solid #E2E8F0' : 'none' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.key}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Topics / Competitors / Prompts */}
          {((ds.topics?.length > 0) || (ds.competitors?.length > 0) || (ds.prompts?.length > 0)) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '16px' }}>
              {[
                { label: 'Topic Matrix', items: ds.topics, cls: 'rpt-badge-blue' },
                { label: 'AI Prompts', items: ds.prompts, cls: 'rpt-badge-purple' },
                { label: 'Competitors', items: ds.competitors, cls: 'rpt-badge-red' },
              ].map(({ label, items, cls }, i) => items?.length > 0 && (
                <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '10px' }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {items.slice(0, 8).map((t, j) => (
                      <span key={j} className={`rpt-tag ${cls}`}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Visibility Prediction Results ─────────────────────────────── */}
      {queries.length > 0 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="rpt-section-title" style={{ marginBottom: 0 }}>Visibility Prediction Results</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="rpt-tag rpt-badge-green">✓ {present} Present</span>
              <span className="rpt-tag rpt-badge-amber">⚠ {missing} Missing</span>
            </div>
          </div>

          <table className="rpt-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Fan-Out Sub-Query</th>
                <th style={{ width: '20%' }}>Predicted Path</th>
                <th style={{ width: '30%' }}>AI Expectation Reason</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {queries.slice(0, 18).map((q, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '600', color: '#1D4ED8' }}>{q.query}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569' }}>{q.path}</td>
                  <td style={{ fontSize: '11px', color: '#334155' }}>{q.reason}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`rpt-tag ${q.status === 'present' ? 'rpt-badge-green' : 'rpt-badge-amber'}`}>
                      {q.status === 'present' ? '✓ Present' : '⚠ Missing'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '11px', fontWeight: '600', color: q.status === 'present' ? '#059669' : '#D97706' }}>
                    {q.status === 'present' ? 'No Action' : 'Create Page'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {queries.length > 18 && (
            <p style={{ fontSize: '11px', color: '#1F2937', marginTop: '8px', fontStyle: 'italic', fontWeight: '600' }}>
              * {queries.length - 18} additional queries omitted. View full dataset in live dashboard.
            </p>
          )}
        </section>
      )}

      {/* ── Fan-Out Query Mappings ─────────────────────────────── */}
      {queries.length > 0 && (
        <section style={{ marginBottom: '32px', breakInside: 'avoid' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="rpt-section-title" style={{ marginBottom: 4 }}>Fan-Out Query Mappings</div>
              <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>Typical queries AI models use to find your business.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="rpt-tag" style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>Aware of {data?.totalSitemapUrls || 0} pages</span>
            </div>
          </div>

          <table className="rpt-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Parent Query</th>
                <th style={{ width: '22%' }}>Fan-Out Sub-Query</th>
                <th style={{ width: '20%' }}>Predicted Path</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Intent</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Query Layer</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {queries.slice(0, 18).map((q, i) => (
                <tr key={i}>
                  <td style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{q.parentQuery || 'General Query'}</td>
                  <td style={{ fontWeight: '600', color: '#1F2937' }}>{q.query}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '10px', color: '#3B82F6' }}>{q.path}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`rpt-tag ${q.intentType === 'Informational' ? 'rpt-badge-blue' : q.intentType === 'Transactional' ? 'rpt-badge-green' : 'rpt-badge-slate'}`}>
                      {q.intentType || 'Core'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                    {q.queryLayer || 'Primary'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`rpt-tag ${q.status === 'present' ? 'rpt-badge-green' : 'rpt-badge-amber'}`}>
                      {q.status === 'present' ? '✓ Found' : '⚠ Missing'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {queries.length > 18 && (
            <p style={{ fontSize: '11px', color: '#1F2937', marginTop: '8px', fontStyle: 'italic', fontWeight: '600' }}>
              * {queries.length - 18} additional queries omitted.
            </p>
          )}
        </section>
      )}

      {/* ── Sitemap Breakdown ─────────────────────────────────────── */}
      <section style={{ breakInside: 'avoid' }}>
        <div className="rpt-section-title">Sitemap Architecture</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          {[
            { label: 'Total URLs Scanned', value: data?.totalSitemapUrls || 0, color: '#0EA5E9', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Core Page URLs', value: data?.pageUrls || data?.corePagesFound || 0, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            { label: 'Post / Blog URLs', value: data?.postUrls || 0, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          ].map((card, i) => (
            <div key={i} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '8px', fontWeight: '600', color: card.color, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>{card.label}</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1F2937', letterSpacing: '-1px' }}>{card.value}</div>
            </div>
          ))}
        </div>
        {data?.sitemapUrl && data.sitemapUrl !== 'Scanned via Homepage Crawl' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
            {[['Page Sitemap', data.pageSitemapUrl || data.sitemapUrl], ['Post Sitemap', data.postSitemapUrl || data.sitemapUrl]].map(([lbl, url], i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 14px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: '600', color: '#1F2937', textTransform: 'uppercase', letterSpacing: '0.15em', flexShrink: 0 }}>{lbl}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0EA5E9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Technical AI Signals ─────────────────────────────────────── */}
      <section style={{ marginTop: '32px', breakInside: 'avoid' }}>
        <div className="rpt-section-title">Technical AI Signals (Machine-Readable Indicators)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          
          {/* Bots */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>AI Bot Accessibility</div>
            <PdfSignalRow label="Robots.txt Access" status={data?.technicalSignals?.robots?.exists ? 'Allowed' : 'Blocked'} goodLabel="Accessible" badLabel="Missing" />
            <PdfSignalRow label="GPTBot" status={data?.technicalSignals?.robots?.gptBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
            <PdfSignalRow label="Google-Extended" status={data?.technicalSignals?.robots?.googleExtended} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
            <PdfSignalRow label="ClaudeBot" status={data?.technicalSignals?.robots?.claudeBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
            <PdfSignalRow label="PerplexityBot" status={data?.technicalSignals?.robots?.perplexityBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
            <PdfSignalRow label="CCBot" status={data?.technicalSignals?.robots?.ccBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
            <PdfSignalRow label="Global Disallow" status={data?.technicalSignals?.robots?.globalDisallow} goodLabel="Clear" badLabel="Blocked" isReverse />
            <PdfSignalRow label="X-Robots-Tag" status={data?.technicalSignals?.robots?.xRobotsTag !== 'None'} goodLabel="Clear" badLabel="Present" isReverse />
            <PdfSignalRow label="Meta Noindex" status={data?.technicalSignals?.crawlability?.isNoindex} goodLabel="Clear" badLabel="Present" isReverse />
          </div>

          {/* Content Usage Flags */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>AI Content Usage Flags</div>
            <PdfSignalRow label="AI Search Access" status={data?.technicalSignals?.robots?.contentSignals?.search} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
            <PdfSignalRow label="AI Gen Input" status={data?.technicalSignals?.robots?.contentSignals?.aiInput} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
            <PdfSignalRow label="AI Training (Any)" status={data?.technicalSignals?.robots?.contentSignals?.aiTrain} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
            <PdfSignalRow label="AI Fine-Tuning" status={data?.technicalSignals?.robots?.contentSignals?.aiTrainFine} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
            <PdfSignalRow label="Foundation Models" status={data?.technicalSignals?.robots?.contentSignals?.aiTrainBase} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
          </div>

          {/* Structured Data */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Structured Data</div>
            <PdfSignalRow label="JSON-LD Presence" status={data?.technicalSignals?.structuredData?.schemaTypes?.length > 0} goodLabel="Detected" badLabel="Missing" />
            <PdfSignalRow label="Organization Schema" status={data?.technicalSignals?.structuredData?.organizationPresent} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Person Schema" status={data?.technicalSignals?.trust?.authorBylinePresent} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Article Schema" status={data?.technicalSignals?.structuredData?.articlePresent} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="FAQ Schema" status={data?.technicalSignals?.contentStructure?.hasFaqBlock} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Product Schema" status={data?.technicalSignals?.structuredData?.productPresent} goodLabel="Present" badLabel="Missing" allowUnknown />
          </div>

          {/* Crawlability */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Crawlability</div>
            <PdfSignalRow label="XML Sitemap" status={!!data?.sitemapUrl} goodLabel="Found" badLabel="Missing" />
            <PdfSignalRow label="Sitemap in Robots" status={data?.technicalSignals?.crawlability?.sitemapExists} goodLabel="Linked" badLabel="Missing" />
            <PdfSignalRow label="Indexable Ratio" status={data?.technicalSignals?.crawlability?.indexablePagesRatio > 0} goodLabel="High" badLabel="Low" />
            <PdfSignalRow label="HTML Rendering" status={data?.technicalSignals?.crawlability?.renderedHtmlContent} goodLabel="Server" badLabel="Client" />
            <PdfSignalRow label="Main Content Node" status={data?.technicalSignals?.crawlability?.mainContentNode} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Semantic <article>" status={data?.technicalSignals?.contentStructure?.hasArticleTag || data?.technicalSignals?.crawlability?.mainContentNode} goodLabel="Present" badLabel="Missing" />
          </div>

          {/* Content Structure */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Content Structure</div>
            <PdfSignalRow label="Semantic Headings" status={data?.technicalSignals?.contentStructure?.hasHeadingHierarchy} goodLabel="Logical" badLabel="Broken" />
            <PdfSignalRow label="Q-based Headings" status={data?.technicalSignals?.contentStructure?.hasQuestionHeadings} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Ordered Lists" status={data?.technicalSignals?.contentStructure?.orderedLists > 0} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Data Tables" status={data?.technicalSignals?.contentStructure?.tables > 0} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="Summary Block" status={data?.technicalSignals?.contentStructure?.hasSummaryBlock} goodLabel="Present" badLabel="Missing" />
          </div>

          {/* Snippet Formatting */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Snippet Formatting</div>
            <PdfSignalRow label="Direct Answer Blocks" status={data?.technicalSignals?.snippetFormatting?.hasDirectAnswer} goodLabel="Targeted" badLabel="Missing" />
            <PdfSignalRow label="Definition First" status={data?.technicalSignals?.snippetFormatting?.hasDefinitionParagraph} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Pros/Cons Pattern" status={data?.technicalSignals?.snippetFormatting?.hasProsCons} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="Feature Lists" status={data?.technicalSignals?.snippetFormatting?.hasFeatureList} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Q&A Pairs" status={data?.technicalSignals?.contentStructure?.hasQuestionHeadings} goodLabel="Present" badLabel="Missing" />
          </div>

          {/* Topic Authority */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Topic Authority</div>
            <PdfSignalRow label="Information Density" status={true} goodLabel={(data?.technicalSignals?.authority?.pillarPageWordCount || 0) + ' Words'} badLabel="Thin" />
            <PdfSignalRow label="Topic Clusters" status={data?.technicalSignals?.authority?.hasTopicClusters} goodLabel="Detected" badLabel="Missing" />
            <PdfSignalRow label="Internal Links" status={(data?.technicalSignals?.authority?.internalClusterLinks || 0) > 5} goodLabel="High" badLabel="Low" />
            <PdfSignalRow label="Pillar Pages" status={(data?.technicalSignals?.authority?.pagesPerCluster || 0) > 2} goodLabel="Detected" badLabel="Missing" />
          </div>

          {/* Citations & Trust */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Citations & Facts</div>
            <PdfSignalRow label="Authority Links" status={(data?.technicalSignals?.authority?.authorityLinksCount || 0) > 0} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label=".gov / .edu Citations" status={(data?.technicalSignals?.authority?.authorityLinksCount || 0) > 0} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="Numeric Statistics" status={(data?.technicalSignals?.authority?.numericStatsCount || 0) > 0} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Reference Section" status={data?.technicalSignals?.authority?.hasReferenceSection} goodLabel="Present" badLabel="Missing" allowUnknown />
          </div>
          
          {/* Trust */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Detectable Trust</div>
            <PdfSignalRow label="Author Bylines" status={data?.technicalSignals?.trust?.trust?.hasAuthorInfo} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Author Biographies" status={data?.technicalSignals?.trust?.trust?.hasAuthorBio} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Review/Rating Data" status={data?.technicalSignals?.trust?.trust?.hasReviews} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="Trust Badges" status={data?.technicalSignals?.trust?.trust?.hasTrustBadges} goodLabel="Detected" badLabel="Missing" allowUnknown />
          </div>

          {/* Conversational Coverage */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>Conversational Coverage</div>
            <PdfSignalRow label="What is... queries" status={true} goodLabel="High" badLabel="Low" />
            <PdfSignalRow label="How to... queries" status={data?.technicalSignals?.contentStructure?.listsDetected} goodLabel="Present" badLabel="Missing" />
            <PdfSignalRow label="Best... ranking" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="X vs Y queries" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="Alternatives to..." status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
            <PdfSignalRow label="Comprehensive Guide" status={true} goodLabel="Detected" badLabel="Missing" allowUnknown />
          </div>
        </div>
      </section>

      {/* ── Action Plan & Recommendations ─────────────────────────────────────── */}
      <section style={{ marginTop: '32px', breakInside: 'avoid' }}>
        <div className="rpt-section-title">Tailored Action Plan & Recommendations</div>
        <p style={{ fontSize: '12px', color: '#475569', marginBottom: '16px', lineHeight: '1.6' }}>
          Prioritized roadmap outlining exact steps to bridge the gap between your current site and AI system expectations.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Phase 1 */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: '600', background: '#0EA5E9', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>Phase 1</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>Priority Indexing – Critical Page Coverage</span>
            </div>
            
            {(queries || []).filter(q => q.status === 'missing').length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {(queries || []).filter(q => q.status === 'missing').slice(0, 6).map((q, i) => (
                  <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0EA5E9', marginBottom: '4px' }}>Publish {q.path}</div>
                      <div style={{ fontSize: '10px', color: '#475569' }}>{q.reason}</div>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', marginLeft: '8px' }}>High Impact</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                All critical pages are present! No missing pages detected.
              </div>
            )}
          </div>

          {/* Phase 2 */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: '600', background: '#0EA5E9', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>Phase 2</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>Semantic Bridge – Technical Entity Signals</span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
              Implement high-fidelity Schema.org markup to provide machine-readable definitions of your business entities, products, and articles.
            </div>
            <PdfSchemaItems technicalSignals={data?.technicalSignals} />
          </div>

          {/* Phase 3 */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: '600', background: '#0EA5E9', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>Phase 3</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>Retrieval Optimization – On-Page AI Signals</span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>
              Refine your page content with structural cues (FAQs, Tables, Question Groups) that streamline extraction for LLMs and AI Search agents.
            </div>
            
            {(queries || []).filter(q => q.status === 'missing').length > 3 ? (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#1D4ED8', fontWeight: '600' }}>
                Focus on Phase 1 first. Content optimization opportunities will be prioritized once your primary architecture is complete.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <PdfContentOptItem
                  title="Add FAQ Sections"
                  desc="Structurally formatted FAQ blocks provide high-confidence snippets for AI queries."
                  hasIt={data?.technicalSignals?.contentStructure?.hasFaqBlock}
                  impact={12}
                />
                <PdfContentOptItem
                  title="Question-Based Headings"
                  desc="Deploy H2/H3 tags as interrogative prompts to match AI searches."
                  hasIt={data?.technicalSignals?.contentStructure?.hasQuestionHeadings}
                  impact={10}
                />
                <PdfContentOptItem
                  title="Direct Answer Paragraphs"
                  desc="Implement 'Answer-First' formatting to simplify LLM grounding."
                  hasIt={data?.technicalSignals?.snippetFormatting?.hasDirectAnswer}
                  impact={8}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default AIReadinessReport;
