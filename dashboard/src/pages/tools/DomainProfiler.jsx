import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Globe, Sparkles, ArrowLeft, FileText, ExternalLink, Search, TrendingUp, Tag, Target, Terminal, FileDown, AlertTriangle, CheckCircle2, Layout, Zap, Eye, RefreshCw} from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../context/ProjectContext';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { downloadPDF } from '../../utils/downloadPDF';

const DomainProfiler = () => {
  const { projectId } = useParams();
  const { user, updateUser } = useAuth();
  const { project: contextProject, history: contextHistory, loading: projectLoading } = useProject();
  
  const [url, setUrl] = useState('');
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('home'); // 'home' | 'report'
  const [syncLoading, setSyncLoading] = useState(!!projectId);

  const project = contextProject;
  const setProject = () => {};
  const setProjectMode = () => {};

  const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const totalScans = user?.subscription?.tier === 'professional' ? 20 : (user?.subscription?.tier === 'growth' ? 15 : 10);
  const remaining = totalScans - scansUsed;
  const isLimitReached = remaining <= 0 || user?.subscription?.status === 'expired';
  const percentage = (scansUsed / totalScans) * 100;

  // Fetch previous reports on mount OR project data
  useEffect(() => {
    if (projectId) {
      if (contextHistory.length > 0) {
        const latest = contextHistory[0];
        if (latest.domainSynthesis) {
          setResults(latest.domainSynthesis);
          setView('report');
        }
      }
      setSyncLoading(false);
    } else if (!projectId) {
      const fetchReports = async () => {
        try {
          const res = await api.get('/profiler/reports');
          setReports(res.data);
        } catch (err) {
          console.error('Failed to fetch reports:', err);
        }
      };
      fetchReports();
    }
  }, [projectId, contextHistory, results === null]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!input) return;

    if (user?.subscription?.status === 'expired' || remaining <= 0) {
      toast.error(remaining <= 0 
        ? 'Monthly scan limit reached. Please upgrade your plan for more scans.'
        : 'Your free trial has expired. Please upgrade your plan.');
      window.location.href = '/dashboard/pricing';
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading('Analysing domain... this may take up to 30 seconds', {
      icon: '🔍',
    });

    try {
      const res = await api.post('/profiler/analyze', { domain: input });
      setResults(res.data);
      setView('report');
      toast.success('Analysis completed successfully!', { id: toastId, icon: '✅' });

      // Refresh reports list
      const reportsRes = await api.get('/profiler/reports');
      setReports(reportsRes.data);

      if (user && user.subscription) {
        updateUser({
          ...user,
          subscription: {
            ...user.subscription,
            promptsUsedThisMonth: (user.subscription.promptsUsedThisMonth || 0) + 1,
            ...(user.subscription.status === 'trialing' && { 
                trialScansUsedToday: (user.subscription.trialScansUsedToday || 0) + 1 
            })
          }
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed. Please try again.', { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const viewReport = (report) => {
    setResults(report);
    setView('report');
  };

  const goBack = () => {
    setView('home');
    setResults(null);
    setInput('');
  };

  const filteredReports = reports.filter(r =>
    r.domain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.domainType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.brandType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatFullDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) + ' at ' + new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ─── REPORT VIEW ────────────────────────────────────────────
  if (view === 'report' && results) {
    const topicCount = results.topics?.length || 0;
    const tagCount = results.presenceTags?.length || 0;
    
    return (
      <div className="max-w-6xl mx-auto" id="report-content">
        <AnimatePresence>
          {isLimitReached && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden pt-6"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
                    <Zap className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight">Scan Limit Reached</h4>
                    <p className="text-sm text-amber-50/80 font-medium whitespace-nowrap">You have used {scansUsed}/{totalScans} monthly scans. Upgrade to Growth or Professional to continue monitoring.</p>
                  </div>
                </div>
                <button 
                  onClick={() => window.location.href = '/dashboard/pricing'}
                  className="bg-white text-orange-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-50 transition-all shadow-lg hover:scale-105 active:scale-95 shrink-0 relative z-10"
                >
                  Upgrade Plan ✦
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6" data-html2canvas-ignore>
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
          <span>›</span>
          {projectId ? (
            <>
              <Link to={`/dashboard/projects/${projectId}`} className="hover:text-gray-600 transition-colors">Project Overview</Link>
              <span>›</span>
            </>
          ) : (
            <>
              <span className="text-gray-400">AI Module</span>
              <span>›</span>
            </>
          )}
          <button onClick={goBack} className="hover:text-gray-600 transition-colors">
            {projectId ? 'Domain Assessment' : 'Domain Audit'}
          </button>
          <span>›</span>
          <span className="text-gray-600 font-medium">Report</span>
        </div>

        {/* Report Header */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <h1 className="text-2xl font-bold mb-3 flex items-center gap-3">
                Domain Intelligence Report
                {projectId && (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                    Project Synced
                  </span>
                )}
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Institutional-grade analysis for <strong>{results.domain || input}</strong>. 
                {projectId && " This data is synchronized with your latest project-wide comprehensive scan."} 
                Dissects brand architecture, audience alignment, and AI perceptual mapping.
              </p>
              <div className="flex items-center gap-3" data-html2canvas-ignore>
                <button 
                  onClick={() => downloadPDF('report-content', 'Domain_Profiler_Report.pdf')}
                  className="flex items-center gap-2 bg-white text-[#1a202c] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Export PDF Profile
                </button>
                {!projectId && (
                  <button 
                    onClick={goBack}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors border border-white/5"
                  >
                    <ArrowLeft className="w-4 h-4" /> New Audit
                  </button>
                )}
              </div>
            </div>

            {/* Profile Status Box */}
            <div className="text-center shrink-0">
               <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex flex-col items-center justify-center">
                  <Layout className="w-8 h-8 text-blue-400 mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-blue-300">Profile Verified</span>
                  <span className="text-[9px] text-gray-400">{results.createdAt ? formatDate(results.createdAt) : 'LIVE'}</span>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Brand Focus Banner */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.1 }}
           className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-start gap-3"
        >
           <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
           <p className="text-sm text-blue-700">
             <strong>Strategic Alignment:</strong> Your brand is perceived as a <u>{results.brandFocus || 'Digital Entry'}</u>. This focus suggests a high potential for <u>{results.brandType}</u> market penetration.
           </p>
        </motion.div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
             className="bg-green-50 border border-green-100 rounded-xl p-5">
             <p className="text-xs font-semibold text-green-600 uppercase mb-1">Architecture</p>
             <div className="flex items-center justify-between">
               <span className="text-lg font-bold text-[#1E293B]">{results.domainType || 'N/A'}</span>
               <Layout className="w-5 h-5 text-green-500" />
             </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
             className="bg-blue-50 border border-blue-100 rounded-xl p-5">
             <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Audience Model</p>
             <div className="flex items-center justify-between">
               <span className="text-lg font-bold text-[#1E293B]">{results.brandType || 'N/A'}</span>
               <Target className="w-5 h-5 text-blue-500" />
             </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
             className="bg-purple-50 border border-purple-100 rounded-xl p-5">
             <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Semantic Depth</p>
             <div className="flex items-center justify-between">
               <span className="text-lg font-bold text-[#1E293B]">{topicCount} Topics</span>
               <Sparkles className="w-5 h-5 text-purple-500" />
             </div>
           </motion.div>
        </div>

        <div className="space-y-6">
           {/* Section: Perception & Mission */}
           <motion.div 
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
             className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm"
           >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Eye className="w-5 h-5 text-blue-600" />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-[#1E293B]">AI Domain Synthesis</h3>
                          <p className="text-xs text-gray-400">Automated perception of market positioning</p>
                       </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                       <p className="text-sm text-gray-600 leading-relaxed">
                         "{results.description || results.coreOffering || 'No automated synthesis available for this node.'}"
                       </p>
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold text-[#1E293B]">Brand Sentiment</h3>
                          <p className="text-xs text-gray-400">Public and algorithmic brand perception</p>
                       </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed p-2">
                       {results.sentiment || 'Sentiment analysis indicates a neutral market footprint.'}
                    </p>
                 </div>
              </div>
           </motion.div>

           {/* Section: Core Offering (The "Value Hypothesis") */}
           <motion.div 
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
             className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm"
           >
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-[#1E293B]">Primary Value Hypothesis</h3>
                    <p className="text-xs text-gray-400">Core market differentiator identified by AI engines</p>
                 </div>
              </div>
              <div className="p-2 border-l-4 border-purple-500 ml-2">
                 <p className="text-[#1E293B] font-bold text-xl leading-snug">
                    {results.coreOffering || results.description}
                 </p>
              </div>
           </motion.div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left/Center: Topics & Competitors */}
              <div className="lg:col-span-2 space-y-6">
                 {/* Topic Footprint */}
                 <div className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Tag className="w-4 h-4 text-blue-500" /> Topic Footprint
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {results.topics?.map((topic, i) => (
                          <span key={i} className="bg-blue-50/50 border border-blue-100/50 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 shadow-sm transition-all hover:bg-white">
                             {topic}
                          </span>
                       ))}
                    </div>
                 </div>

                 {/* Presence Tags */}
                 <div className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Layout className="w-4 h-4 text-green-500" /> Brand presence Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {results.presenceTags?.length > 0 ? results.presenceTags.map((tag, i) => (
                          <span key={i} className="bg-green-50/50 border border-green-100/50 px-4 py-2 rounded-xl text-xs font-bold text-green-700 shadow-sm transition-all hover:bg-white">
                             {tag}
                          </span>
                       )) : (
                          <p className="text-xs text-gray-400 italic">No presence tags identified for this profile.</p>
                       )}
                    </div>
                 </div>

                 {/* Prompt Cloud */}
                 <div className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Globe className="w-4 h-4 text-purple-500" /> Machine-Perceived Prompts
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {results.prompts?.map((kw, i) => (
                          <span key={i} className="bg-purple-50/50 border border-purple-100/50 px-4 py-2 rounded-xl text-xs font-bold text-purple-700 shadow-sm transition-all hover:bg-white">
                             {kw}
                          </span>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Right: Competitive Landscape & Source */}
              <div className="space-y-8">
                 {/* Competitive Snapshot */}
                 <div className="bg-white border border-gray-200/60 p-6 rounded-2xl shadow-sm">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 block px-1">Competitive Landscape</h4>
                    <div className="space-y-4">
                       {results.competitors?.map((comp, i) => (
                          <div key={i} className="flex gap-4 group bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-white transition-all">
                             <div className="w-5 h-5 rounded-lg bg-red-500 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_4px_rgba(239,68,68,0.2)]">
                                <Target className="w-3 h-3 text-white" />
                             </div>
                             <p className="text-xs font-bold text-gray-600 leading-tight">{comp}</p>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Strategic Next Step */}
                 <div className="bg-[#1a202c] p-8 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                    <h4 className="text-[11px] font-black mb-6 text-gray-400 uppercase tracking-widest flex items-center gap-2 relative z-10">
                       <Terminal className="w-3.5 h-3.5 text-blue-400" /> Intelligence Suggestion
                    </h4>
                    <div className="relative z-10">
                       <p className="text-xs text-gray-300 font-bold leading-relaxed mb-6">
                          Run the <u>AI Readiness Audit</u> next to see exactly how your technical signals align with these brand topics.
                       </p>
                       <Link to="/dashboard/readiness" className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/40">
                          Upgrade to Full Audit
                       </Link>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }


  // ─── SYNC LOADING VIEW ──────────────────────────────────────
  if (projectId && (syncLoading || projectLoading) && !results) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 relative">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-3xl animate-ping opacity-20" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2 text-center">Synchronizing Intelligence</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] text-center">Syncing live nodes for your project...</p>
      </div>
    );
  }

  // ─── HOME VIEW (Input + Previous Reports) ──────────────────
  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6">
        <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
        <span>›</span>
        <span className="text-gray-400">AI Module</span>
        <span>›</span>
        <span className="text-gray-600 font-medium">Domain Profiler</span>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a202c] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden mb-8"
      >
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">
                <Globe className="w-3 h-3" /> Institutional Domain Intelligence
              </div>
              <h1 className="text-2xl font-black mb-2 tracking-tight leading-none">
                {projectId ? `Project Focus: ${project?.name}` : 'Domain Profiler'}
              </h1>
              <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-2xl">
                {projectId ? `Deep-scanning architectural fingerprint for ${project?.domain}.` : 'Analyze any domain\'s architectural fingerprint, audience alignment, and AI perceptual mapping in seconds.'}
              </p>
            </div>

            {/* Gauge */}
            {!projectId && (
              <div className="shrink-0 text-center">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#2d3748" strokeWidth="6" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - (percentage || 0) / 100)}`}
                      strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-blue-400 leading-none">{scansUsed}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">OF {totalScans}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!projectId ? (
            <form onSubmit={handleAnalyze} className="mt-5 relative group max-w-4xl">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter domain (e.g., example.com)..."
                className="block w-full pl-14 pr-40 py-5 bg-[#2d3748] border-2 border-transparent focus:border-blue-500 text-white placeholder-gray-500 rounded-2xl leading-5 focus:outline-none transition-all text-lg font-medium shadow-2xl"
              />
              <div className="absolute inset-y-2.5 right-2.5">
                <button
                  type="submit"
                  disabled={isAnalyzing || !input || isLimitReached}
                  className="inline-flex items-center px-8 py-3.5 border border-transparent text-sm font-black rounded-xl text-slate-900 bg-white hover:bg-gray-100 focus:outline-none transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? 'Profiling...' : 'Generate Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className={`mt-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${!syncLoading && 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-blue-500/20 ${syncLoading ? 'bg-blue-500/20' : 'bg-slate-200'}`}>
                  {syncLoading ? (
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : (
                    <Globe className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-widest ${syncLoading ? 'text-blue-100' : 'text-slate-400'}`}>
                    {syncLoading ? 'Synchronizing Intelligence' : 'No Domain Data'}
                  </h4>
                  <p className={`text-xs font-medium tracking-tight ${syncLoading ? 'text-blue-300' : 'text-slate-500'}`}>
                    {syncLoading 
                      ? `Syncing live nodes for ${project?.domain || 'project'}...`
                      : `No architectural data found for ${project?.domain} yet.`}
                  </p>
                </div>
              </div>
              {syncLoading ? (
                <div className="px-4 py-2 bg-blue-500/20 rounded-lg text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] animate-pulse">
                   Syncing...
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <span className="px-4 py-1.5 bg-slate-900/10 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    Awaiting Project Sync
                  </span>
                  <p className="text-[9px] text-slate-400 font-bold">Trigger scan from dashboard</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Recent Analysis (Hide if in project context) */}
        {!projectId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2 lg:col-span-3 mb-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Profiles</h2>
            </div>
            
            {reports.slice(0, 6).map((report, idx) => (
              <div 
                key={idx} 
                onClick={() => { setResults(report); setView('report'); }}
                className="bg-white border border-slate-200 p-6 rounded-2xl hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <FileText className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1 truncate">{report.domain}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {report.domainType} • {new Date(report.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            
            {reports.length === 0 && (
              <div className="md:col-span-2 lg:col-span-3 py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Globe className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">No previous profiles found</p>
              </div>
            )}
          </motion.div>
        )}

      {/* Previous Reports */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-gray-200/60 rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#1E293B]">
            Previous Reports {reports.length > 0 && `(${reports.length})`}
          </h3>
          {reports.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by domain or type..."
                className="bg-[#F8F9FB] border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all w-64"
              />
            </div>
          )}
        </div>

        {reports.length === 0 ? (
          <p className="text-green-600 text-sm font-medium">No reports yet. Run your first analysis above!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Domain</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Domain Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="text-blue-600 text-sm font-medium">{report.domain}</span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{report.domainType || '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{report.brandType || '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{formatDate(report.createdAt)}</td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => viewReport(report)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        title="View Report"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DomainProfiler;
