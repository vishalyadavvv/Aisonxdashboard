import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * WebSearchReport
 * Print-optimized template for Live Web Mentions & Sentiment analysis.
 */
const WebSearchReport = ({ brandName, data, date }) => {
  const profile = data?.profile || {};
  const score = data?.score || profile.visibilityScore || 0;
  
  // Consolidate model results
  const modelResults = {
    ChatGPT: data?.chatgpt || data?.openai || profile.openai,
    Gemini: data?.gemini || profile.gemini
  };

  const renderContent = (content) => {
    if (!content) return null;
    const text = typeof content === 'string' ? content : content.content || '';
    return text.split('\n').filter(p => p.trim().length > 5).slice(0, 5).map((point, idx) => (
      <p key={idx} className="mb-2 text-slate-600 leading-relaxed">• {point.replace(/^[0-9]+[\.\)]\s+/, '').replace(/\*\*.*?\*\*/g, '').trim()}</p>
    ));
  };

  return (
    <BaseReportLayout 
      title="Web Visibility Audit" 
      subtitle="Real-Time Brand Mentions & Semantic Sentiment"
      brandName={brandName}
      date={date}
    >
      {/* Visibility Score & Interpretation */}
      <section className="mb-12">
        <div className="flex items-center gap-10">
          <div className="kpi-box text-center p-10 flex-shrink-0 bg-blue-50 border-blue-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authority Score</p>
             <p className="text-5xl font-black text-blue-600">{score}%</p>
          </div>
          <div className="flex-1 bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
               <h2 className="text-sm font-black border-none p-0 tracking-widest uppercase text-slate-900">AI Engine Synthesis</h2>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-bold italic">
              "{profile.interpretation || "Brand presence detected across major LLM training nodes. Sentiment remains " + (profile.sentiment || "neutral") + " based on live citations."}"
            </p>
          </div>
        </div>
      </section>

      {/* Model Insights */}
      <section className="mb-12">
        <h2 className="text-lg font-black mb-6 uppercase tracking-tight">Large Language Model Snapshots</h2>
        <div className="grid grid-cols-1 gap-6">
          {Object.entries(modelResults).map(([model, content], i) => content && (
            <div key={i} className="border border-slate-100 rounded-2xl p-6 bg-white shadow-sm break-inside-avoid">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-1 h-3 rounded-full ${model === 'Gemini' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{model} Live Response</span>
                </div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Live Research Node</span>
              </div>
              <div className="text-[12px] font-medium">
                {renderContent(content)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Discovery Assessment Table */}
      {profile.aiVisibilityAssessment && (
        <section className="mb-12 break-inside-avoid">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-lg font-black border-none p-0 m-0 uppercase tracking-tight">Discovery Assessment</h2>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Level: {profile.aiVisibilityAssessment.overallLevel || 'N/A'}
            </span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-1/3">Discovery Metric</th>
                <th className="w-1/6">Assessment</th>
                <th className="w-1/2">Discovery Evidence</th>
              </tr>
            </thead>
            <tbody>
              {(profile.aiVisibilityAssessment.criteria || []).map((c, i) => (
                <tr key={i}>
                  <td className="font-bold text-slate-900">{c.name}</td>
                  <td>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded">
                      {c.assessment}
                    </span>
                  </td>
                  <td className="text-[11px] text-slate-500 leading-relaxed">{c.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Technical Summary Footnote */}
      <section className="bg-slate-50 rounded-2xl p-6 flex justify-between items-center mt-12">
        <div className="flex gap-8">
           <div>
             <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Domain Type</p>
             <p className="text-xs font-bold text-slate-800">{profile.domainType || 'General'}</p>
           </div>
           <div>
             <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Sentiment</p>
             <p className="text-xs font-bold text-slate-800">{profile.sentiment || 'Neutral'}</p>
           </div>
        </div>
        <div className="text-right">
           <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Engine</p>
           <p className="text-xs font-bold text-slate-800 italic">DgtLmart Live Node v2.5</p>
        </div>
      </section>
    </BaseReportLayout>
  );
};

export default WebSearchReport;
