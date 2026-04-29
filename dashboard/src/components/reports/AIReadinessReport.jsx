import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * AIReadinessReport
 * Print-optimized template for Technical Readiness & AI Discoverability.
 */
const AIReadinessReport = ({ brandName, data, date }) => {
  const score = data?.coverageScore || 0;
  const ds = data?.domainSynthesis || data || {};
  const queries = data?.queries || [];

  return (
    <BaseReportLayout 
      title="Technical Readiness Report" 
      subtitle="AI Perception & Content Discoverability"
      brandName={brandName}
      date={date}
    >
      {/* Executive Summary */}
      <section className="mb-12">
        <div className="flex items-center gap-12 mb-10">
          <div className="shrink-0 w-40 h-40 relative">
             <div className="absolute inset-0 border-[12px] border-slate-100 rounded-full" />
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-black text-slate-900 leading-none">{score}%</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Overall Score</p>
             </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black mb-4 border-none p-0 tracking-tight uppercase">Intelligence Briefing</h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {data?.summary || "This report analyzes your website's technical and semantic readiness for AI-driven discovery. We evaluate how core LLMs (GPT-4, Claude, Gemini) index your brand's digital assets."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="kpi-box">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Intent Coverage</p>
             <p className="text-xl font-black text-slate-900">{data?.corePagesFound || 0} / {data?.totalPages || 0}</p>
          </div>
          <div className="kpi-box">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sitemap Nodes</p>
             <p className="text-xl font-black text-slate-900">{data?.totalSitemapUrls || 0}</p>
          </div>
          <div className="kpi-box">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Technical Signal</p>
             <p className="text-xl font-black text-emerald-600">✓ Analyzed</p>
          </div>
          <div className="kpi-box">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Discovery Gaps</p>
             <p className="text-xl font-black text-amber-600">{data?.totalMissing || 0}</p>
          </div>
        </div>
      </section>

      {/* Semantic Footprint */}
      <section className="mb-12">
        <h2 className="text-lg font-black mb-6 uppercase tracking-tight">Semantic Footprint</h2>
        <div className="grid grid-cols-2 gap-10">
          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Brand Synthesis</p>
            <p className="text-[13px] text-slate-700 leading-relaxed font-bold italic">
              "{ds.coreOffering || ds.description || 'General business entity identified.'}"
            </p>
          </div>
          <div className="py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Architecture Classification</p>
            <div className="space-y-3">
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-400 uppercase">Primary Vertical</span>
                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{ds.domainType || 'General'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-400 uppercase">Entity Classification</span>
                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{ds.brandType || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-400 uppercase">Content Freshness</span>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-tight">Optimized</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visibility Mappings */}
      <section className="mb-12 break-inside-avoid">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-lg font-black border-none p-0 m-0 uppercase tracking-tight">AI Discoverability Matrix</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Fan-Out Query Mapping</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-1/3">Target Query</th>
              <th className="w-1/4">Predicted Path</th>
              <th className="w-1/6">Intent</th>
              <th className="w-1/6 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {queries.slice(0, 15).map((q, i) => (
              <tr key={i}>
                <td className="font-bold text-slate-900">{q.query}</td>
                <td className="font-mono text-[10px] text-slate-500">{q.path}</td>
                <td>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-md font-black">
                    {q.intentType || 'Core'}
                  </span>
                </td>
                <td className="text-right">
                  <span className={`font-black text-[11px] ${q.status === 'present' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {q.status === 'present' ? '✓ PRESENT' : '⚠ MISSING'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </BaseReportLayout>
  );
};

export default AIReadinessReport;
