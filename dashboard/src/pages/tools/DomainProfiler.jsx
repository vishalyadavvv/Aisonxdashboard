import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Globe, Sparkles, ArrowLeft, FileText, ExternalLink, Search, TrendingUp, Tag, Target, Terminal, FileDown, AlertTriangle, CheckCircle2, Layout, Zap, Eye} from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { downloadPDF } from '../../utils/downloadPDF';

const DomainProfiler = () => {
  const { user, updateUser } = useAuth();
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('home'); // 'home' | 'report'

  const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const totalScans = user?.subscription?.tier === 'professional' ? 20 : (user?.subscription?.tier === 'growth' ? 15 : 10);
  const remaining = totalScans - scansUsed;
  const isLimitReached = remaining <= 0 || user?.subscription?.status === 'expired';
  const percentage = (scansUsed / totalScans) * 100;

  // Fetch previous reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/profiler/reports');
        setReports(res.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      }
    };
    fetchReports();
  }, []);

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
          <span className="text-gray-400">Audit Tools</span>
          <span>›</span>
          <button onClick={goBack} className="hover:text-gray-600 transition-colors">Domain Audit</button>
          <span>›</span>
          <span className="text-gray-600 font-medium">Report</span>
        </div>

        {/* Report Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <h1 className="text-2xl font-bold mb-3">Domain Intelligence Report</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Institutional-grade analysis for <strong>{results.domain || input}</strong>. This profile dissects brand architecture, audience alignment, and AI perceptual mapping.
              </p>
              <div className="flex items-center gap-3" data-html2canvas-ignore>
                <button 
                  onClick={() => downloadPDF('report-content', 'Domain_Profiler_Report.pdf')}
                  className="flex items-center gap-2 bg-white text-[#1a202c] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Export PDF Profile
                </button>
                <button 
                  onClick={goBack}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors border border-white/5"
                >
                  <ArrowLeft className="w-4 h-4" /> New Audit
                </button>
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


  // ─── HOME VIEW (Input + Previous Reports) ──────────────────
  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
        <span>›</span>
        <span className="text-gray-400">Audit Tools</span>
        <span>›</span>
        <span className="text-gray-600 font-medium">Domain Audit</span>
      </div>

      {/* Dark Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Domain Profiler</h1>
            <p className="text-gray-400 text-sm">Analyze how AI models perceive your brand and discover visibility opportunities</p>
          </div>

          {/* Circular Progress */}
          <div className="text-center shrink-0">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#2d3748" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke="#48bb78" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-green-400">{scansUsed}</span>
                <span className="text-[10px] text-gray-400">of {totalScans} used</span>
              </div>
            </div>
            <span className="inline-block mt-2 text-[10px] font-semibold bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
              {remaining} scans remaining
            </span>
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleAnalyze} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="example.com or https://example.com"
            disabled={isAnalyzing}
            className="flex-1 bg-[#2d3748] border border-white/10 rounded-xl py-3.5 px-5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAnalyzing || !input}
            className="bg-white text-[#1a202c] hover:bg-gray-100 px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </motion.div>

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
