import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Search, Loader2, Globe, Sparkles, AlertCircle, ArrowLeft, Terminal, FileText, ExternalLink, Target, Eye, Tag, CheckCircle2, FileDown, AlertTriangle, ChevronDown, RefreshCw, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../context/ProjectContext';
import { downloadPDF } from '../../utils/downloadPDF';
import WebSearchReport from '../../components/reports/WebSearchReport';

const WebSearch = () => {
  const { projectId } = useParams();
  const { user, updateUser } = useAuth();
  const { project: contextProject, history: contextHistory, loading: projectLoading } = useProject();

  const [input, setInput] = useState('');
  const [results, setResults] = useState(null);
  const [modelResults, setModelResults] = useState({});
  const [activeModel, setActiveModel] = useState(null);
  const [syncLoading, setSyncLoading] = useState(!!projectId);
  const eventSourceRef = useRef(null);

  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter(r => 
    (r.brandName || r.domain || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // These are now derived from ProjectContext or are dummy functions
  const project = contextProject;
  const setProject = () => {}; 
  const setProjectMode = () => {}; 

  const [progress, setProgress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const totalScans = user?.subscription?.tier === 'professional' ? 20 : (user?.subscription?.tier === 'growth' ? 15 : 10);
  const remaining = totalScans - scansUsed;
  const isLimitReached = remaining <= 0 || user?.subscription?.status === 'expired';
  const percentage = (scansUsed / totalScans) * 100;

  useEffect(() => {
    if (projectId) {
      if (contextHistory.length > 0) {
        const latest = contextHistory[0];
        if (latest.webMentions) {
          const raw = latest.webMentions.rawResults || {};
          const profile = latest.webMentions.profile || {};
          const fullResults = {
            ...raw,
            profile: profile,
            score: latest.webMentions.score || profile.visibilityScore || 0
          };
          setResults(fullResults);
          const mk = {
            ChatGPT: raw.chatgpt || raw.openai || raw.ChatGPT,
            Gemini: raw.gemini || raw.Gemini,
            // Groq: raw.groq || raw.Groq
          };
          const filteredMk = {};
          Object.entries(mk).forEach(([k, v]) => {
            if (v) filteredMk[k] = v;
          });
          setModelResults(filteredMk);
          const firstAvailable = Object.keys(filteredMk)[0];
          if (firstAvailable) setActiveModel(firstAvailable);
        }
      }
      setSyncLoading(false);
    } else if (!projectId) {
      const fetchReports = async () => {
        try {
          const res = await api.get('/websearch/reports');
          setReports(res.data);
        } catch (err) {
          console.error('Failed to fetch reports:', err);
        }
      };
      fetchReports();
    }
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, [projectId, contextHistory, user]);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!input || isAnalyzing) return;

    if (user?.subscription?.status === 'expired' || isLimitReached) {
      toast.error(remaining <= 0 
        ? 'Monthly scan limit reached. Please upgrade your plan for more scans.'
        : 'Your free trial has expired. Please upgrade your plan.');
      window.location.href = '/dashboard/pricing';
      return;
    }

    setResults(null);
    setModelResults({});
    setActiveModel(null);
    setIsAnalyzing(true);
    setProgress('Initializing live node...');

    const toastId = toast.loading('Connecting to live web nodes...', { icon: '🌐' });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/websearch/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ brandName: input })
      });

      if (!response.ok) throw new Error(`Failed to start scan: ${response.statusText}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace(/^data: /, '').trim();
              if (!jsonStr) continue;
              const data = JSON.parse(jsonStr);

              switch (data.type) {
                case 'progress':
                  setProgress(data.message);
                  break;
                case 'model_result':
                  setModelResults(prev => ({ 
                    ...prev, 
                    [data.modelId === 'chatgpt' ? 'ChatGPT' : data.modelId === 'gemini' ? 'Gemini' : 'ChatGPT']: data.result 
                  }));
                  break;
                case 'profile_result':
                  setResults(prev => ({ ...prev, profile: data.data }));
                  break;
                case 'result':
                  setResults(data.data);
                  toast.success('Live analysis complete!', { id: toastId });
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
                  break;
                case 'error':
                  toast.error(data.message, { id: toastId });
                  setIsAnalyzing(false);
                  break;
              }
            } catch (e) {
              console.error('Error parsing SSE part:', e);
            }
          }
        }
      }

      // Final refresh of reports list
      const reportsRes = await api.get('/websearch/reports');
      setReports(reportsRes.data);
      setIsAnalyzing(false);

    } catch (error) {
      console.error('Web Search Error:', error);
      toast.error(error.message || 'Analysis failed.', { id: toastId });
      setIsAnalyzing(false);
    }
  };

  const viewReport = (report) => {
    // WebsearchReport stores data in results: { profile, openai, etc }
    // ReadinessReport stores data directly on the object
    const data = report.results || report;
    setResults(data);
    
    // Synchronize individual model outcomes for snapshots
    setModelResults({
      ChatGPT: data.openai,
      Gemini: data.gemini,
      // Groq: data.groq
    });

    setActiveModel(null);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleExportPDF = async (name) => {
    setIsExporting(true);
    const toastId = toast.loading('Generating high-quality PDF report...');
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await downloadPDF('web-search-pdf-template', `Web_Visibility_Report_${name}`);
      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

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

  // ─── HOME VIEW ─────────────────────────────────────────────
  if (!results) {
    return (
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6">
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors border-b border-transparent hover:border-gray-200">Dashboard</Link>
          <span className="opacity-40">/</span>
          <span className="text-gray-400 font-medium">AI Module</span>
          <span className="opacity-40">/</span>
          <span className="text-gray-600 font-bold bg-gray-100 px-2 py-0.5 rounded-md">Web Visibility</span>
        </div>
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
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#1a202c] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden mb-8"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3" /> Live Brand Intelligence
            </div>
            <h1 className="text-2xl font-black mb-2 tracking-tight leading-none">
              {projectId ? `Project Scan: ${project?.name}` : 'Web Search Audit'}
            </h1>
            <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-2xl">
              {projectId ? `Crawling live LLM nodes for real-time visibility and mentions of ${project?.brandName}.` : 'Conduct a deep-scan across major LLMs to understand how your brand is perceived and cited.'}
            </p>
          </div>

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
              <Globe className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter Brand Name (e.g., Treecampus)..."
              className="block w-full pl-14 pr-40 py-5 bg-[#2d3748] border-2 border-transparent focus:border-blue-500 text-white placeholder-gray-500 rounded-2xl leading-5 focus:outline-none transition-all text-lg font-medium shadow-2xl"
            />
            <div className="absolute inset-y-2.5 right-2.5">
              <button
                type="submit"
                disabled={isAnalyzing || !input || isLimitReached}
                className="inline-flex items-center px-8 py-3.5 border border-transparent text-sm font-black rounded-xl text-slate-900 bg-white hover:bg-gray-100 focus:outline-none transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? 'Searching...' : 'Search Brand'}
              </button>
            </div>
          </form>
          ) : (
            <div className={`mt-5 transition-all duration-500 overflow-hidden ${!syncLoading ? 'bg-amber-50 border-amber-200 shadow-amber-100 shadow-md' : 'bg-blue-500/10 border-blue-500/30'} border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6`}>
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${syncLoading ? 'bg-blue-500/20' : 'bg-amber-100'}`}>
                  {syncLoading ? (
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase tracking-widest ${syncLoading ? 'text-blue-100' : 'text-amber-700'}`}>
                    {syncLoading ? 'Synchronizing Intelligence' : 'No Web Mentions Data'}
                  </h4>
                  <p className={`text-xs font-medium tracking-tight mt-1 ${syncLoading ? 'text-blue-300' : 'text-amber-600/80'}`}>
                    {syncLoading 
                      ? `Syncing live nodes for ${project?.brandName || 'project'}...`
                      : `No live brand mentions data has been found for ${project?.brandName} yet.`}
                  </p>
                </div>
              </div>
              {syncLoading ? (
                <div className="px-5 py-2.5 bg-blue-500/20 rounded-xl text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] animate-pulse border border-blue-400/20">
                   Syncing...
                </div>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <Link 
                    to={`/dashboard/projects/${projectId}`}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95"
                  >
                    Go to Dashboard & Scan
                  </Link>
                  <p className="text-[9px] text-amber-500 font-bold uppercase tracking-tighter opacity-60">Full Sync Required</p>
                </div>
              )}
            </div>
          )}
      </motion.div>

      {!projectId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Scans</h2>
            {reports.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search scans..."
                  className="bg-[#F8F9FB] border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
                />
              </div>
            )}
          </div>
          
          {reports.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <Globe className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">No previous scans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto text-left">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entity</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-[#1E293B]">
                        {r.brandName || r.domain || 'Unknown Entity'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter" style={{ 
                          backgroundColor: `${getScoreColor(r.results?.score || r.coverageScore || 0)}20`, 
                          color: getScoreColor(r.results?.score || r.coverageScore || 0) 
                        }}>
                          {r.results?.score || r.coverageScore || 0}% VISIBILITY
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">{formatDate(r.createdAt)}</td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => viewReport(r)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-widest">View Analysis</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
      </div>
    );
  }

  const renderFormattedContent = (content) => {
    if (!content) return null;
    const text = typeof content === 'string' ? content : content.content || '';
    
    // Split into logical points
    // 1. Handle explicit newlines
    // 2. Handle inline points like "* Item" or "1) Item"
    let points = text
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => {
        // Only keep points that actually have content and look like findings
        return p.length > 5 && (p.includes(':') || p.includes('**'));
      })
      .slice(0, 5); // Limit to 5 points as requested

    return (
      <div className="space-y-4">
        {points.map((point, idx) => {
          // Identify if it was originally a bullet/number
          const isBullet = /^[0-9]+[\.\)]/.test(point) || text.includes('\n* ' + point);
          
          // Aggrerssively strip any citation tags completely (from [SOURCE: ... to end of point)
          // This prevents trailing brackets like ")]" from showing up if the AI nested them
          const cleanText = point
            .replace(/\[source[:\s].*$/gi, '') // Remove everything from [source to end of line
            .replace(/^[0-9]+[\.\)]\s+/, '')    // Remove leading numbers
            .trim();

          if (!cleanText) return null;

          return (
            <div key={idx} className="flex gap-4 group/point">
              {isBullet && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30 mt-2 shrink-0 group-hover/point:bg-blue-500 transition-colors" />
              )}
              <p className="text-gray-600 text-[14px] leading-relaxed font-medium tracking-tight">
                {cleanText}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── RESULTS VIEW ──────────────────────────────────────────
  if (results) {
    const profile = results.profile || {};
    const score = results.score || profile.visibilityScore || 0;
    const scoreColor = getScoreColor(score);
    const circumference = 2 * Math.PI * 50;
    const strokeDashoffset = circumference * (1 - score / 100);

    return (
      <div className="max-w-6xl mx-auto pb-20" id="report-content">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6" data-html2canvas-ignore>
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors border-b border-transparent hover:border-gray-200">Dashboard</Link>
          <span className="opacity-40">/</span>
          <span className="text-gray-400 font-medium">AI Module</span>
          <span className="opacity-40">/</span>
          {!projectId ? (
            <button onClick={() => setResults(null)} className="text-gray-400 hover:text-gray-600 transition-colors font-medium border-b border-transparent hover:border-gray-200">Web Visibility</button>
          ) : (
            <span className="text-gray-400 font-medium">Web Visibility</span>
          )}
          <span className="opacity-40">/</span>
          <span className="text-gray-600 font-bold bg-gray-100 px-2 py-0.5 rounded-md">Report</span>
        </div>

        <AnimatePresence>
          {contextProject?.isScanning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
              data-html2canvas-ignore
            >
              <div className="bg-blue-600/5 border-y border-blue-100/50 py-3 px-4 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-lg p-1.5 animate-pulse shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-tight leading-none">Comprehensive Intelligence Scan</h4>
                    <p className="text-[9px] text-blue-600/70 font-bold uppercase tracking-widest mt-1">Crawling live LLM nodes & Web Mentions (30-60s) • Live sync active</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-white/80 rounded-lg border border-blue-100/50 backdrop-blur-sm">
                    <Loader2 className="w-2.5 h-2.5 text-blue-600 animate-spin" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Crawling Node</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1 pr-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Globe className="w-3 h-3" /> Live Research Node Synced
              </div>
              <h1 className="text-3xl font-black mb-3 tracking-tight">Web Visibility Summary</h1>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-8 max-w-2xl font-medium">
                {profile.interpretation || `Real-time scan for brand mentions, sentiment, and semantic authority across the live web nodes. Your authority score is ${score}% based on indexed depth.`}
              </p>
              
              <div className="flex items-center gap-3" data-html2canvas-ignore>
                <button 
                  onClick={() => handleExportPDF(projectId ? (project?.name) : (input || 'Brand'))}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-white text-[#1a202c] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Export PDF Audit
                </button>
                <button 
                  onClick={() => setResults(null)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl text-sm font-semibold transition-all border border-white/5 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" /> New Analysis
                </button>
              </div>
            </div>

            {/* Score Circle */}
            <div className="text-center shrink-0">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2d3748" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="8"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black" style={{ color: scoreColor }}>{score}%</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Visibility</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Potential Impact Banner */}
        {score < 90 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 flex items-start gap-3 shadow-sm shadow-blue-500/5"
          >
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-700 leading-relaxed">
                <strong>Visibility Optimization Required:</strong> Your brand has untapped visibility potential. Adopting the recommended citation strategies could increase your authority score by up to <u>{(100-score).toFixed(0)}%</u>.
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* AI Engine Snapshots */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black text-gray-400 h-4 flex items-center gap-2 uppercase tracking-widest">
                  <Terminal className="w-3.5 h-3.5 text-blue-600" /> AI Engine Responses
                </h4>
                <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">Live Engine</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {['Gemini', 'ChatGPT'/*, 'Groq'*/].map((id, i) => (
                  modelResults[id] && (
                    <motion.div 
                      key={id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:border-blue-500/20 transition-all flex flex-col group"
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-4 rounded-full ${i % 3 === 0 ? 'bg-blue-500' : i % 3 === 1 ? 'bg-purple-500' : 'bg-green-500'}`} />
                          <span className="text-xs font-black uppercase text-[#1E293B] tracking-widest">{id}</span>
                        </div>
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Live Node</span>
                      </div>
                      <div className="group-hover:text-gray-700 transition-colors">
                        {renderFormattedContent(modelResults[id])}
                      </div>
                    </motion.div>
                  )
                ))}
              </div>
            </div>

            {/* AI Visibility Assessment (from Profile) */}
            {profile.aiVisibilityAssessment && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" /> AI Visibility Assessment
                  </h4>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Level</span>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border 
                      ${(profile.aiVisibilityAssessment.overallLevel || '').toLowerCase().includes('high') ? 'bg-green-50 text-green-700 border-green-100' : 
                        (profile.aiVisibilityAssessment.overallLevel || '').toLowerCase().includes('moderate') ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {(profile.aiVisibilityAssessment.overallLevel || '').toLowerCase().includes('high') ? '🟢 High AI visibility' : 
                       (profile.aiVisibilityAssessment.overallLevel || '').toLowerCase().includes('moderate') ? '🔵 Moderate AI visibility' : 
                       (profile.aiVisibilityAssessment.overallLevel || '').toLowerCase().includes('low') ? '🟡 Low AI visibility' : '🔴 Very Low AI visibility'}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-[15px] text-gray-600 mb-8 leading-relaxed font-medium">
                    "{profile.aiVisibilityAssessment.interpretation}"
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white/50">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                          <th className="py-4 px-6">Discovery Metric</th>
                          <th className="py-4 px-6 text-center">Assessment</th>
                          <th className="py-4 px-6 pr-8">Discovery Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(profile.aiVisibilityAssessment.criteria || []).map((c, i) => {
                          const lowA = c.assessment?.toLowerCase() || '';
                          let cleanA = '🟡 Low';
                          let aStyle = 'bg-amber-50 text-amber-600 border-amber-100';
                          
                          if (lowA.includes('high') || lowA.includes('strong') || lowA.includes('stable') || lowA.includes('confirmed') || lowA.includes('detected') || lowA.includes('active')) {
                            cleanA = '🟢 Strong';
                            aStyle = 'bg-green-50 text-green-600 border-green-100';
                          } else if (lowA.includes('moderate') || lowA.includes('possible') || lowA.includes('identified') || lowA.includes('current')) {
                            cleanA = '🔵 Moderate';
                            aStyle = 'bg-blue-50 text-blue-700 border-blue-100';
                          } else if (lowA.includes('very low') || lowA.includes('weak') || lowA.includes('limited')) {
                            cleanA = '🔴 Very Low';
                            aStyle = 'bg-red-50 text-red-600 border-red-100';
                          }

                          return (
                            <tr key={i} className="group hover:bg-white transition-colors">
                              <td className="py-5 px-6 text-sm font-bold text-[#1E293B]">{c.name}</td>
                              <td className="py-5 px-6 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase border tracking-tighter ${aStyle}`}>
                                  {cleanA}
                                </span>
                              </td>
                              <td className="py-5 px-6 text-xs text-gray-500 font-medium leading-relaxed group-hover:text-gray-700 transition-colors pr-8 min-w-[200px]">
                                {c.evidence}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-8">
            {/* AI Interpretation (Matches web-search.html Interpretation Card) */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">AI's Interpretation</h4>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {profile.interpretation || "Deep scanning live web results for brand authority and mentions..."}
                  </p>
                </div>
              </div>
              
              <div className="p-8 bg-gray-50/30 space-y-8">
                {/* Tags */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-3.2 h-3.5 text-green-600" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Strong Presence Around</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.prompts || []).map((k, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 uppercase tracking-wider shadow-sm">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Synthesis Grid (The key parity element) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Domain Type</div>
                    <div className="text-xs font-bold text-[#1E293B]">{profile.domainType || profile.brandType || 'Analyzing...'}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Brand Sentiment</div>
                    <div className={`text-[10px] w-fit font-black uppercase tracking-widest px-2 py-0.5 rounded ${(profile.sentiment || '').toLowerCase().includes('positive') ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : (profile.sentiment || '').toLowerCase().includes('negative') ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-100'}`}>
                      {profile.sentiment || 'Neutral'}
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm col-span-2">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Core Offering</div>
                    <div className="text-xs font-bold text-[#1E293B]">{profile.coreOffering || profile.interpretation?.slice(0, 100) || 'Analyzing...'}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Optimization Checklist */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm"
            >
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Optimization Checklist
              </h4>
              <div className="space-y-3">
                {(profile.checklist || []).map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white transition-all group cursor-default">
                    <div className="w-5 h-5 rounded-md border-2 border-gray-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-green-500 transition-colors">
                      <div className="w-2 h-2 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top AI Sources */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="bg-white border border-gray-200/60 p-8 rounded-2xl shadow-sm"
            >
              <h4 className="text-[11px] font-black mb-6 text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" /> Top AI Sources
              </h4>
              <div className="space-y-3">
                {(profile.citations || []).map((c, i) => {
                  let url = typeof c === 'string' ? c : c.url;
                  let domainName = typeof c === 'string' ? '' : c.domain;
                  
                  // If domain is missing or generic, extract from URL
                  if (!domainName || domainName === '...' || domainName === 'Verified Source' || domainName === 'Source') {
                    try {
                      const host = new URL(url).hostname;
                      domainName = host.replace('www.', '').split('.')[0];
                      domainName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
                    } catch (e) {
                      domainName = 'Verified Source';
                    }
                  }

                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white group cursor-pointer"
                    >
                      <div className="flex flex-col overflow-hidden max-w-[85%]">
                        <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider truncate">{domainName}</span>
                        <span className={`text-[10px] truncate mt-0.5 font-medium ${url === '#' ? 'text-gray-400 italic' : 'text-blue-500/70'}`}>
                          {url === '#' ? 'Source Link Unavailable' : url}
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500/40 group-hover:text-blue-500 transition-colors shrink-0" />
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
        </div>
      {/* Hidden PDF Template (Rendered off-screen for high-quality capture) */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div id="web-search-pdf-template">
          {results && (
            <WebSearchReport 
              brandName={projectId ? (project?.name) : (input || 'Brand')} 
              data={results} 
            />
          )}
        </div>
      </div>
      </div>
    );
  }
  return null;
};

export default WebSearch;
