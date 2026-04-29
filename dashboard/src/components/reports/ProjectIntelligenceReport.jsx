import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * ProjectIntelligenceReport
 * Comprehensive report for a full Brand Visibility Project.
 * Combines KPIs, historical trends, and prompt-level performance.
 */
const ProjectIntelligenceReport = ({ brandName, data, history = [], date }) => {
  const lastSnapshot = history[0] || {};
  const rankings = lastSnapshot.promptRankings || [];
  
  // Calculate top-level stats
  const top1 = rankings.filter(r => r.found && r.rank === 1).length;
  const top3 = rankings.filter(r => r.found && r.rank > 0 && r.rank <= 3).length;
  const top10 = rankings.filter(r => r.found && r.rank > 0 && r.rank <= 10).length;
  const total = data?.prompts?.length || rankings.length || 0;
  
  const score = lastSnapshot.overallScore || 0;
  const visibility = Math.round(rankings.reduce((a, b) => a + (b.score || 0), 0) / (total || 1));

  return (
    <BaseReportLayout 
      title="Brand Intelligence Audit" 
      subtitle="Full Spectrum GEO Visibility & Perceptual Report"
      brandName={brandName}
      date={date}
    >
      {/* Executive Summary Section */}
      <section className="mb-12">
        <h2 className="text-xl font-black mb-8 uppercase tracking-tight">Executive Visibility Summary</h2>
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-xl">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">GEO Health Index</p>
             <p className="text-4xl font-black">{score}%</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Search Visibility</p>
             <p className="text-2xl font-black text-slate-900">{visibility}%</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Top 3 Rankings</p>
             <p className="text-2xl font-black text-slate-900">{top3}</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 p-6 rounded-3xl flex flex-col items-center justify-center text-center">
             <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2">Market Citations</p>
             <p className="text-2xl font-black text-slate-900">{rankings.filter(r => r.linkFound).length}</p>
          </div>
        </div>
      </section>

      {/* Engine Comparison */}
      <section className="mb-12 break-inside-avoid">
        <h2 className="text-lg font-black mb-6 uppercase tracking-tight">AI Engine Semantic Alignment</h2>
        <div className="grid grid-cols-2 gap-10">
          <div className="border border-slate-100 p-8 rounded-3xl bg-white shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest">OpenAI (GPT-4o)</span>
                <span className="text-sm font-black text-emerald-600">{lastSnapshot.engineScores?.openai || 0}%</span>
             </div>
             <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${lastSnapshot.engineScores?.openai || 0}%` }} />
             </div>
             <p className="text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-tight">Based on organic mention frequency and semantic proximity.</p>
          </div>
          <div className="border border-slate-100 p-8 rounded-3xl bg-white shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest">Google Gemini</span>
                <span className="text-sm font-black text-blue-600">{lastSnapshot.engineScores?.gemini || 0}%</span>
             </div>
             <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${lastSnapshot.engineScores?.gemini || 0}%` }} />
             </div>
             <p className="text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-tight">Based on Search Generative Experience (SGE) grounding.</p>
          </div>
        </div>
      </section>

      {/* Rankings Detail Table */}
      <section className="mb-12">
        <h2 className="text-lg font-black mb-6 uppercase tracking-tight">Prompt Performance Matrix</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Audit Parameter</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Rank</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Mention</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Link</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Visibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.slice(0, 15).map((r, i) => (
              <tr key={i} className="group">
                <td className="py-4">
                  <p className="text-xs font-bold text-slate-900">{r.prompt}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{r.engine}</p>
                </td>
                <td className="py-4 text-center">
                  <span className={`text-[11px] font-black px-2 py-1 rounded ${r.rank > 0 && r.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {r.rank > 0 ? `#${r.rank}` : '—'}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className={`text-[10px] font-black ${r.found ? 'text-emerald-600' : 'text-slate-300'}`}>
                    {r.found ? 'YES' : 'NO'}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className={`text-[10px] font-black ${r.linkFound ? 'text-blue-600' : 'text-slate-300'}`}>
                    {r.linkFound ? 'YES' : 'NO'}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <span className="text-xs font-black text-slate-900">{r.score || 0}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rankings.length > 15 && (
           <p className="text-[10px] text-slate-400 italic mt-4">* Additional {rankings.length - 15} parameters analyzed but omitted for brevity. View live dashboard for full dataset.</p>
        )}
      </section>

      {/* Strategic Outlook */}
      <section className="mt-12 p-10 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden break-inside-avoid">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10">
           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400 mb-4">Strategic Outlook</h3>
           <div className="grid grid-cols-2 gap-12">
              <div>
                 <p className="text-xs text-slate-300 leading-relaxed font-medium">
                   Your current visibility index of <strong className="text-white">{score}%</strong> across <strong className="text-white">India</strong> indicates a strong foothold in AI grounding. To further improve, focus on increasing "Cited Source" frequency in Google Gemini responses by optimizing technical structured data.
                 </p>
              </div>
              <div className="border-l border-white/10 pl-12 flex flex-col justify-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Next Audit Recommended</p>
                 <p className="text-lg font-bold text-white">May 20, 2026</p>
              </div>
           </div>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default ProjectIntelligenceReport;
