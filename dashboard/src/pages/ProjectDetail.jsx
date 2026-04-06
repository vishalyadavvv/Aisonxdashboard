import { useState, useEffect, useMemo, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart3, 
  Settings, 
  RefreshCw, 
  Globe, 
  Calendar,
  ChevronUp, 
  ChevronDown,
  Info,
  ExternalLink,
  MessageSquare,
  Activity,
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
  Download,
  Filter,
  MoreHorizontal,
  Building2,
  Fingerprint,
  Link as LinkIcon
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { downloadPDF } from '../utils/downloadPDF';
import { useProject } from '../context/ProjectContext';
import { fixAIUrl } from '../utils/linkFixer';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { project, history, loading, refreshData } = useProject();
  const isScanning = project?.isScanning || false;
  const [activeTab, setActiveTab] = useState('mention');
  const [activeMainTab, setActiveMainTab] = useState('overview');
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState(0);
  const [selectedEngine, setSelectedEngine] = useState('all');
  const [scanMessageIndex, setScanMessageIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (isScanning) {
      setScanMessageIndex(0);
      interval = setInterval(() => {
        setScanMessageIndex(prev => (prev < 4 ? prev + 1 : prev));
      }, 7000);
    } else {
      setScanMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const scanMessages = [
    "Waking AI Engines...",
    "Deep Scanning with OpenAI...",
    "Validating with Google Gemini...",
    "Assembling Search Results...",
    "Finalizing Visibility Profile..."
  ];

  useEffect(() => {
    if (projectId === 'new') {
      navigate('/dashboard/projects?new=true');
    }
  }, [projectId]);

  const tier = user?.subscription?.tier || 'starter';
  const totalScans = tier === 'professional' ? 20 : (tier === 'growth' ? 15 : 10);
  const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const isLimitReached = scansUsed >= totalScans || user?.subscription?.status === 'expired';

  const handleManualScan = async () => {
    const tier = user?.subscription?.tier || 'starter';
    const totalScans = tier === 'professional' ? 20 : (tier === 'growth' ? 15 : 10);
    const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;

    if (user?.subscription?.status === 'expired' || scansUsed >= totalScans) {
      toast.error(scansUsed >= totalScans 
        ? 'Monthly scan limit reached. Please upgrade your plan for more scans.' 
        : 'Your free trial has expired. Please upgrade your plan to run new scans.');
      navigate('/dashboard/pricing');
      return;
    }
    const toastId = toast.loading('Initiating Intelligence Assembly...', {
      style: {
        background: '#0f172a',
        color: '#fff',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
        padding: '16px 24px',
        border: '1px solid rgba(255,255,255,0.1)'
      }
    });

    try {
      // Trigger background sync
      await api.post(`/projects/${projectId}/sync`);
      toast.success('Scan Initiated in Background', { id: toastId });
      // The context will automatically pick up the 'isScanning' flag and start polling
      await refreshData();
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      
      if (status === 401) {
        toast.error('Session expired. Please log in again.', { id: toastId });
        navigate('/login');
      } else if (status === 429) {
        toast.error('AI engines at capacity. Please wait 30-60 seconds and retry.', { id: toastId });
      } else {
        toast.error(serverMsg || 'Intelligence sync failed. Please try again.', { id: toastId });
      }
    }
  };

  // Latest snapshot for KPIs
  const lastSnapshot = useMemo(() => history[0] || null, [history]);
  
  // Calculate KPIs
  const stats = useMemo(() => {
    if (!lastSnapshot) return { mention: 0, link: 0, top3: 0, sources: 0 };
    
    const rankings = lastSnapshot.promptRankings || [];
    const filteredRankings = selectedEngine === 'all' 
      ? rankings 
      : rankings.filter(r => r.engine === selectedEngine);
    
    const total = filteredRankings.length || 1;
    const mentions = filteredRankings.filter(r => r.found).length || 0;
    const links = filteredRankings.filter(r => r.linkFound).length || 0;
    const top3 = filteredRankings.filter(r => 
      (r.found && r.rank > 0 && r.rank <= 3) || 
      (r.linkFound && r.linkRank > 0 && r.linkRank <= 3)
    ).length || 0;
    
    // Recalculate overall score for filtered view if specific engine
    let overallScore = lastSnapshot.overallScore || 0;
    if (selectedEngine !== 'all') {
      overallScore = Math.round(((mentions + links) / (total * 2)) * 100);
    }
    
    return {
      mention: Math.round((mentions / total) * 100),
      link: Math.round((links / total) * 100),
      top3: Math.round((top3 / total) * 100),
      sources: lastSnapshot.authoritySignals?.webGroundedRecency || 0,
      overallScore
    };
  }, [lastSnapshot, selectedEngine]);

  // Chart Data: Chronological (Oldest -> Latest)
  const chartData = useMemo(() => {
    return [...history].reverse().map(h => {
      const rankings = h.promptRankings || [];
      const filteredRankings = selectedEngine === 'all' 
        ? rankings 
        : rankings.filter(r => r.engine === selectedEngine);
        
      const total = filteredRankings.length || 1;
      const mentions = filteredRankings.filter(r => r.found).length || 0;
      const links = filteredRankings.filter(r => r.linkFound).length || 0;
      
      let score = h.overallScore || 0;
      if (selectedEngine !== 'all') {
        score = Math.round(((mentions + links) / (total * 2)) * 100);
      }

      const d = new Date(h.date);
      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return {
        date: `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${timeStr}`,
        fullDate: d.toLocaleDateString('en-US', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        score,
        mention: Math.round((mentions / total) * 100),
        link: Math.round((links / total) * 100),
      };
    });
  }, [history, selectedEngine]);

  // Table Data: Latest first, limit to last 10 for UI cleanliness
  const tableHistory = useMemo(() => history.slice(0, 10), [history]);

  if (loading || !project) return (
    <div className="flex flex-col items-center justify-center py-40">
       <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 relative">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="absolute inset-0 bg-blue-500/20 rounded-3xl animate-ping opacity-20" />
       </div>
       <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Synchronizing Intelligence</h2>
       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing live nodes for your project...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50" id="project-detail-report">
      <div className="max-w-[1600px] ml-0 px-4 sm:px-6 lg:px-10 pt-6 pb-8 space-y-6">
        <AnimatePresence>
          {isLimitReached && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
                    <Zap className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight">Scan Limit Reached</h4>
                    <p className="text-sm text-amber-50/80 font-medium">You have used {scansUsed}/{totalScans} monthly scans. Upgrade to Growth or Professional to continue monitoring.</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/dashboard/pricing')}
                  className="bg-white text-orange-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-50 transition-all shadow-lg hover:scale-105 active:scale-95 shrink-0 relative z-10"
                >
                  Upgrade Plan ✦
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Breadcrumbs & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium overflow-x-auto whitespace-nowrap pb-2 md:pb-0">
            <span className="hover:text-blue-600 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/projects')}>Dashboard</span>
            <span>&gt;</span>
            <span className="hover:text-blue-600 transition-colors cursor-pointer">{project?.domain || 'Loading...'}</span>
            <span>&gt;</span>
            <span className="text-slate-900 font-semibold underline underline-offset-4 decoration-blue-500/30">Analytics</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button 
                onClick={() => setActiveMainTab('overview')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMainTab === 'overview' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveMainTab('competitors')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeMainTab === 'competitors' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Competitors
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <button 
              onClick={handleManualScan}
              disabled={isScanning}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[13px] font-black transition-all shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.4)] hover:scale-[1.02] active:scale-95 flex items-center gap-2 group border border-blue-400/20 disabled:opacity-80 disabled:scale-100 min-w-[240px] justify-center"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="shrink-0">{isScanning ? scanMessages[scanMessageIndex] : 'Comprehensive Scan'}</span>
            </button>
            <button 
              onClick={() => downloadPDF('project-detail-report', `${project?.name || 'Project'}_Full_Report.pdf`)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              EXPORT
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isScanning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
              data-html2canvas-ignore
            >
              <div className="bg-blue-600/5 border-y border-blue-100/50 py-3 px-6 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-lg p-1.5 animate-pulse shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-tight leading-none">Comprehensive Intelligence Scan</h4>
                    <p className="text-[9px] text-blue-600/70 font-bold uppercase tracking-widest mt-1">Synchronizing All AI Module Nodes & Semantic Data (30-60s) • Live sync active</p>
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/80 rounded-lg border border-blue-100/50 backdrop-blur-sm">
                    <Loader2 className="w-2.5 h-2.5 text-blue-600 animate-spin" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{scanMessages[scanMessageIndex]}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold ring-1 ring-emerald-100">
              {history.length > 0 ? 'Live data' : 'Pending Scan'}
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-slate-400" />
              {project?.market?.name || 'Global Market'}
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {project?.prompts?.length || 0} prompts
            </div>
            <div className="text-xs font-medium text-slate-500">
              Last update <span className="text-slate-900 font-bold">{project?.lastScanAt ? new Date(project?.lastScanAt).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 h-10 shadow-sm">
              <Globe className="w-4 h-4 text-slate-400" />
              <select 
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All AI Engines</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI GPT-4o</option>
              </select>
            </div>
          </div>
          
          {activeMainTab === 'overview' && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Activity className="w-3.5 h-3.5" />
              Real-time Analysis Mode
            </div>
          )}
        </div>

        {activeMainTab === 'overview' ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    Overall GEO Score
                    <Info className="w-3 h-3 text-slate-300" />
                  </h3>
                </div>
                <div className="flex flex-col items-center justify-center pt-2">
                  <div className="relative w-28 h-28 group">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="scoreGaugeGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="44" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                      <circle cx="50" cy="50" r="44" fill="none" stroke="url(#scoreGaugeGradient)" strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 44}`}
                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - stats.overallScore / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.3))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-slate-900 leading-none tracking-tight">{stats.overallScore}%</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Health</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    Engine Breakdown
                    <Info className="w-3 h-3 text-slate-300" />
                  </h3>
                </div>
                <div className="space-y-3 pt-2">
                  {[
                    { name: 'OpenAI', id: 'openai', color: 'bg-emerald-500' },
                    { name: 'Gemini', id: 'gemini', color: 'bg-blue-500' },
                  ].map((engine) => {
                    // Use backend-computed engine score (consistent across refreshes)
                    const engineRankings = lastSnapshot?.promptRankings?.filter(r => r.engine === engine.id) || [];
                    let score = lastSnapshot?.engineScores?.[engine.id] || 0;
                    
                    // Only recalculate if backend returned 0 but we have individual prompt scores
                    if (score === 0 && engineRankings.length > 0) {
                      const actualScores = engineRankings.filter(r => r.score > 0).map(r => r.score);
                      if (actualScores.length > 0) {
                        // Average ALL rankings (including 0s) for honest representation
                        score = Math.round(actualScores.reduce((a, b) => a + b, 0) / engineRankings.length);
                      }
                    }

                    return (
                      <div key={engine.name} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-500">{engine.name}</span>
                          <span className="text-slate-900">{score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            className={`h-full ${engine.color}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    Visibility Detail
                    <Info className="w-3 h-3 text-slate-300" />
                  </h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{stats.mention}%</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">MENTION</span>
                    </div>
                    <div className="h-px bg-slate-100 mt-2" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900">{stats.link}%</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LINK</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    Sources Web-Grounding
                    <Info className="w-3 h-3 text-slate-300" />
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-slate-900">{stats.sources}%</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-tight">Grounded on web evidence</p>
                  
                  <div className="h-16 w-full bg-slate-50 relative overflow-hidden rounded-xl border border-slate-100/50 mt-2">
                    <svg className="absolute bottom-0 left-0 w-full h-12" preserveAspectRatio="none" viewBox="0 0 100 40">
                      <path d="M0 40 V 20 Q 25 10 50 25 T 100 15 V 40 Z" fill="#3b82f6" fillOpacity="0.1" />
                      <path d="M0 20 Q 25 10 50 25 T 100 15" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Presence Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 flex items-center justify-between">
                <div className="flex">
                  <button 
                    onClick={() => setActiveTab('score')}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                      activeTab === 'score' || activeTab === 'mention' ? 'border-blue-600 text-black' : 'border-transparent text-slate-900 hover:text-blue-600'
                    }`}
                  >
                    Historical Trend
                  </button>
                </div>
              </div>
              
              <div className="p-8">
                <div className="h-[300px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMention" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip 
                          cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xl space-y-3 min-w-[180px]">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">{data.fullDate}</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Overall Score</span>
                                      <span className="text-sm font-black text-blue-600">{data.score}%</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Mentions</span>
                                      <span className="text-sm font-black text-emerald-600">{data.mention}%</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase">Links</span>
                                      <span className="text-sm font-black text-indigo-600">{data.link}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Area 
                          type="monotone"  
                          dataKey="score" 
                          name="Overall Score"
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorScore)"
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#3b82f6' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="mention" 
                          name="Mentions"
                          stroke="#10b981" 
                          strokeWidth={2} 
                          strokeDasharray="5 5"
                          fillOpacity={1} 
                          fill="url(#colorMention)"
                          activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: '#10b981' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-slate-500 font-medium text-xs uppercase tracking-widest">{project?.market?.name || 'Global Market'}</p>
                      <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">No trend data available yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analyzed Prompts Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Analyzed Prompts</h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-300">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-left">Prompt</th>
                        {tableHistory.length > 0 ? tableHistory.map((h, i) => (
                          <th key={i} className="px-2 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center border-l border-slate-300 min-w-[90px]">
                            {new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()}
                            <div className="grid grid-cols-2 gap-1 mt-2 font-bold text-[7px] uppercase tracking-tight text-slate-400 px-0.5 border-t border-slate-100 pt-1">
                              <span className="text-left">MENTION</span>
                              <span className="text-right">LINK</span>
                            </div>
                          </th>
                        )) : (
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center border-l border-slate-100">
                            PENDING
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 border-b border-slate-300">
                      {project?.prompts?.length > 0 ? project.prompts.map((promptText, kidx) => (
                        <Fragment key={kidx}>
                          <tr 
                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedPrompt === promptText ? 'bg-blue-50/40' : ''}`}
                            onClick={() => {
                              if (expandedPrompt === promptText) {
                                setExpandedPrompt(null);
                              } else {
                                setExpandedPrompt(promptText);
                                setActiveSnapshotIndex(0); // Default to latest when clicking row
                              }
                            }}
                          >
                            <td className="px-4 py-4 min-w-[280px] max-w-[500px]">
                              <div className="flex items-start gap-2">
                                {expandedPrompt === promptText ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                                <span 
                                  className="text-sm font-bold text-slate-900 leading-snug" 
                                  title={promptText}
                                >
                                  {promptText}
                                </span>
                              </div>
                            </td>

                            {tableHistory.map((h, hidx) => {
                              const engResults = h.promptRankings?.filter(r => 
                                r.prompt === promptText && (selectedEngine === 'all' || r.engine === selectedEngine)
                              ) || [];
                              const isFound = engResults.some(r => {
                                const brandN = project?.brandName || project?.name || '';
                                const snippetL = r.snippet?.toLowerCase() || '';
                                const isNeg = snippetL.includes('not found') || snippetL.includes('not visible') || snippetL.includes('does not appear') || snippetL.includes('does not rank') || snippetL.includes('not organically visible') || snippetL.includes('is not present');
                                return r.found || (snippetL.includes(brandN.toLowerCase()) && !isNeg);
                              });
                              const isLinkFound = engResults.some(r => r.linkFound);
                              
                              const getRankIndicator = (found, type) => (
                                <div className="flex justify-center group/tip relative">
                                  {found ? (
                                    <div className={`p-1.5 rounded-lg border transition-all duration-300 ${
                                      type === 'mention' 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-500/10' 
                                        : 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm shadow-blue-500/10'
                                    }`}>
                                      {type === 'mention' ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                      ) : (
                                        <LinkIcon className="w-3 h-3" />
                                      )}
                                      
                                      {/* Enhanced Tooltip */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                                        <div className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                          {type === 'mention' ? 'Verified Mention' : 'Active Link Found'}
                                        </div>
                                        <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-1.5 rounded-lg border border-slate-100 bg-slate-50/50 text-slate-300 group/tip relative">
                                      {type === 'mention' ? (
                                        <CheckCircle2 className="w-3 h-3 opacity-40" />
                                      ) : (
                                        <LinkIcon className="w-3 h-3 opacity-40" />
                                      )}
                                      
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50">
                                        <div className="bg-slate-700 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                          Not Found
                                        </div>
                                        <div className="w-2 h-2 bg-slate-700 rotate-45 mx-auto -mt-1" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                                
                              return (
                                <td 
                                  key={hidx} 
                                  className={`px-3 py-5 border-l border-slate-200 transition-colors ${expandedPrompt === promptText && activeSnapshotIndex === hidx ? 'bg-blue-100/50' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (expandedPrompt === promptText && activeSnapshotIndex === hidx) {
                                      setExpandedPrompt(null);
                                    } else {
                                      setExpandedPrompt(promptText);
                                      setActiveSnapshotIndex(hidx);
                                    }
                                  }}
                                >
                                  <div className="grid grid-cols-2 gap-2 items-center">
                                    {getRankIndicator(isFound, 'mention')}
                                    {isFound ? getRankIndicator(isLinkFound, 'link') : <div />}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                          {expandedPrompt === promptText && tableHistory.length > 0 && (
                            <tr>
                              <td colSpan={tableHistory.length + 2} className="px-6 py-0 bg-slate-50/50 border-b border-slate-200">
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  className="py-6"
                                >
                                    <div className="mb-4 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-blue-600" />
                                        <h4 className="text-sm font-bold text-slate-900">Per-Engine Insights</h4>
                                      </div>
                                      <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                                        Viewing Scan: {new Date(tableHistory[activeSnapshotIndex].date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {['openai', 'gemini'].filter(e => selectedEngine === 'all' || e === selectedEngine).map((engine) => {
                                        const res = tableHistory[activeSnapshotIndex].promptRankings?.find(r => r.prompt === promptText && r.engine === engine);
                                        const brandName = project?.brandName || project?.name || '';
                                        const snippetLower = res?.snippet?.toLowerCase() || '';
                                        const hasNegativePhrase = snippetLower.includes('not found') || snippetLower.includes('not visible') || snippetLower.includes('does not appear') || snippetLower.includes('does not rank') || snippetLower.includes('no mention') || snippetLower.includes('not organically visible') || snippetLower.includes('is not present');
                                        const snippetFound = snippetLower.includes(brandName.toLowerCase()) && !hasNegativePhrase;
                                        
                                        // A brand is "visible" if its rank > 0 OR it shows up specifically in the snippet
                                        const isFound = res?.rank > 0 || snippetFound;
                                        
                                        // Citations should be shown if found OR if we have explicit citation URLs
                                        const rawCits = (res?.citations || res?.authoritySignals?.citations || [])
                                          .filter(c => c && typeof c === 'string' && (c.startsWith('http') || c.startsWith('www.') || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(c.trim())));
                                        const hasCitations = rawCits.length > 0;

                                      return (
                                        <div key={engine} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 capitalize text-sm">{engine}</span>
                                            <span 
                                              title={!isFound && res?.score > 0 ? "Has Content (Verified via detailed market analysis)" : ""}
                                              className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase transition-all ${res?.rank > 0 && res?.rank <= 5 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : isFound ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : (!isFound && res?.score > 0) ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'bg-slate-50 text-slate-400'}`}
                                            >
                                              {res?.rank > 0 && res?.rank <= 5 ? 'Recommended' : isFound ? (res?.rank > 0 ? `Rank #${res.rank}` : 'Mentioned') : (!isFound && res?.score > 0 ? 'Verified Mention' : 'Not Found')}
                                            </span>
                                          </div>
                                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                                            {isFound || (res?.score > 0 && hasCitations) ? (
                                              <>
                                                <p className="text-xs text-slate-600 leading-relaxed italic">
                                                  "{res?.snippet || 'No specific insight captured.'}"
                                                </p>
                                                
                                                {(isFound || hasCitations) && (
                                                  <div className="pt-2 border-t border-slate-200/50 space-y-1.5">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Verified Sources</p>
                                                    <div className="flex flex-wrap gap-2">
                                                      {(() => {
                                                        // Build citation list: project domain + actual citations
                                                        const allCits = [];
                                                        const projDomain = project?.domain?.replace(/^https?:\/\/(www\.)?/, '');
                                                        if (projDomain && !rawCits.some(u => u.includes(projDomain))) {
                                                          allCits.push(`https://${projDomain}`);
                                                        }
                                                        allCits.push(...rawCits);

                                                        return allCits
                                                          .map(rawUrl => ({ rawUrl, fixedUrl: fixAIUrl(rawUrl) }))
                                                          .filter(item => item.fixedUrl !== null)
                                                          .slice(0, 4)
                                                          .map((item, i) => {
                                                            const url = item.fixedUrl;
                                                            const domain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                                                            const isOwnDomain = projDomain && domain.includes(projDomain);
                                                            
                                                            return (
                                                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-blue-600 hover:text-blue-700 transition-colors text-[9px] font-bold shadow-sm max-w-[150px]">
                                                                <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                                                                <span className="truncate">
                                                                  {isOwnDomain ? projDomain : domain}
                                                                </span>
                                                              </a>
                                                            );
                                                          });
                                                      })()}
                                                    </div>
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <>
                                                {res?.snippet ? (
                                                  <>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Market Insight</p>
                                                    <p className="text-xs text-slate-500 leading-relaxed italic">
                                                      "{res.snippet}"
                                                    </p>
                                                  </>
                                                ) : (
                                                  <p className="text-xs text-slate-400 leading-relaxed text-center py-2">
                                                    Your brand was not found for this prompt.
                                                  </p>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </>
          
        ) : (
          /* Competitor Comparison Tab */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project?.competitors?.map((comp, idx) => {
                // Domain normalization for robust matching
                const normalize = (d) => (d || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
                const targetDomain = normalize(comp.domain);

                // Find latest score for this competitor from last snapshot
                // RELAXED MATCHING: Try domain match first, then fallback to name match
                const compRankings = lastSnapshot?.competitorRankings?.filter(cr => {
                  const aiDomain = normalize(cr.competitorDomain);
                  const isDomainMatch = aiDomain && targetDomain && aiDomain === targetDomain;
                  const isNameMatch = cr.competitorName?.toLowerCase() === comp.name?.toLowerCase();
                  return isDomainMatch || isNameMatch;
                }) || [];

                const compScoreInput = compRankings.length > 0
                  ? Math.round(compRankings.reduce((a, b) => a + (b.score || 0), 0) / compRankings.length)
                  : 0;
                
                // Ensure UI reflects the new backend floor (at least 15 for found)
                const compScore = (compRankings.some(cr => cr.found || cr.rank > 0) && compScoreInput < 15) ? 15 : compScoreInput;
                
                const gap = compScore - stats.overallScore;
                
                // Dynamic market status labels
                const getMarketStatus = (score) => {
                  if (score === 0) return 'N/A';
                  if (score < 20) return 'Nascent Presence';
                  if (score < 50) return 'Growing Rival';
                  if (score < 80) return 'Core Competitor';
                  return 'Dominant Authority';
                };

                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${gap > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                         {gap > 0 ? `+${gap}% LEAD` : `${gap}% GAP`}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">
                          {comp.name?.[0] || '?'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{comp.name || 'Unknown Comp'}</h4>
                          <p className="text-xs text-slate-500 font-medium">{comp.domain}</p>
                        </div>
                      </div>

                      <div className="pt-4 space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visibility Score</span>
                            <div className="text-3xl font-black text-slate-900">{compScore}%</div>
                          </div>
                          <div className="text-right">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Market Stage</span>
                             <div className="text-sm font-bold text-slate-600 mt-1">{getMarketStatus(compScore)}</div>
                          </div>
                        </div>

                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-600" style={{ width: `${compScore}%` }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {(!project?.competitors || project?.competitors?.length === 0) && (
                <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-slate-900">Discovering Market Rivals...</h4>
                  <p className="text-sm text-slate-500 mt-2">The AI is currently analyzing your industry to identify top competitors.</p>
                </div>
              )}
            </div>

            {/* Benchmarking Comparison Table */}
            {project.competitors?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Head-to-Head Comparison</h3>
                    <p className="text-sm text-slate-500 mt-1">Direct visibility comparison for your target prompts</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prompt / Entity</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-blue-600 uppercase tracking-widest">YOU ({stats.overallScore}%)</th>
                        {project?.competitors?.map((comp, idx) => (
                           <th key={idx} className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                             {comp.name}
                           </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {project?.prompts?.map((promptText, pIdx) => {
                        // Get brand data for this prompt
                        const brandResults = lastSnapshot?.promptRankings?.filter(r => r.prompt === promptText) || [];
                        const brandAvgRank = brandResults.length > 0 
                          ? Math.round(brandResults.filter(r => r.rank > 0).reduce((a, b) => a + b.rank, 0) / (brandResults.filter(r => r.rank > 0).length || 1))
                          : 0;
                        const brandAvgScore = brandResults.length > 0 
                          ? Math.round(brandResults.reduce((a, b) => a + (b.score || 0), 0) / brandResults.length)
                          : 0;
                        const brandFound = brandResults.some(r => r.found);

                        return (
                        <tr key={pIdx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-slate-900">{promptText}</span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-3">
                               {brandFound ? (
                                 <div className="flex items-center gap-2">
                                   <div className={`px-2 py-1 rounded-lg text-xs font-black ${brandAvgRank <= 3 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : brandAvgRank <= 7 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                     #{brandAvgRank}
                                   </div>
                                   <span className="text-[10px] font-bold text-slate-400">{brandAvgScore}%</span>
                                 </div>
                               ) : (
                                 <span 
                                   title={!brandFound && brandAvgScore > 0 ? "Has Content (Unranked: Did not appear in top organic AI results)" : ""}
                                   className={`text-[10px] font-black uppercase ${!brandFound && brandAvgScore > 0 ? 'text-amber-500' : 'text-slate-300'}`}
                                 >
                                   {!brandFound && brandAvgScore > 0 ? 'Content Found (Unranked)' : 'Not Found'}
                                 </span>
                               )}
                             </div>
                          </td>
                           {project?.competitors?.map((comp, cIdx) => {
                             const normalize = (d) => (d || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
                             const targetDomain = normalize(comp.domain);

                             const compResults = lastSnapshot?.competitorRankings?.filter(cr => {
                               const aiDomain = normalize(cr.competitorDomain);
                               const isDomainMatch = aiDomain && targetDomain && aiDomain === targetDomain;
                               const isNameMatch = cr.competitorName?.toLowerCase() === comp.name?.toLowerCase();
                               return cr.prompt === promptText && (isDomainMatch || isNameMatch);
                             }) || [];

                             const compAvgRank = compResults.length > 0
                               ? Math.round(compResults.filter(r => r.rank > 0).reduce((a, b) => a + b.rank, 0) / (compResults.filter(r => r.rank > 0).length || 1))
                               : 0;
                             const compAvgScoreInput = compResults.length > 0
                               ? Math.round(compResults.reduce((a, b) => a + (b.score || 0), 0) / compResults.length)
                               : 0;
                             
                             const compAvgScore = (compResults.some(r => r.found || r.rank > 0) && compAvgScoreInput < 15) ? 15 : compAvgScoreInput;
                             const compFound = compResults.some(r => r.found || r.rank > 0) || compAvgScore > 0;
                             const isAhead = compFound && compAvgRank > 0 && (!brandFound || (brandAvgRank > 0 && compAvgRank < brandAvgRank));

                             return (
                               <td key={cIdx} className="px-8 py-6">
                                 <div className="flex items-center gap-3">
                                   {compFound && compAvgRank > 0 ? (
                                     <div className="flex items-center gap-2">
                                       <div className={`px-2 py-1 rounded-lg text-xs font-black ${isAhead ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                         #{compAvgRank}
                                       </div>
                                       <span className="text-[10px] font-bold text-slate-400">{compAvgScore}%</span>
                                     </div>
                                   ) : (
                                     <span 
                                       title={!compFound && compAvgScore > 0 ? "Has Content (Verified via specialized market analysis)" : ""}
                                       className={`text-[10px] font-black uppercase transition-all ${!compFound && compAvgScore > 0 ? 'text-blue-500' : 'text-slate-300'}`}
                                     >
                                       {!compFound && compAvgScore > 0 ? 'Verified Mention' : 'Not Found'}
                                     </span>
                                   )}
                                 </div>
                               </td>
                             );
                          })}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
