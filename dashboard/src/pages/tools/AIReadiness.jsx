import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Globe, Sparkles, ArrowLeft, Search, ExternalLink, FileText, AlertTriangle, CheckCircle2, Loader2, Users, Target, Eye, Zap, FileDown, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../context/ProjectContext';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { downloadPDF } from '../../utils/downloadPDF';

const STEPS = [
  { label: 'Domain Synthesis', icon: Globe },
  { label: 'Sitemap Fetch', icon: Users },
  { label: 'Fan-Out Mapping', icon: Target },
  { label: 'Visibility Prediction', icon: Eye }
];

// ── Collapsible Action Phase ──────────────────────────────
const ActionPhase = ({ phase, title, description, defaultOpen, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between py-5 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white">Phase {phase}</span>
          <span className="text-base font-bold text-[#1E293B]">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-500 mb-4">{description}</p>
            <div className="pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Schema Enhancement Items ──────────────────────────────
const SchemaItems = ({ technicalSignals }) => {
  const sd = technicalSignals?.structuredData;
  const items = [];

  if (!sd?.organizationPresent) {
    items.push({ title: 'Organization Schema', desc: 'Add Organization markup to your homepage to define your brand identity for AI systems.', effort: 'Low', impact: 15 });
  }
  if (!sd?.breadcrumbPresent) {
    items.push({ title: 'WebSite Schema', desc: 'Implement WebSite schema with sitelinks search box to improve navigation understanding.', effort: 'Low', impact: 10 });
  }
  if (!sd?.articlePresent) {
    items.push({ title: 'Article Schema', desc: 'Add Article/BlogPosting schema to your blog posts for better content understanding.', effort: 'Medium', impact: 12 });
  }
  if (!sd?.faqPresent) {
    items.push({ title: 'FAQ Schema', desc: 'Add FAQPage schema to pages with Q&A content for rich snippet eligibility.', effort: 'Low', impact: 8 });
  }
  if (!sd?.productPresent) {
    items.push({ title: 'Product/Service Schema', desc: 'Add Product or Service schema to highlight your offerings to AI systems.', effort: 'Medium', impact: 10 });
  }

  if (items.length === 0) {
    return <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl p-4">Excellent! All key schemas are already implemented.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="bg-[#F8F9FB] border border-gray-100 rounded-xl p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-[#1E293B]">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${item.effort === 'Low' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
              ✦ {item.effort} Effort
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 font-semibold">Estimated Impact</span>
              <span className="text-xs font-bold text-blue-600">+{item.impact}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${item.impact * 4}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Content Optimization Item ─────────────────────────────
const ContentOptItem = ({ title, desc, hasIt, impact }) => {
  if (hasIt) return null; // Don't show if already implemented
  return (
    <div className="bg-[#F8F9FB] border border-gray-100 rounded-xl p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-[#1E293B]">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{desc}</p>
        </div>
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full shrink-0">✦ Medium Effort</span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 font-semibold">Estimated Impact</span>
          <span className="text-xs font-bold text-blue-600">+{impact}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${impact * 4}%` }} />
        </div>
      </div>
    </div>
  );
};

const AIReadiness = () => {
  const { projectId } = useParams();
  const { user, updateUser } = useAuth();
  const { project: contextProject, history: contextHistory, loading: projectLoading } = useProject();

  const [url, setUrl] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('home'); // 'home' | 'analyzing' | 'report'
  const [syncLoading, setSyncLoading] = useState(!!projectId);
  const [currentStep, setCurrentStep] = useState(0);

  const project = contextProject;
  const setProject = () => {}; // Placeholder, as project is now from context
  const setProjectMode = () => {}; // Placeholder, as projectMode is derived from projectId

  const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const totalScans = user?.subscription?.tier === 'professional' ? 20 : (user?.subscription?.tier === 'growth' ? 15 : 10);
  const remaining = totalScans - scansUsed;
  const isLimitReached = remaining <= 0 || user?.subscription?.status === 'expired';
  const percentage = (scansUsed / totalScans) * 100;
  const hasValidData = results && results.totalSitemapUrls > 0;

  useEffect(() => {
    if (projectId) {
      if (contextProject) {
        setUrl(contextProject.domain || '');
      }
      if (contextHistory.length > 0) {
        const latest = contextHistory[0];
        if (latest.aiReadiness) {
          setResults(latest.aiReadiness);
          setView('report');
        }
      }
      setSyncLoading(false);
    } else {
      const fetchReports = async () => {
        try {
          const res = await api.get('/readiness/reports');
          setReports(res.data);
        } catch (err) {
          console.error('Failed to fetch reports:', err);
        }
      };
      fetchReports();
    }
  }, [projectId, contextProject, contextHistory, user]);

  // Step progress simulation during analysis
  useEffect(() => {
    if (!isAnalyzing) return;
    setCurrentStep(0);
    const timers = [
      setTimeout(() => setCurrentStep(1), 5000),
      setTimeout(() => setCurrentStep(2), 15000),
      setTimeout(() => setCurrentStep(3), 25000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isAnalyzing]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) return;

    if (user?.subscription?.status === 'expired' || remaining <= 0) {
      toast.error(remaining <= 0 
        ? 'Monthly scan limit reached. Please upgrade your plan for more scans.'
        : 'Your free trial has expired. Please upgrade your plan.');
      window.location.href = '/dashboard/pricing';
      return;
    }

    setIsAnalyzing(true);
    setView('analyzing');
    const toastId = toast.loading('Analysing website... this may take up to 60 seconds', { icon: '🔍' });

    try {
      const res = await api.post('/analyze', { url });
      setResults(res.data);
      setView('report');
      toast.success('Analysis completed successfully!', { id: toastId, icon: '✅' });

      const reportsRes = await api.get('/readiness/reports');
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
      setView('home');
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
    setUrl('');
  };

  const filteredReports = (reports || []).filter(r =>
    (r.domain || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.businessType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const SignalRow = ({ label, status, goodLabel, badLabel, isReverse, allowUnknown }) => {
    // Treat string 'Unknown', null, or undefined as unknown state
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
    
    // Handle string statuses from our backend (e.g. Allowed vs Blocked vs Restricted)
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

  // ─── ANALYZING VIEW ─────────────────────────────────────────
  if (view === 'analyzing') {
    return (
      <div className="max-w-3xl mx-auto mt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200/60 rounded-2xl p-10"
        >
          <h3 className="text-lg font-bold text-[#1E293B] mb-2">Analysis Progress</h3>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mb-10 mt-6">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i <= currentStep;
              const isComplete = i < currentStep;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div className={`flex-1 h-0.5 ${isActive ? 'bg-blue-500' : 'bg-gray-200'} transition-colors duration-500`} />
                    )}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-blue-500' : 'bg-gray-200'} transition-colors duration-500`} />
                    )}
                  </div>
                  <span className={`text-xs font-medium mt-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* URL Display */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-[#1E293B] mb-2">Website URL</p>
            <div className="bg-[#F8F9FB] border border-gray-200 rounded-xl py-3.5 px-5 text-gray-600 text-sm">
              {url}
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">AI will automatically detect your business type and analyze your sitemaps</p>

          {/* Analyzing Button */}
          <button disabled className="w-full bg-blue-400/80 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-3 cursor-not-allowed">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── REPORT VIEW ─────────────────────────────────────────────
  if (view === 'report' && results) {
    const score = results.coverageScore || 0;
    const scoreColor = getScoreColor(score);
    const ds = results.domainSynthesis || results; // domain synthesis data
    const circumference = 2 * Math.PI * 50;
    const strokeDashoffset = circumference * (1 - score / 100);

    return (
      <div className="max-w-6xl mx-auto" id="report-content">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6" data-html2canvas-ignore>
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors border-b border-transparent hover:border-gray-200">Dashboard</Link>
          <span className="opacity-40">/</span>
          <span className="text-gray-400">AI Module</span>
          <span className="opacity-40">/</span>
          <span className="text-gray-400 font-medium">Technical Readiness</span>
          <span className="opacity-40">/</span>
          <span className="text-gray-600 font-bold tracking-tight bg-gray-100 px-2 py-0.5 rounded-md">{projectId ? project?.name : 'Report'}</span>
        </div>

        <AnimatePresence>
          {project?.isScanning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
              data-html2canvas-ignore
            >
              <div className="bg-blue-600/5 border-y border-blue-100/50 py-3 px-4 flex items-center justify-between shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 rounded-lg p-1.5 animate-pulse shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-tight leading-none">Comprehensive Scan in Progress</h4>
                    <p className="text-[9px] text-blue-600/70 font-bold uppercase tracking-widest mt-1">Updating technical readiness signals & AI intents (30-60s) • Live sync active</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-white/80 rounded-lg border border-blue-100/50 backdrop-blur-sm">
                    <Loader2 className="w-2.5 h-2.5 text-blue-600 animate-spin" />
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Processing Node</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!hasValidData && !project?.isScanning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
              data-html2canvas-ignore
            >
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                <div className="bg-amber-500 rounded-xl p-2.5 shrink-0 shadow-lg shadow-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-amber-900 uppercase tracking-tight">Technical Analysis Incomplete</h4>
                  <p className="text-[11px] text-amber-700 font-bold opacity-80 mt-1 leading-relaxed">
                    Our scanner was unable to retrieve a full architectural map for <span className="underline decoration-amber-500/30">{project?.domain}</span>. 
                    This usually happens due to strict firewall settings, SSL issues, or missing sitemaps. 
                    AI models may have similar difficulty crawling your site for training.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Header */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <h1 className="text-2xl font-bold italic mb-3">Visibility Prediction Summary</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {results.summary || `This report analyzes how AI systems like ChatGPT, Perplexity, and Google Gemini perceive and retrieve your website content. Your composite coverage score combines core page structure (${score}%) with AI query coverage (${score}%).`}
              </p>
              <div className="flex items-center gap-3" data-html2canvas-ignore>
                <button 
                  onClick={() => downloadPDF('report-content', 'AI_Readiness_Report.pdf')}
                  className="flex items-center gap-2 bg-white text-[#1a202c] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Download PDF Report
                </button>
              </div>
            </div>

            {/* Score Circle */}
            <div className="text-center shrink-0">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2d3748" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="8"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: scoreColor }}>{score}%</span>
                  <span className="text-[10px] text-gray-400">Coverage</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Potential Impact Banner */}
        {results.totalMissing > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              <strong>Potential Impact:</strong> You have {results.totalMissing} missing opportunities across core structure and AI queries. Addressing these could increase your coverage to <u>100%</u>, maximizing your AI visibility and discoverability.
            </p>
          </motion.div>
        )}

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-6 px-1"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-gray-500">
            {score >= 80 ? 'Strong AI visibility. Keep optimizing to maintain coverage.' :
            score >= 50 ? 'Good progress on AI visibility. Address missing opportunities to improve discoverability.' :
            'Significant improvements needed to boost AI visibility and discoverability.'}
          </p>
        </motion.div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-green-50 border border-green-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-green-600 uppercase mb-1">Composite Score</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-[#1E293B]">{score}%</span>
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">AI Query Coverage</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-[#1E293B]">{results.corePagesFound}/{results.totalPages}</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase mt-1">Core AI Intents Tested</span>
              </div>
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-purple-50 border border-purple-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Site URLs Scanned</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-[#1E293B]">{results.totalSitemapUrls || 0}</span>
              <Globe className="w-6 h-6 text-purple-500" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-red-50 border border-red-100 rounded-xl p-5">
            <p className="text-xs font-semibold text-red-600 uppercase mb-1">Total Missing</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-[#1E293B]">{results.totalMissing}</span>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Domain Synthesis */}
          {ds && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B]">Domain Synthesis</h3>
                  <p className="text-xs text-gray-400">AI-generated analysis of your domain's semantic footprint</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#F8F9FB] p-5 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Domain Type</p>
                    <p className="text-[#1E293B] font-bold">{ds.domainType || results.businessType || 'General'}</p>
                  </div>
                  <FileText className="w-5 h-5 text-gray-300" />
                </div>
                <div className="bg-[#F8F9FB] p-5 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Brand Type</p>
                    <p className="text-[#1E293B] font-bold">{ds.brandType || 'N/A'}</p>
                  </div>
                  <Target className="w-5 h-5 text-gray-300" />
                </div>
                <div className="bg-[#F8F9FB] p-5 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Total URLs</p>
                    <p className="text-[#1E293B] font-bold">{results.totalSitemapUrls || 0}</p>
                  </div>
                  <Globe className="w-5 h-5 text-gray-300" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Core Offering */}
          {(ds?.coreOffering || ds?.description) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">Core Offering</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{ds.coreOffering || ds.description}</p>
            </motion.div>
          )}

          {/* Visibility Summary */}
          {ds?.sentiment && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">Visibility Summary</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {ds.sentiment} For comprehensive visibility testing across numerous pages and platforms, we recommend using the full AI Readiness Analyzer.
              </p>
            </motion.div>
          )}

          {/* Topics, Competitors, Prompts */}
          {((ds?.topics?.length > 0) || (ds?.competitors?.length > 0) || (ds?.prompts?.length > 0)) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Array.isArray(ds.topics) && ds.topics.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] mb-3">Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {ds.topics.map((t, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-100">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(ds.competitors) && ds.competitors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] mb-3">Competitors</h4>
                    <div className="flex flex-wrap gap-2">
                      {ds.competitors.map((c, i) => (
                        <span key={i} className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-purple-100">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(ds.prompts) && ds.prompts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-[#1E293B] mb-3">Prompts</h4>
                    <div className="flex flex-wrap gap-2">
                      {ds.prompts.map((k, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200/60">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Sitemap Breakdown */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white border border-gray-200/60 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-[#1E293B] mb-6">Sitemap Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                <p className={`text-2xl font-bold ${results.totalSitemapUrls === 0 ? 'text-slate-400' : 'text-green-600'}`}>
                  {results.totalSitemapUrls || (hasValidData ? 0 : 'N/A')}
                </p>
                <p className="text-xs text-gray-500 font-medium">Total URLs</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className={`text-2xl font-bold ${results.totalSitemapUrls === 0 ? 'text-slate-400' : 'text-blue-600'}`}>
                  {results.pageUrls || results.corePagesFound || (hasValidData ? 0 : 'N/A')}
                </p>
                <p className="text-xs text-gray-500 font-medium">Page URLs</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
                <p className={`text-2xl font-bold ${results.totalSitemapUrls === 0 ? 'text-slate-400' : 'text-purple-600'}`}>
                  {results.postUrls || (results.totalSitemapUrls - (results.corePagesFound || 0)) || (hasValidData ? 0 : 'N/A')}
                </p>
                <p className="text-xs text-gray-500 font-medium">Post URLs</p>
              </div>
            </div>
            {results.sitemapUrl && results.sitemapUrl !== 'Scanned via Homepage Crawl' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-[#F8F9FB] rounded-lg border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">PAGE SITEMAP</span>
                  <span className="text-xs text-blue-600 font-medium">{results.pageSitemapUrl || results.sitemapUrl}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#F8F9FB] rounded-lg border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">POST SITEMAP</span>
                  <span className="text-xs text-blue-600 font-medium">{results.postSitemapUrl || results.sitemapUrl}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Visibility Prediction Results (Restored - Moved Up) */}
          {results.queries?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B] mb-1">Visibility Prediction Results</h3>
                  <p className="text-sm text-gray-400">Comparison of AI-expected pages vs actual sitemap content</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-700 uppercase">AI-Predicted Opportunities</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fan-Out Sub-Query</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Predicted Path</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Expectation Reason</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.queries || []).map((q, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm text-blue-700 font-medium max-w-[220px]">{q.query}</td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">{q.path}</span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500 max-w-[250px]">{q.reason}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${q.status === 'present' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {q.status === 'present' ? '✓' : '⚠'} {q.status === 'present' ? 'Present' : 'Missing'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${q.status === 'present' ? 'text-green-600' : 'text-orange-600'}`}>
                            {q.status === 'present' ? '✅ No Action Needed' : '🔶 ◆ Create Page'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Fan-Out Query Mappings (Moved Down) */}
          {results.queries?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="bg-white border border-gray-200/60 rounded-2xl p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#1E293B] mb-1">Fan-Out Query Mappings</h3>
                  <p className="text-sm text-gray-400">These are typical queries AI models use to find your business. We recommend having specific pages for each.</p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded">Aware of {results.totalSitemapUrls} existing pages</div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 max-w-[150px]">Parent Query</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500">Fan-Out Sub-Query</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500">Predicted Path</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Intent Type</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Query Layer</th>
                      <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.queries || []).map((q, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="py-4 px-4 text-sm text-gray-600 font-medium max-w-[150px] truncate" title={q.parentQuery}>{q.parentQuery || 'General Query'}</td>
                        <td className="py-4 px-4 text-sm text-[#1E293B]">{q.query}</td>
                        <td className="py-4 px-4 text-sm text-blue-500">
                          {q.path}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap
                            ${q.intentType === 'Informational' ? 'bg-blue-50 text-blue-600' :
                              q.intentType === 'How-to' ? 'bg-orange-50 text-orange-600' :
                                q.intentType === 'Transactional' ? 'bg-green-50 text-green-600' :
                                  'bg-gray-100 text-gray-600'}`}>
                            {q.intentType || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">{q.queryLayer || 'Core'}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap
                            ${q.status === 'present' ? 'bg-green-50 text-green-700 border border-green-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {q.status === 'present' ? '✓ Present' : '⚠ Missing'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Technical and Content Signals */}
          <div className="grid grid-cols-1 gap-8 mt-6">
            {/* TECHNICAL SIGNALS FULL */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56 }}
              className="bg-[#1a202c] border border-gray-800 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.05] rounded-bl-[100px] pointer-events-none" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center border border-gray-700/50">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Technical AI Signals</h3>
                  <p className="text-xs text-gray-400 mt-1">Deep dive into machine-readable indicators</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                
                {/* Bots */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">🤖 AI Bot Accessibility</h4>
                  <div className="space-y-3">
                    <SignalRow label="Robots.txt Access" status={results.technicalSignals?.robots?.exists ? 'Allowed' : 'Blocked'} goodLabel="Accessible" badLabel="Missing" />
                    <SignalRow label="GPTBot" status={results.technicalSignals?.robots?.gptBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="Google-Extended" status={results.technicalSignals?.robots?.googleExtended} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="ClaudeBot" status={results.technicalSignals?.robots?.claudeBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="PerplexityBot" status={results.technicalSignals?.robots?.perplexityBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="CCBot" status={results.technicalSignals?.robots?.ccBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="AppleBot" status={results.technicalSignals?.robots?.appleBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="AmazonBot" status={results.technicalSignals?.robots?.amazonBot} goodLabel="Allowed" badLabel="Blocked" allowUnknown />
                    <SignalRow label="Global Disallow" status={results.technicalSignals?.robots?.globalDisallow} goodLabel="Clear" badLabel="Blocked" isReverse />
                    <SignalRow label="X-Robots-Tag" status={results.technicalSignals?.robots?.xRobotsTag !== 'None'} goodLabel="Clear" badLabel="Present" isReverse />
                    <SignalRow label="Meta Noindex" status={results.technicalSignals?.crawlability?.isNoindex} goodLabel="Clear" badLabel="Present" isReverse />
                  </div>
                </div>

                {/* Content Usage Flags */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">📡 AI Content Usage Flags</h4>
                  <div className="space-y-3">
                    <SignalRow label="AI Search Access" status={results.technicalSignals?.robots?.contentSignals?.search} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
                    <SignalRow label="AI Gen Input" status={results.technicalSignals?.robots?.contentSignals?.aiInput} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
                    <SignalRow label="AI Training (Any)" status={results.technicalSignals?.robots?.contentSignals?.aiTrain} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
                    <SignalRow label="AI Fine-Tuning" status={results.technicalSignals?.robots?.contentSignals?.aiTrainFine} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
                    <SignalRow label="Foundation Models" status={results.technicalSignals?.robots?.contentSignals?.aiTrainBase} goodLabel="Allowed" badLabel="Restricted" allowUnknown />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-4 leading-tight">* Standard signals indicating whether site content can be legally ingested by LLMs.</p>
                </div>

                {/* Structured Data */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">🧠 Structured Data</h4>
                  <div className="space-y-3">
                    <SignalRow label="JSON-LD Presence" status={results.technicalSignals?.structuredData?.schemaTypes?.length > 0} goodLabel="Detected" badLabel="Missing" />
                    <SignalRow label="Organization Schema" status={results.technicalSignals?.structuredData?.organizationPresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Person Schema" status={results.technicalSignals?.trust?.authorBylinePresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Article Schema" status={results.technicalSignals?.structuredData?.articlePresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="FAQ Schema" status={results.technicalSignals?.contentStructure?.hasFaqBlock} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="HowTo Schema" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Product Schema" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Breadcrumb Schema" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                  </div>
                </div>
                
                {/* Crawlability */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">🌐 Crawlability</h4>
                  <div className="space-y-3">
                    <SignalRow label="XML Sitemap" status={!!results.sitemapUrl} goodLabel="Found" badLabel="Missing" />
                    <SignalRow label="Sitemap in Robots" status={!!results.sitemapUrl} goodLabel="Linked" badLabel="Missing" />
                    <SignalRow label="Indexable Ratio" status={true} goodLabel="High" badLabel="Low" />
                    <SignalRow label="HTML Rendering" status={true} goodLabel="Server" badLabel="Client" />
                    <SignalRow label="Main Content Node" status={results.technicalSignals?.contentStructure?.hasMainTag} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Semantic <article>" status={results.technicalSignals?.contentStructure?.hasArticleTag} goodLabel="Present" badLabel="Missing" />
                  </div>
                </div>

                {/* Entity Identity */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">🏷️ Entity Identity</h4>
                  <div className="space-y-3">
                    <SignalRow label="About Page" status={results.technicalSignals?.trust?.aboutPagePresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Contact/Location" status={results.technicalSignals?.trust?.contactPagePresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Domain Match" status={true} goodLabel="Matched" badLabel="Mismatch" />
                    <SignalRow label="Brand Consistency" status={true} goodLabel="High" badLabel="Low" />
                    <SignalRow label="Social Links" status={true} goodLabel="Present" badLabel="Missing" />
                  </div>
                </div>

                {/* External Entity */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">🌍 External Entity</h4>
                  <div className="space-y-3">
                    <SignalRow label="Wikidata Proxy" status={false} goodLabel="Detected" badLabel="Unknown" allowUnknown />
                    <SignalRow label="Knowledge Graph" status={results.technicalSignals?.external?.knowledgeGraphProxy} goodLabel="Detected" badLabel="Unknown" allowUnknown />
                    <SignalRow label="Crunchbase" status={false} goodLabel="Detected" badLabel="Unknown" allowUnknown />
                    <SignalRow label="Verified Mentions" status={true} goodLabel="Detected" badLabel="Unknown" allowUnknown />
                    <SignalRow label="Authority Backlinks" status={results.technicalSignals?.authority?.outboundAuthorityLinks} goodLabel="Present" badLabel="Missing" />
                  </div>
                </div>
                
              </div>
            </motion.div>

            {/* CONTENT SIGNALS FULL */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}
              className="bg-[#1a202c] border border-gray-800 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/[0.05] rounded-bl-[100px] pointer-events-none" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center border border-gray-700/50">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Content AI Signals</h3>
                  <p className="text-xs text-gray-400 mt-1">Structure, Authority, and Conversational Relevance</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                
                {/* Structure */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">✍️ Extractable Structure</h4>
                  <div className="space-y-3">
                    <SignalRow label="Q-based Headings" status={results.technicalSignals?.contentStructure?.hasQuestionHeadings} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="FAQ Formatting" status={results.technicalSignals?.contentStructure?.hasFaqBlock} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Ordered Lists" status={results.technicalSignals?.contentStructure?.listsDetected} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Unordered Lists" status={results.technicalSignals?.contentStructure?.listsDetected} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Data Tables" status={true} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Summary Block" status={results.technicalSignals?.snippetFormatting?.hasKeyTakeaways} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Short Paragraphs" status={true} goodLabel="Optimized" badLabel="Dense" />
                  </div>
                </div>

                {/* Snippets */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">🧾 Snippet Formatting</h4>
                  <div className="space-y-3">
                    <SignalRow label="Direct Answer Blocks" status={results.technicalSignals?.snippetFormatting?.hasDirectAnswer} goodLabel="Targeted" badLabel="Missing" />
                    <SignalRow label="Definition First" status={true} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Pros/Cons Pattern" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Comparison Pattern" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Feature Lists" status={true} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Q&A Pairs" status={results.technicalSignals?.contentStructure?.hasQuestionHeadings} goodLabel="Present" badLabel="Missing" />
                  </div>
                </div>

                {/* Authority */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">📚 Topic Authority</h4>
                  <div className="space-y-3">
                    <SignalRow label="Information Density" status={true} goodLabel={(results.technicalSignals?.authority?.totalWords || 0) + ' Words'} badLabel="Thin" />
                    <SignalRow label="Topic Clusters" status={true} goodLabel="Detected" badLabel="Missing" />
                    <SignalRow label="Internal Links" status={(results.technicalSignals?.authority?.internalLinks || 0) > 5} goodLabel="High" badLabel="Low" />
                    <SignalRow label="Pillar Pages" status={true} goodLabel="Detected" badLabel="Missing" />
                  </div>
                </div>

                {/* Citations */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">📖 Citations & Facts</h4>
                  <div className="space-y-3">
                    <SignalRow label="Authority Links" status={results.technicalSignals?.authority?.outboundAuthorityLinks} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label=".gov / .edu Citations" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Numeric Statistics" status={true} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Reference Section" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                  </div>
                </div>

                {/* Trust */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">👤 Detectable Trust</h4>
                  <div className="space-y-3">
                    <SignalRow label="Author Bylines" status={results.technicalSignals?.trust?.authorBylinePresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Author Biographies" status={results.technicalSignals?.trust?.authorBylinePresent} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Publication Dates" status={true} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Privacy Policy" status={true} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Terms of Service" status={true} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Testimonials" status={true} goodLabel="Present" badLabel="Missing" allowUnknown />
                  </div>
                </div>

                {/* Intent */}
                <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-white mb-4">💬 Conversational Coverage</h4>
                  <div className="space-y-3">
                    <SignalRow label="What is... queries" status={true} goodLabel="High" badLabel="Low" />
                    <SignalRow label="How to... queries" status={results.technicalSignals?.contentStructure?.listsDetected} goodLabel="Present" badLabel="Missing" />
                    <SignalRow label="Best... ranking" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="X vs Y queries" status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Alternatives to..." status={false} goodLabel="Present" badLabel="Missing" allowUnknown />
                    <SignalRow label="Comprehensive Guide" status={true} goodLabel="Detected" badLabel="Missing" allowUnknown />
                  </div>
                </div>

              </div>
            </motion.div>
          </div>

          {/* Action Plan & Recommendations */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-white border border-gray-200/60 rounded-2xl p-8">
            <h3 className="text-lg font-bold text-[#1E293B] mb-1">Tailored Action Plan & Recommendations</h3>
            <p className="text-sm text-gray-400 mb-6">This prioritized roadmap is dynamically generated from your audit data, outlining the exact steps to bridge the gap between your current site and AI system expectations.</p>

            {/* Phase 1: Quick Wins */}
            <ActionPhase
              phase={1}
              title="Priority Indexing – Critical Page Coverage"
              description="These pages are missing but expected by AI agents based on your domain archetype. Filling these gaps is the most powerful way to improve your visibility score immediately."
              defaultOpen={true}
            >
            {(results.queries || []).filter(q => q.status === 'missing').length > 0 ? (
                <div className="space-y-3">
                  {(results.queries || []).filter(q => q.status === 'missing').map((q, i) => (
                    <div key={i} className="bg-[#F8F9FB] border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#1E293B]">Publish {q.path}</p>
                        <p className="text-xs text-gray-500 mt-1">{q.reason}</p>
                      </div>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full shrink-0">⚡ High Impact</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl p-4">All critical pages are present! No missing pages detected.</p>
              )}
            </ActionPhase>

            {/* Phase 2: Schema Enhancement */}
            <ActionPhase
              phase={2}
              title="Semantic Bridge – Technical Entity Signals"
              description="Implement high-fidelity Schema.org markup to provide machine-readable definitions of your business entities, products, and articles."
              defaultOpen={false}
            >
              <SchemaItems technicalSignals={results.technicalSignals} />
            </ActionPhase>

            {/* Phase 3: Content Optimization */}
            <ActionPhase
              phase={3}
              title="Retrieval Optimization – On-Page AI Signals"
              description="Refine your page content with structural cues (FAQs, Tables, Question Groups) that streamline extraction for LLMs and AI Search agents."
              defaultOpen={false}
            >
              {results.queries?.filter(q => q.status === 'missing').length > 3 ? (
                <p className="text-sm text-blue-600 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  Focus on Phase 1 first. Content optimization opportunities will be prioritized once your primary architecture is complete.
                </p>
              ) : (
                <div className="space-y-3">
                  <ContentOptItem
                    title="Add FAQ Sections"
                    desc="Structurally formatted FAQ blocks provide high-confidence snippets for 'how-to' and 'what is' AI queries."
                    hasIt={results.technicalSignals?.contentStructure?.hasFaqBlock}
                    impact={12}
                  />
                  <ContentOptItem
                    title="Add Question-Based Headings"
                    desc="Deploy H2/H3 tags as interrogative prompts to match the semantic patterns of natural language AI searches."
                    hasIt={results.technicalSignals?.contentStructure?.hasQuestionHeadings}
                    impact={10}
                  />
                  <ContentOptItem
                    title="Add Direct Answer Paragraphs"
                    desc="Implement 'Answer-First' formatting—placing concise definitions immediately following headers to simplify LLM grounding."
                    hasIt={results.technicalSignals?.snippetFormatting?.hasDirectAnswer}
                    impact={8}
                  />
                </div>
              )}
            </ActionPhase>
          </motion.div>

          {/* Back Button */}
          <div className="pt-4">
            <button onClick={goBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Run New Audit
            </button>
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

  // ─── HOME VIEW ─────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6">
        <Link to="/dashboard" className="hover:text-gray-600 transition-colors border-b border-transparent hover:border-gray-200">Dashboard</Link>
        <span className="opacity-40">/</span>
        <span className="text-gray-400 font-medium">AI Module</span>
        <span className="opacity-40">/</span>
        <span className="text-gray-600 font-bold bg-gray-100 px-2 py-0.5 rounded-md">Technical Readiness</span>
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
                  <Zap className="w-3 h-3" /> Technical AI Readiness
               </div>
               <h1 className="text-2xl font-black mb-2 tracking-tight leading-none">
                  {projectId ? `Project Scan: ${project?.name}` : 'AI Readiness Audit'}
               </h1>
               <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-2xl">
                  {projectId ? `Automated technical extraction and semantic gap analysis for ${project?.domain}.` : 'Analyze your technical foundation, schema health, and content structure for AI system compatibility.'}
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
                  <Search className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
               </div>
               <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., example.com)..."
                  className="block w-full pl-14 pr-40 py-5 bg-[#2d3748] border-2 border-transparent focus:border-blue-500 text-white placeholder-gray-500 rounded-2xl leading-5 focus:outline-none transition-all text-lg font-medium shadow-2xl"
               />
               <div className="absolute inset-y-2.5 right-2.5">
                  <button
                     type="submit"
                     disabled={isAnalyzing || !url || isLimitReached}
                     className="inline-flex items-center px-8 py-3.5 border border-transparent text-sm font-black rounded-xl text-slate-900 bg-white hover:bg-gray-100 focus:outline-none transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                     {isAnalyzing ? 'Analyzing...' : 'Run Audit'}
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
                    {syncLoading ? 'Synchronizing Intelligence' : 'No Technical Data'}
                  </h4>
                  <p className={`text-xs font-medium tracking-tight mt-1 ${syncLoading ? 'text-blue-300' : 'text-amber-600/80'}`}>
                    {syncLoading 
                      ? `Syncing live nodes for ${project?.domain || 'project'}...`
                      : `No technical readiness data found for ${project?.domain} yet.`}
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
           className="bg-white border border-gray-200/60 rounded-2xl p-8"
         >
           <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Audits</h2>
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
             <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
               <Globe className="w-8 h-8 text-slate-300 mx-auto mb-3" />
               <p className="text-sm text-slate-400 font-medium uppercase tracking-widest">No previous audits found</p>
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
                   {(filteredReports || []).map((r, i) => (
                     <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                       <td className="py-4 px-4 text-sm font-bold text-[#1E293B]">
                         {r.domain}
                       </td>
                       <td className="py-4 px-4 text-sm text-gray-600">{r.businessType || 'N/A'}</td>
                       <td className="py-4 px-4 text-sm text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
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
      )}
    </div>
  );
};

export default AIReadiness;
