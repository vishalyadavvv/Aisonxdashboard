import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Globe, 
  Calendar,
  Info,
  ChevronUp, 
  ChevronDown,
  Search,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Activity,
  Zap,
  Layout,
  Link as LinkIcon,
  FileDown,
  Loader2
} from 'lucide-react';
import { downloadPDF } from '../utils/downloadPDF';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { fixAIUrl } from '../utils/linkFixer';

// Helper: check if a string looks like a valid URL
const isValidUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  const cleaned = str.trim();
  return cleaned.startsWith('http') || cleaned.startsWith('www.') || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(cleaned);
};

const Rankings = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project: contextProject, history: contextHistory, loading: projectLoading } = useProject();

  const [selectedEngine, setSelectedEngine] = useState('all');
  const [activeRange, setActiveRange] = useState('Current');
  const [expandedRow, setExpandedRow] = useState(null);

  const project = contextProject;
  const history = contextHistory;
  const loading = projectLoading;

  useEffect(() => {
    // Context handles the data fetching
  }, [projectId]);

  // Latest snapshot data
  const lastSnapshot = useMemo(() => history[0] || null, [history]);
  const prevSnapshot = useMemo(() => history[1] || null, [history]);

  // Comprehensive Metrics
  const metrics = useMemo(() => {
    if (!lastSnapshot) return { top1: 0, top3: 0, top5: 0, top10: 0, offPage: 0, total: 0 };
    
    const rankings = lastSnapshot.promptRankings || [];
    const filtered = selectedEngine === 'all' 
      ? rankings 
      : rankings.filter(r => r.engine === selectedEngine);
    
    const prevRankings = prevSnapshot?.promptRankings || [];
    const prevFiltered = selectedEngine === 'all'
      ? prevRankings
      : prevRankings.filter(r => r.engine === selectedEngine);

    const getCount = (list, maxRank) => {
      // If we are looking at 'all', we count unique prompts that hit that rank in ANY engine
      if (selectedEngine === 'all') {
        const uniquePrompts = [...new Set(list.map(r => r.prompt))];
        return uniquePrompts.filter(p => {
          const promptResults = list.filter(r => r.prompt === p);
          return promptResults.some(r => r.found && r.rank > 0 && r.rank <= maxRank);
        }).length;
      }
      return list.filter(r => r.found && r.rank > 0 && r.rank <= maxRank).length;
    };
    
    const counts = {
      total: project?.prompts?.length || 0,
      top1: getCount(filtered, 1),
      top3: getCount(filtered, 3),
      top5: getCount(filtered, 5),
      top10: getCount(filtered, 10),
      unranked: (project?.prompts?.length || 0) - getCount(filtered, 100) // 100 as a catch-all rank
    };

    const prevCounts = {
      top1: getCount(prevFiltered, 1),
      top3: getCount(prevFiltered, 3),
      top5: getCount(prevFiltered, 5),
      top10: getCount(prevFiltered, 10),
    };

    return {
      ...counts,
      deltas: {
        top1: counts.top1 - prevCounts.top1,
        top3: counts.top3 - prevCounts.top3,
        top5: counts.top5 - prevCounts.top5,
        top10: counts.top10 - prevCounts.top10,
      }
    };
  }, [lastSnapshot, prevSnapshot, selectedEngine]);

  // Distribution Chart Data
  const distributionData = [
    { name: 'Top 1', value: metrics.top1, color: '#10B981' },
    { name: 'Top 2-3', value: metrics.top3 - metrics.top1, color: '#3B82F6' },
    { name: 'Top 4-5', value: metrics.top5 - metrics.top3, color: '#6366F1' },
    { name: 'Top 6-10', value: metrics.top10 - metrics.top5, color: '#8B5CF6' },
    { name: 'Unranked', value: metrics.unranked, color: '#94A3B8' },
  ];

  // Historical Average Position
  const trendData = useMemo(() => {
    return [...history].reverse().map(h => {
      const rankings = h.promptRankings || [];
      const filtered = selectedEngine === 'all' ? rankings : rankings.filter(r => r.engine === selectedEngine);
      const rankedCount = filtered.filter(r => r.found && r.rank > 0).length;
      const avgPos = rankedCount > 0 
        ? Math.round((filtered.filter(r => r.found && r.rank > 0).reduce((a, b) => a + b.rank, 0) / rankedCount) * 10) / 10
        : 50; // Default or max rank for unranked

      const d = new Date(h.date);
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return {
        date: `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${timeStr}`,
        avgPos,
        visibility: h.overallScore || 0
      };
    });
  }, [history, selectedEngine]);

  if (loading || !project) return (
    <div className="flex flex-col items-center justify-center py-40">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Ranking Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/30 pb-20">
      {/* Institutional Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/dashboard/projects/${projectId}`)}
              className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Professional Rankings</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{project?.domain}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Engine Filter */}
             <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
               <Zap className="w-3.5 h-3.5 text-blue-600" />
               <select 
                 value={selectedEngine}
                 onChange={(e) => setSelectedEngine(e.target.value)}
                 className="bg-transparent text-[11px] font-black text-slate-700 outline-none cursor-pointer uppercase tracking-wider"
               >
                 <option value="all">Global AI Index</option>
                 <option value="openai">OpenAI Intelligence</option>
                 <option value="gemini">Google Gemini</option>
                 {/* <option value="groq">Groq / Llama 3</option> */}
               </select>
             </div>

             <div className="h-4 w-px bg-slate-200 mx-2" />
             
             {/* Date Range Selector (Static for UI) */}
             <div className="flex bg-white border border-slate-200 rounded-xl p-1">
               {['Current', '7D', '1M', '3M', '1Y'].map(range => (
                 <button 
                   key={range}
                   onClick={() => setActiveRange(range)}
                   className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${activeRange === range ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                   {range}
                 </button>
               ))}
             </div>

             <div className="h-4 w-px bg-slate-200 mx-2" />

             <button 
               onClick={() => downloadPDF('rankings-content', `${project?.name}_Rankings_Report.pdf`)}
               className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-sm cursor-pointer"
             >
               <FileDown className="w-3.5 h-3.5" />
               Export PDF
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 pt-8 space-y-8" id="rankings-content">
        <AnimatePresence>
          {project?.isScanning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
              data-html2canvas-ignore
            >
              <div className="bg-blue-600/5 border-y border-blue-100/50 py-3 px-4 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-lg p-1.5 animate-pulse shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-tight leading-none">Comprehensive Intelligence Scan</h4>
                    <p className="text-[9px] text-blue-600/70 font-bold uppercase tracking-widest mt-1">Recalculating AI Engine Indices & Search Visibility (30-60s) • Live sync active</p>
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-white/80 rounded-lg border border-blue-100/50 backdrop-blur-sm">
                    <Loader2 className="w-2.5 h-2.5 text-blue-600 animate-spin" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Processing Rankings</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* KPI Grid - SEO Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KPICard title="Total Keywords" value={metrics.total} color="slate" />
          <KPICard title="Top 1" value={metrics.top1} delta={metrics.deltas.top1} color="emerald" />
          <KPICard title="Top 3" value={metrics.top3} delta={metrics.deltas.top3} color="blue" />
          <KPICard title="Top 5" value={metrics.top5} delta={metrics.deltas.top5} color="indigo" />
          <KPICard title="Top 10" value={metrics.top10} delta={metrics.deltas.top10} color="violet" />
          <KPICard title="Unranked" value={metrics.unranked} color="slate" isNegative />
          <KPICard title="Visibility" value={`${trendData[trendData.length-1]?.visibility}%`} color="blue" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Trend Line */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Average Position Trend</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Weighted rank across all active prompts</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Average Rank</span>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    reversed
                    domain={[1, 'auto']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="avgPos" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#posGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribution Bar Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6">Position Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                    width={70}
                  />
                  <Tooltip cursor={{fill: 'transparent'}} content={<DistributionTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Top 10 Rate</p>
                <div className="text-lg font-black text-slate-900">
                  {Math.round((metrics.top10 / metrics.total) * 100)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Ranked Ratio</p>
                <div className="text-lg font-black text-slate-900">
                  {Math.round(((metrics.total - metrics.unranked) / metrics.total) * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Rankings Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Keyword Ranking Performance</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Full breakdown of prompt visibility and citations</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Filter keywords..."
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-64"
                  />
               </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">PROMPT / KEYWORD</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CURRENT RANK</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">TREND</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">CITATIONS</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">AI REACH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project?.prompts?.map((prompt, idx) => {
                  const allEngResults = lastSnapshot?.promptRankings?.filter(r => r.prompt === prompt) || [];
                  const res = selectedEngine === 'all' 
                    ? allEngResults.sort((a, b) => (a.rank || 99) - (b.rank || 99))[0] // Get best rank
                    : allEngResults.find(r => r.engine === selectedEngine);
                  
                  const prevAllEngResults = prevSnapshot?.promptRankings?.filter(r => r.prompt === prompt) || [];
                  const prevRes = selectedEngine === 'all'
                    ? prevAllEngResults.sort((a, b) => (a.rank || 99) - (b.rank || 99))[0]
                    : prevAllEngResults.find(r => r.engine === selectedEngine);
                  
                  const rank = res?.found ? res.rank : '-';
                  const prevRank = prevRes?.found ? prevRes.rank : null;
                  const delta = (rank !== '-' && prevRank !== null) ? prevRank - rank : (rank !== '-' && prevRank === null ? 'NEW' : 0);

                  const isFound = selectedEngine === 'all' ? allEngResults.some(r => r.found) : res?.found;
                  const displayRank = selectedEngine === 'all' ? (res?.found && res.rank > 0 ? res.rank : '-') : (rank > 0 ? rank : '-');
                  const reachVal = isFound ? (displayRank !== '-' ? Math.max(30, 100 - displayRank * 5) : 30) : 0;

                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                        className={`hover:bg-slate-50/50 transition-all cursor-pointer ${expandedRow === idx ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[400px]" title={prompt}>{prompt}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                                {selectedEngine === 'all' ? `${allEngResults.filter(r => r.found).length} / 3 Engines` : res?.engine}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div 
                            title={displayRank === '-' ? (res?.score > 0 ? "Has Content (Unranked: Did not appear in top organic AI results)" : "Brand not found in top organic AI results or targeted fallback.") : ""}
                            className={`text-sm font-black inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all ${displayRank === 1 ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : displayRank <= 3 ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : displayRank === '-' ? (res?.score > 0 ? 'bg-amber-50/50 text-amber-500 border border-amber-100' : 'text-slate-300') : 'bg-slate-100 text-slate-600'}`}>
                            {displayRank}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center">
                            {delta === 'NEW' ? (
                              <div className="flex items-center gap-1 text-blue-600 font-black text-[10px] bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-tight border border-blue-100">
                                New
                              </div>
                            ) : delta > 0 ? (
                              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-lg">
                                <TrendingUp className="w-3 h-3" />
                                +{delta}
                              </div>
                            ) : delta < 0 ? (
                              <div className="flex items-center gap-1 text-rose-600 font-bold text-xs bg-rose-50 px-2 py-1 rounded-lg">
                                <TrendingDown className="w-3 h-3" />
                                {delta === -99 ? 'LOST' : delta}
                              </div>
                            ) : (
                              <Minus className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center">
                            {selectedEngine === 'all' ? (
                              (() => {
                                const hasLink = allEngResults.some(r => r.linkFound);
                                const hasMention = allEngResults.some(r => r.found);
                                if (hasLink) return <div className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-tight">Cited Source</div>;
                                if (hasMention) return <div className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black border border-slate-100 uppercase tracking-tight">Mention Only</div>;
                                return <div className="text-slate-300 text-[10px] font-bold">No Reference</div>;
                              })()
                            ) : (
                              (() => {
                                if (res?.linkFound) return <div className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-tight">Cited Source</div>;
                                if (res?.found) return <div className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black border border-slate-100 uppercase tracking-tight">Mention Only</div>;
                                return <div className="text-slate-300 text-[10px] font-bold">No Reference</div>;
                              })()
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <div className="text-xs font-black text-slate-900">{reachVal}%</div>
                           <div className="h-1 w-12 bg-slate-100 rounded-full mx-auto mt-1.5 overflow-hidden">
                             <div className={`h-full ${reachVal > 0 ? 'bg-slate-900' : 'bg-transparent'}`} style={{ width: `${reachVal}%` }} />
                           </div>
                        </td>
                      </tr>

                      {expandedRow === idx && (
                        <tr className="bg-slate-50/80 border-none">
                          <td colSpan={5} className="p-0">
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="overflow-hidden"
                            >
                              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200/50">
                                <div className="lg:col-span-2 space-y-6">
                                   <div className="flex items-center gap-2 text-slate-900">
                                     <Activity className="w-4 h-4 text-blue-600" />
                                     <h4 className="text-[11px] font-black uppercase tracking-widest">Engine Intelligence</h4>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      {['openai', 'gemini'/*, 'groq'*/].filter(e => selectedEngine === 'all' || e === selectedEngine).map(eng => {
                                        const engRes = allEngResults.find(r => r.engine === eng);
                                        const brandName = project?.brandName || project?.name || '';
                                        const isFound = engRes?.found || engRes?.rank > 0;

                                        return (
                                          <div key={eng} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{eng}</span>
                                              <div 
                                                title={!isFound && engRes?.score > 0 ? "Has Content (Unranked: Did not appear in top organic AI results)" : ""}
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all ${isFound ? 'bg-emerald-50 text-emerald-600' : (!isFound && engRes?.score > 0) ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}
                                              >
                                                {isFound ? (engRes?.rank > 0 ? `RANK #${engRes.rank}` : 'MENTIONED') : (!isFound && engRes?.score > 0 ? 'CONTENT FOUND (UNRANKED)' : 'UNRANKED')}
                                              </div>
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                              "{engRes?.snippet || 'No engine response recorded for this specific parameter set.'}"
                                            </p>
                                          </div>
                                        );
                                      })}
                                   </div>
                                </div>
                                <div className="space-y-6">
                                   <div className="flex items-center gap-2 text-slate-900">
                                     <Globe className="w-4 h-4 text-blue-600" />
                                     <h4 className="text-[11px] font-black uppercase tracking-widest">Grounding Citations</h4>
                                   </div>
                                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                      {allEngResults.some(r => {
                                        return r.linkFound || r.found;
                                      }) ? (
                                        (() => {
                                          // Collect valid citation URLs ONLY from engines that ACTUALLY found the brand
                                          const citUrls = allEngResults.filter(r => r.found || r.linkFound).flatMap(r => (r.citations || []).filter(isValidUrl).map(url => ({ url, engine: r.engine })));
                                          // If brand was found and we have the project's domain, add it as the first link
                                          const domainUrl = project?.domain ? `https://${project.domain.replace(/^https?:\/\//, '')}` : null;
                                          const hasDomainAlready = citUrls.some(c => c.url.includes(project?.domain?.replace(/^https?:\/\/(www\.)?/, '')));
                                          
                                          const brandName = project?.brandName || project?.name || '';
                                          const brandFound = allEngResults.some(r => r.found || r.linkFound);

                                           const allCits = [];
                                           if (brandFound && domainUrl && !hasDomainAlready) {
                                             allCits.push({ url: domainUrl, engine: 'brand' });
                                           }
                                           // De-duplicate citUrls by their host/domain to avoid repeating the same site multi-times
                                           const seenUrls = new Set();
                                           if (domainUrl) seenUrls.add(domainUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase());
                                           
                                           citUrls.forEach(cit => {
                                             const normalized = cit.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
                                             if (!seenUrls.has(normalized)) {
                                               seenUrls.add(normalized);
                                               allCits.push(cit);
                                             }
                                           });


                                           return allCits
                                             .map(cit => ({ ...cit, fixedUrl: fixAIUrl(cit.url) }))
                                             .filter(item => item.fixedUrl !== null)
                                             .slice(0, 6)
                                             .map((item, i) => {
                                               const url = item.fixedUrl;
                                               const domain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                                               return (
                                                 <a 
                                                   key={i} 
                                                   href={url} 
                                                   target="_blank" 
                                                   rel="noopener noreferrer"
                                                   className="flex items-center gap-3 group p-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                                                 >
                                                   <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                     <LinkIcon className="w-3.5 h-3.5" />
                                                   </div>
                                                     <div className="min-w-0">
                                                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{item.engine === 'brand' ? 'Verified' : item.engine} Source</p>
                                                       <p className="text-[11px] font-bold text-slate-700 truncate">
                                                         {(() => {
                                                           const projDomain = project?.domain?.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                                                           if (projDomain && domain.includes(projDomain)) return projDomain;
                                                           return domain;
                                                         })()}
                                                       </p>
                                                     </div>
                                                 </a>
                                               );
                                             });
                                        })()
                                      ) : (
                                        <div className="py-10 text-center">
                                          <Info className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Direct Citations Found</p>
                                        </div>
                                      )}
                                   </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, delta, color, isNegative }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all hover:scale-[1.02]">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{title}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-black text-slate-900">{value}</span>
          {delta !== undefined && delta !== 0 && (
            <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
              (delta > 0 && !isNegative) || (delta < 0 && isNegative) 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-rose-50 text-rose-600'
            }`}>
              {delta > 0 ? '+' : ''}{delta}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <p className="text-xs font-black text-white">Avg. Rank: {payload[0].value}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-xs font-black text-white">Visibility: {payload[0].payload.visibility}%</p>
        </div>
      </div>
    );
  }
  return null;
};

const DistributionTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-2 px-3 rounded-lg shadow-2xl">
        <p className="text-[10px] font-black text-white uppercase tracking-widest">{payload[0].payload.name}: {payload[0].value} Keywords</p>
      </div>
    );
  }
  return null;
};

export default Rankings;
