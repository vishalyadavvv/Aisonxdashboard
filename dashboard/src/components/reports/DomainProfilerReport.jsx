import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * DomainProfilerReport
 * Print-optimized template for Strategic Domain Intelligence.
 */
const DomainProfilerReport = ({ brandName, data, date }) => {
  const topics = data?.topics || [];
  const presenceTags = data?.presenceTags || [];
  const prompts = data?.prompts || [];
  const competitors = data?.competitors || [];

  return (
    <BaseReportLayout 
      title="Domain Architecture Profile" 
      subtitle="Strategic Positioning & Perceptual Mapping"
      brandName={brandName}
      date={date}
    >
      {/* Brand DNA Section */}
      <section className="mb-12">
        <div className="flex items-end justify-between mb-8">
           <h2 className="text-2xl font-black border-none p-0 m-0 uppercase tracking-tight">Institutional DNA</h2>
           <span className="text-[10px] font-black uppercase px-3 py-1 bg-slate-900 text-white rounded-md tracking-widest">
             Profile ID: {Math.random().toString(36).substring(7).toUpperCase()}
           </span>
        </div>
        
        <div className="grid grid-cols-2 gap-12">
          <div className="bg-slate-50 p-10 rounded-3xl border border-slate-100 relative">
             <div className="absolute top-6 left-6 w-1 h-12 bg-blue-600 rounded-full" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-4">Domain Synthesis</p>
             <p className="text-[14px] text-slate-700 leading-relaxed font-bold italic ml-4">
               "{data.description || data.coreOffering || "Automated synthesis of domain architecture and market positioning nodes."}"
             </p>
          </div>
          <div className="py-4 space-y-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Classification Matrix</p>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-400 uppercase">Architecture</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{data.domainType || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-400 uppercase">Audience Model</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{data.brandType || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-400 uppercase">Strategic Focus</span>
              <span className="text-xs font-black text-blue-600 uppercase tracking-tight">{data.brandFocus || 'Digital Entry'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-400 uppercase">Perceptual Sentiment</span>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-tight">{data.sentiment || 'Neutral'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Semantic clusters */}
      <section className="mb-12">
        <h2 className="text-lg font-black mb-8 uppercase tracking-tight">Semantic Footprint Clusters</h2>
        <div className="grid grid-cols-3 gap-8">
          <div className="border border-slate-100 p-8 rounded-3xl bg-white shadow-sm break-inside-avoid">
             <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Topic Matrix</p>
             </div>
             <div className="flex flex-wrap gap-2">
                {topics.slice(0, 12).map((t, i) => (
                  <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-600 uppercase tracking-tight">{t}</span>
                ))}
             </div>
          </div>
          <div className="border border-slate-100 p-8 rounded-3xl bg-white shadow-sm break-inside-avoid">
             <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-purple-600 rounded-full" />
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">AI Prompts</p>
             </div>
             <div className="flex flex-wrap gap-2">
                {prompts.slice(0, 12).map((p, i) => (
                  <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 uppercase tracking-tight">{p}</span>
                ))}
             </div>
          </div>
          <div className="border border-slate-100 p-8 rounded-3xl bg-white shadow-sm break-inside-avoid">
             <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-rose-600 rounded-full" />
                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Competitors</p>
             </div>
             <div className="flex flex-wrap gap-2">
                {competitors.slice(0, 12).map((c, i) => (
                  <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 uppercase tracking-tight">{c}</span>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Presence Matrix */}
      <section className="mb-12 break-inside-avoid">
        <h2 className="text-lg font-black mb-6 uppercase tracking-tight">Market Presence Matrix</h2>
        <div className="grid grid-cols-4 gap-4">
          {presenceTags.map((tag, i) => (
            <div key={i} className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-center text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-tight">
                {tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Strategic Recommendation */}
      <section className="mt-12 p-8 bg-blue-50 rounded-3xl border border-blue-100">
        <div className="flex gap-6 items-start">
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <span className="text-xl">✦</span>
           </div>
           <div>
              <h4 className="text-sm font-black uppercase text-blue-900 mb-2">Strategic Recommendation</h4>
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                Based on your {data.brandFocus} positioning, we recommend prioritizing technical readiness signals for {topics[0] || 'your core services'} to solidify your AI semantic authority.
              </p>
           </div>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default DomainProfilerReport;
