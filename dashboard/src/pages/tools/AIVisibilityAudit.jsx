import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { ShieldCheck, MessageSquare, Tag, Terminal, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, ChevronDown, ChevronUp, Globe, FileText, Target, Eye, Zap, Search, FileDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadPDF } from '../../utils/downloadPDF';


// ── Visibility Assessment Table ───────────────────────────
const VisibilityAssessmentTable = ({ data }) => {
  if (!data?.aiVisibilityAssessment) return null;
  const va = data.aiVisibilityAssessment;

  const getVisibilityLabelAndColor = (level = '') => {
    const l = level.toLowerCase();
    if (l.includes('very low')) return { label: '🔴 Very Low AI visibility', color: 'text-red-500' };
    if (l.includes('high') || l.includes('strong') || l.includes('stable') || l.includes('universal') || l.includes('standard')) 
      return { label: '🟢 High AI visibility', color: 'text-green-500' };
    if (l.includes('moderate')) return { label: '🔵 Moderate AI visibility', color: 'text-blue-500' };
    if (l.includes('low')) return { label: '🟡 Low AI visibility', color: 'text-amber-500' };
    return { label: '🔴 Very Low AI visibility', color: 'text-red-500' };
  };
  
  const getBadgeStyle = (assessment = '') => {
    const a = assessment.toLowerCase();
    if (a.includes('very low')) return 'bg-red-50 text-red-600 border-red-100';
    if (a.includes('high') || a.includes('strong') || a.includes('stable') || a.includes('universal') || a.includes('established') || (a.includes('likely') && !a.includes('unlikely'))) 
      return 'bg-green-50 text-green-600 border-green-100';
    if (a.includes('moderate') || a.includes('possible')) return 'bg-blue-50 text-blue-600 border-blue-100';
    if (a.includes('low')) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (a.includes('weak') || a.includes('unlikely') || a.includes('minimal')) return 'bg-red-50 text-red-600 border-red-100';
    if (a.includes('none') || a.includes('not found')) return 'bg-gray-100 text-gray-500 border-gray-200';
    return 'bg-red-50 text-red-600 border-red-100';
  };

  const getCleanAssessment = (a = '') => {
    const lowA = a.toLowerCase();
    if (lowA.includes('very low')) return '🔴 Very Low';
    if (lowA.includes('high') || lowA.includes('strong') || lowA.includes('stable') || lowA.includes('universal') || lowA.includes('established') || (lowA.includes('likely') && !lowA.includes('unlikely'))) return '🟢 High';
    if (lowA.includes('moderate') || lowA.includes('possible')) return '🔵 Moderate';
    if (lowA.includes('low')) return '🟡 Low';
    if (lowA.includes('weak') || lowA.includes('unlikely') || lowA.includes('minimal')) return '🔴 Minimal';
    if (lowA.includes('none') || lowA.includes('not found')) return '❌ None';
    return '🔴 Very Low';
  };

  const { label, color } = getVisibilityLabelAndColor(va.overallLevel);

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col gap-1.5 border-l-4 border-current pl-4" style={{ color: color.replace('text-', '') }}>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall AI visibility level</span>
        <span className={`text-lg font-black ${color}`}>{label}</span>
      </div>

      <div className="overflow-hidden bg-white/50 rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-3.5 px-5 text-left font-black text-gray-400 uppercase tracking-widest">Criterion</th>
              <th className="py-3.5 px-5 text-right font-black text-gray-400 uppercase tracking-widest">Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(va.criteria || []).map((crit, idx) => (
              <tr key={idx} className="group hover:bg-white transition-colors">
                <td className="py-4 px-5 font-bold text-gray-600">{crit.name}</td>
                <td className="py-4 px-5 text-right">
                  <span className={`px-2.5 py-1 rounded-md font-black border text-[10px] uppercase tracking-tighter ${getBadgeStyle(crit.assessment)}`}>
                    {getCleanAssessment(crit.assessment)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {va.interpretation && (
        <div className="space-y-2">
          <span className="text-[10px] font-black text-[#1E293B] uppercase tracking-widest block">Interpretation</span>
          <p className="text-[13px] text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
            {va.interpretation}
          </p>
        </div>
      )}
    </div>
  );
};

const AIVisibilityAudit = () => {
  const { user, updateUser } = useAuth();
  const [results, setResults] = useState(null);
  const [modelResults, setModelResults] = useState({});
  const [activeModel, setActiveModel] = useState(null);
  const [progress, setProgress] = useState('');
  const [step, setStep] = useState(0);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const eventSourceRef = useRef(null);

  const promptsUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const totalPrompts = user?.subscription?.tier === 'professional' ? 20 : (user?.subscription?.tier === 'growth' ? 15 : 10);
  const remaining = totalPrompts - promptsUsed;
  const isLimitReached = remaining <= 0 || user?.subscription?.status === 'expired';
  const percentage = (promptsUsed / totalPrompts) * 100;

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/scan/reports'); // Exclusive audit reports
        setReports(res.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      }
    };
    fetchReports();
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const SignalRow = ({ label, status, goodLabel, badLabel, isReverse, allowUnknown }) => {
    if (status === undefined || status === null || status === 'Unknown') {
      if (allowUnknown) {
        return (
          <div className="flex items-center justify-between mt-3 mb-3">
            <span className="text-xs font-medium text-gray-400">{label}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-gray-800/50 text-gray-500 border border-gray-700/50">Unknown</span>
          </div>
        );
      }
    }
    
    let isGood = Boolean(status);
    if (typeof status === 'string') {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'allowed' || lowerStatus === 'yes' || lowerStatus === 'present' || lowerStatus === 'clear') {
            isGood = true;
        } else if (lowerStatus === 'blocked' || lowerStatus === 'restricted' || lowerStatus === 'no' || lowerStatus === 'missing') {
            isGood = false;
        }
    }
    if (isReverse) isGood = !isGood;
    
    return (
      <div className="flex items-center justify-between mt-3 mb-3">
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${isGood ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
          {isGood ? goodLabel : badLabel}
        </span>
      </div>
    );
  };

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

    // Reset states
    setResults(null);
    setModelResults({});
    setActiveModel(null);
    setIsAnalyzing(true);
    setProgress('Initializing engine...');
    setStep(1);

    const toastId = toast.loading('Connecting to AI nodes... (this may take 30-40 seconds)', { icon: '🚀' });

    try {
      // Use the native fetch for SSE support
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://aisonxdashboard.onrender.com/api'}/scan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ brandName: input })
      });

      if (!response.ok) throw new Error('Failed to start scan');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              
              switch (data.type) {
                case 'progress':
                  setProgress(data.message);
                  if (data.step) setStep(data.step);
                  break;
                case 'model_result': {
                  let modelKey = 'Groq';
                  if (data.model === 'openai') modelKey = 'ChatGPT';
                  else if (data.model === 'gemini') modelKey = 'Gemini';
                  setModelResults(prev => ({ ...prev, [modelKey]: data.data }));
                  break;
                }
                case 'profile_result':
                  // profile_result is the aggregated synthesis
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
                  // Automatically select first available model if none selected
                  const firstModel = Object.keys(modelResults)[0];
                  if (firstModel) setActiveModel(firstModel);
                  break;
                case 'error':
                  toast.error(data.message, { id: toastId });
                  setIsAnalyzing(false);
                  break;
              }
            } catch (err) {
              console.error('Error parsing SSE line:', err);
            }
          }
        }
      }

      // Final refresh of reports
      const reportsRes = await api.get('/scan/reports');
      setReports(reportsRes.data);
      setIsAnalyzing(false);

    } catch (error) {
      console.error('Scan Error:', error);
      toast.error(error.message || 'Analysis failed.', { id: toastId });
      setIsAnalyzing(false);
    }
  };

  const viewReport = (report) => {
    const data = report.results || report;
    setResults(data);
    
    // Synchronize individual model outcomes for snapshots
    setModelResults({
      ChatGPT: data.openai,
      Gemini: data.gemini,
      Groq: data.groq
    });

    setActiveModel(null);
    setStep(4);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const renderFormattedContent = (content) => {
    if (!content) return null;
    let text = typeof content === 'string' ? content : (content.content || content.summary || '');
    if (!text) return null;

    // Clean up markdown artifacts and format as points
    let points = text
      .replace(/\s*([0-9]+\)|[0-9]+\.|\*)\s+/g, '\n$1 ')
      .split('\n')
      .map(p => p.trim()
        .replace(/^(\*|-)\s+/, '')
        .replace(/\*/g, '')
        .trim()
      )
      .filter(p => p.length > 0);

    return (
      <div className="space-y-3">
        {points.map((point, idx) => {
          const isBullet = /^[0-9]+[\.\)]/.test(point) || text.includes('\n* ' + point);
          const cleanPoint = point.replace(/^[0-9]+[\.\)]\s+/, '');
          const parts = cleanPoint.split(/(\[Source:.*?\])/g);

          return (
            <div key={idx} className="flex gap-3 group/point">
              {isBullet && <div className="w-1 h-1 rounded-full bg-blue-500/40 mt-2 shrink-0 group-hover/point:bg-blue-500 transition-colors" />}
              <p className="text-gray-600 text-[13px] leading-relaxed font-medium">
                {parts.map((p, i) => p.startsWith('[Source:') ? <span key={i} className="text-[10px] text-blue-500/60 font-black ml-1 italic">{p}</span> : p)}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── HOME VIEW ─────────────────────────────────────────────
  if (!results) {
    return (
      <div className="max-w-6xl mx-auto">
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
                    <p className="text-sm text-amber-50/80 font-medium whitespace-nowrap">You have used {promptsUsed}/{totalPrompts} monthly scans. Upgrade to Growth or Professional to continue monitoring.</p>
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
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-400">Audit Tools</span>
          <span>›</span>
          <span className="text-gray-600 font-medium">AI Visibility Audit</span>
        </div>

        {/* Dark Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">AI Visibility Audit</h1>
              <p className="text-gray-400 text-sm">Conduct a deep-scan across major LLMs to understand how your brand is perceived and cited.</p>
            </div>
            
            {/* Circular Progress */}
            <div className="text-center shrink-0 group">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="promptGaugeGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#2d3748" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="url(#promptGaugeGradient)" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - (percentage || 0) / 100)}`}
                    strokeLinecap="round" 
                    className="transition-all duration-1000 ease-in-out" 
                    style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.4))' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-blue-400 leading-none">{promptsUsed}</span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter mt-1">of {totalPrompts}</span>
                </div>
              </div>
              <span className="inline-block mt-3 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                {remaining} REMAINING
              </span>
            </div>
          </div>

          {/* Search Input */}
          <form onSubmit={handleAnalyze} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter brand name or domain..."
              disabled={isAnalyzing}
              className="flex-1 bg-[#2d3748] border border-white/10 rounded-xl py-3.5 px-5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !input}
              className="bg-white text-[#1a202c] hover:bg-gray-100 px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Run Audit'}
            </button>
          </form>

          {/* Progress Bar (Visible while analyzing) */}
          {isAnalyzing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-400">{progress}</span>
                <span className="text-[10px] text-gray-500 uppercase font-black">STEP {step}/8</span>
              </div>
              <div className="w-full bg-[#2d3748] h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 8) * 100}%` }}
                  className="h-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Previous Reports (Placeholder/Reusing patterns) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#1E293B]">
              Recent Audits {reports.length > 0 && `(${reports.length})`}
            </h3>
            {reports.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search audits..."
                  className="bg-[#F8F9FB] border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
                />
              </div>
            )}
          </div>
          
          {reports.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-sm font-medium">No previous audits found. Start your first analysis above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto text-left">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Entity</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-[#1E293B]">
                        {r.brandName || r.domain || 'Unknown Entity'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter" style={{ 
                          backgroundColor: `${getScoreColor(r.results?.score || r.coverageScore || 0)}20`, 
                          color: getScoreColor(r.results?.score || r.coverageScore || 0) 
                        }}>
                          {r.results?.score || r.coverageScore || 0}% AUDITED
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-400">{formatDate(r.createdAt)}</td>
                      <td className="py-4 px-4 text-right">
                        <button onClick={() => viewReport(r)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-widest">View Results</button>
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
  }

  // ─── RESULTS VIEW ──────────────────────────────────────────
  if (results) {
    const score = results.score || results.coverageScore || 0;
    const scoreColor = getScoreColor(score);
    const ds = results.domainSynthesis || results; // domain synthesis data
    const circumference = 2 * Math.PI * 50;
    const strokeDashoffset = circumference * (1 - score / 100);

    return (
      <div className="max-w-6xl mx-auto" id="report-content">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6" data-html2canvas-ignore>
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-400">Audit Tools</span>
          <span>›</span>
          <button onClick={() => setResults(null)} className="hover:text-gray-600 transition-colors">AI Visibility Audit</button>
          <span>›</span>
          <span className="text-gray-600 font-medium">Report</span>
        </div>

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
                <Globe className="w-3 h-3" /> AI Visibility Node Synced
              </div>
              <h1 className="text-3xl font-black mb-3 tracking-tight">AI Visibility Summary</h1>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-8 max-w-2xl font-medium">
                {results.summary || `This report analyzes how AI systems perceive and retrieve your brand content. Your composite visibility index is based on semantic footprint and technical accessibility.`}
              </p>
              
              <div className="flex items-center gap-3" data-html2canvas-ignore>
                <button 
                  onClick={() => downloadPDF('report-content', 'AI_Visibility_Audit.pdf')}
                  className="flex items-center gap-2 bg-white text-[#1a202c] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95"
                >
                  <FileDown className="w-4 h-4" /> Export PDF Report
                </button>
                <button 
                  onClick={() => setResults(null)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl text-sm font-semibold transition-all border border-white/5 active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" /> New Audit
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
                  <span className="text-[10px] text-gray-400 font-bold uppercase leading-none">Visibility</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>



        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-6 px-1"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-gray-500 font-medium">
            "{results.profile?.interpretation || (score >= 80 ? 'Strong AI visibility. Keep optimizing to maintain coverage.' : 'Significant improvements needed to boost AI visibility.')}"
          </p>
        </motion.div>



        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* AI Engine Snapshots */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[11px] font-black text-gray-400 h-4 flex items-center gap-2 uppercase tracking-widest">
                  <Terminal className="w-3.5 h-3.5 text-blue-600" /> AI Engine Analysis
                </h4>
                <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Internal Knowledge</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {['Gemini', 'ChatGPT', 'Groq'].map((id, i) => (
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
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Training Data</span>
                      </div>
                      <div className="group-hover:text-gray-700 transition-colors">
                        {renderFormattedContent(modelResults[id])}
                      </div>
                    </motion.div>
                  )
                ))}
              </div>
            </div>

            {/* AI Visibility Assessment (Table) */}
            {results.profile?.aiVisibilityAssessment && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" /> AI Visibility Assessment
                  </h4>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Level</span>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border 
                      ${results.profile.aiVisibilityAssessment.overallLevel?.toLowerCase().includes('high') ? 'bg-green-50 text-green-700 border-green-100' : 
                        results.profile.aiVisibilityAssessment.overallLevel?.toLowerCase().includes('moderate') ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {results.profile.aiVisibilityAssessment.overallLevel || 'Developing'}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <VisibilityAssessmentTable data={results.profile} />
                </div>
              </motion.div>
            )}

          </div>

          <div className="space-y-8">
            {/* AI Interpretation Side Card */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Interpretation</h4>
                  <div>
                    {renderFormattedContent(results.profile?.interpretation || ds.description || "Deep scanning live web results for brand authority...")}
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-gray-50/30 space-y-8">
                {/* Synthesis Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Domain Type</div>
                    <div className="text-xs font-bold text-[#1E293B]">{ds.domainType || results.profile?.domainType || 'Unknown'}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Sentiment</div>
                    <div className="text-xs font-bold text-[#1E293B]">{ds.sentiment || results.profile?.sentiment || 'Unknown'}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm col-span-2">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Core Offering</div>
                    <div className="text-xs font-bold text-[#1E293B]">{ds.coreOffering || results.profile?.coreOffering || (ds.description ? ds.description : 'Unknown')}</div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-100 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-bold text-[#1E293B]">Prompts</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {(ds.topics || results.profile?.prompts || []).slice(0, 10).map((k, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 uppercase tracking-wider shadow-sm">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Optimization Checklist Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8"
            >
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Optimization Checklist
              </h4>
              <div className="space-y-3">
                {(results.profile?.checklist || []).map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white transition-all group cursor-default">
                    <div className="w-5 h-5 rounded-md border-2 border-gray-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-green-500 transition-colors">
                      <div className="w-2 h-2 bg-green-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed">{item}</p>
                  </div>
                ))}
                {!results.profile?.checklist?.length && (
                   <p className="text-xs text-gray-400">No optimization tasks identified for this profile yet.</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }
};

export default AIVisibilityAudit;
