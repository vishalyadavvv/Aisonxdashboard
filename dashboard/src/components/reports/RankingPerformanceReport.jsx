import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * RankingPerformanceReport
 * Specialized report for professional keyword/prompt ranking tracking.
 * Includes deltas, visibility trends, and distribution metrics.
 */
const RankingPerformanceReport = ({ brandName, data, history = [], metrics, date }) => {
  const lastSnapshot = history[0] || {};
  const prevSnapshot = history[1] || {};
  const rankings = lastSnapshot.promptRankings || [];

  return (
    <BaseReportLayout 
      title="Keyword Ranking Performance" 
      subtitle="Professional AI Visibility & Position Audit"
      brandName={brandName}
      date={date}
    >
      {/* KPI Section */}
      <section className="mb-12">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Keywords</p>
             <p className="text-2xl font-black text-slate-900">{metrics?.total || 0}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center">
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Top 3 Rank</p>
             <p className="text-2xl font-black text-slate-900">{metrics?.top3 || 0}</p>
             {metrics?.deltas?.top3 !== 0 && (
                <p className={`text-[9px] font-black mt-1 ${metrics?.deltas?.top3 > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {metrics?.deltas?.top3 > 0 ? '+' : ''}{metrics?.deltas?.top3} vs Prev
                </p>
             )}
          </div>
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl text-center">
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Visibility Index</p>
             <p className="text-2xl font-black text-slate-900">{lastSnapshot?.overallScore || 0}%</p>
          </div>
          <div className="bg-slate-900 text-white p-6 rounded-3xl text-center">
             <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Avg. Position</p>
             <p className="text-2xl font-black">
                {rankings.filter(r => r.found && r.rank > 0).length > 0 
                  ? (rankings.filter(r => r.found && r.rank > 0).reduce((a, b) => a + b.rank, 0) / rankings.filter(r => r.found && r.rank > 0).length).toFixed(1)
                  : '—'}
             </p>
          </div>
        </div>
      </section>

      {/* Distribution Matrix */}
      <section className="mb-12 break-inside-avoid">
         <h2 className="text-lg font-black mb-6 uppercase tracking-tight">Position Distribution Matrix</h2>
         <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Top 1', value: metrics?.top1, color: 'bg-emerald-500' },
              { label: 'Top 2-3', value: (metrics?.top3 || 0) - (metrics?.top1 || 0), color: 'bg-blue-500' },
              { label: 'Top 4-5', value: (metrics?.top5 || 0) - (metrics?.top3 || 0), color: 'bg-indigo-500' },
              { label: 'Top 6-10', value: (metrics?.top10 || 0) - (metrics?.top5 || 0), color: 'bg-violet-500' },
              { label: 'Unranked', value: metrics?.unranked, color: 'bg-slate-300' }
            ].map((item, i) => (
              <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm text-center">
                 <div className={`w-2 h-2 rounded-full ${item.color} mx-auto mb-3`} />
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                 <p className="text-xl font-black text-slate-900">{item.value || 0}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Rankings Table */}
      <section className="mb-12">
        <h2 className="text-lg font-black mb-6 uppercase tracking-tight">Keyword Ranking Performance</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Audit Parameter</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Current</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Previous</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Trend</th>
              <th className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Reach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.map((r, i) => {
              const prevRes = prevSnapshot?.promptRankings?.find(pr => pr.prompt === r.prompt && pr.engine === r.engine);
              const delta = (r.found && prevRes?.found) ? prevRes.rank - r.rank : 0;
              
              return (
                <tr key={i}>
                  <td className="py-4">
                    <p className="text-xs font-bold text-slate-900">{r.prompt}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{r.engine}</p>
                  </td>
                  <td className="py-4 text-center">
                    <span className={`text-[11px] font-black px-2 py-1 rounded ${r.rank > 0 && r.rank <= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {r.found ? `#${r.rank}` : '—'}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    <span className="text-[11px] font-bold text-slate-400">
                      {prevRes?.found ? `#${prevRes.rank}` : '—'}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    {delta !== 0 ? (
                      <span className={`text-[10px] font-black ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                      </span>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    <span className="text-xs font-black text-slate-900">{r.found ? Math.max(30, 100 - r.rank * 5) : 0}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Professional Disclosure */}
      <section className="mt-12 pt-8 border-t border-slate-100 text-center break-inside-avoid">
         <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            This ranking report is generated using DgtLmart's proprietary AI-GEO Audit engine. Results represent organic visibility within Search Generative Experiences (SGE) and large language model output buffers at the time of the scan.
         </p>
      </section>
    </BaseReportLayout>
  );
};

export default RankingPerformanceReport;
