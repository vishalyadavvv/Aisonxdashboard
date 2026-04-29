import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * BrandAuditReport
 * Print-optimized template for Knowledge Graph & Digital Authority data.
 */
const BrandAuditReport = ({ brandName, data, date }) => {
  const entities = data?.entities || [];

  return (
    <BaseReportLayout 
      title="Brand Audit Report" 
      subtitle="Knowledge Graph Analysis & Digital Authority"
      brandName={brandName}
      date={date}
    >
      <div className="space-y-12">
        {entities.length > 0 ? (
          entities.map((entity, idx) => (
            <div key={idx} className="border-b border-slate-100 pb-10 last:border-0 break-inside-avoid">
              <div className="flex gap-8 mb-6">
                {entity.image && (
                  <div className="shrink-0">
                    <img 
                      src={entity.image} 
                      alt={entity.name} 
                      className="w-24 h-24 rounded-xl object-cover border border-slate-100 shadow-sm" 
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black text-slate-900 border-none p-0 m-0 uppercase tracking-tight">{entity.name}</h2>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-md">
                       {entity.types?.[0] || 'Entity'}
                    </span>
                  </div>
                  <p className="text-slate-500 font-bold text-xs italic mb-4">{entity.description || 'Google Knowledge Graph Entry'}</p>
                  
                  <div className="flex gap-6">
                    <div className="kpi-box flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence Score</p>
                      <p className="text-2xl font-black text-emerald-600">{entity.confidenceScore || 0}%</p>
                    </div>
                    <div className="kpi-box flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Knowledge Node ID</p>
                      <p className="text-sm font-bold text-slate-700">{entity.kgId || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {entity.detailedDescription && (
                <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Entity Synthesis</p>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {entity.detailedDescription}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {entity.url && (
                  <div className="flex items-center gap-2 p-3 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs">🌐</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Official Site</p>
                      <p className="text-[10px] font-bold text-slate-700 truncate">{entity.url}</p>
                    </div>
                  </div>
                )}
                {entity.descriptionUrl && (
                  <div className="flex items-center gap-2 p-3 border border-slate-100 rounded-xl">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-xs">📄</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Source Reference</p>
                      <p className="text-[10px] font-bold text-slate-700 truncate">{entity.descriptionUrl}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Knowledge Graph Data Found</p>
          </div>
        )}
      </div>
    </BaseReportLayout>
  );
};

export default BrandAuditReport;
