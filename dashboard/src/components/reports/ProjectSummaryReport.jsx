import React from 'react';
import BaseReportLayout from './BaseReportLayout';

/**
 * ProjectSummaryReport
 * A single-page professional summary for a project card.
 */
const ProjectSummaryReport = ({ project, date }) => {
  return (
    <BaseReportLayout 
      title="Project Visibility Summary" 
      subtitle="Strategic Brand Snapshot"
      brandName={project?.brandName || project?.name}
      date={date}
    >
      <section className="mb-12">
        <div className="grid grid-cols-2 gap-12">
          <div className="bg-slate-900 text-white p-10 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-xl">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-50">Latest GEO Score</p>
             <p className="text-6xl font-black">{project?.latestScore || 0}%</p>
          </div>
          <div className="space-y-6 py-4">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Domain</p>
                <p className="text-lg font-bold text-slate-900">{project?.domain}</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Prompts</p>
                   <p className="text-sm font-bold text-slate-900">{project?.prompts?.length || 0}</p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Market</p>
                   <p className="text-sm font-bold text-slate-900">{project?.market?.name || 'Global'}</p>
                </div>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Intelligence Scan</p>
                <p className="text-sm font-bold text-slate-600">
                   {project?.lastScanAt ? new Date(project.lastScanAt).toLocaleDateString() : 'Never'}
                </p>
             </div>
          </div>
        </div>
      </section>

      <section className="mb-12 break-inside-avoid">
         <h2 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Active Audit Parameters</h2>
         <div className="flex flex-wrap gap-2">
            {project?.prompts?.map((p, i) => (
               <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700">
                  {p}
               </span>
            ))}
         </div>
      </section>

      <section className="p-8 bg-blue-50 border border-blue-100 rounded-3xl">
         <p className="text-xs text-blue-700 font-medium leading-relaxed italic">
            "This project is currently being monitored for organic AI search visibility. For a full breakdown of engine-specific sentiment and citations, please refer to the detailed Intelligence Audit in the project dashboard."
         </p>
      </section>
    </BaseReportLayout>
  );
};

export default ProjectSummaryReport;
