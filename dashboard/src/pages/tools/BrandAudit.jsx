import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useParams } from 'react-router-dom';
import { 
  Search, Brain, ShieldCheck, Globe, Zap, Fingerprint, 
  ExternalLink, LineChart, Crown, Info, Trophy,
  AlertTriangle, ChevronRight, 
  Loader2, Mail, Phone, User, Building, Eye,
  ArrowRight, ArrowLeft, CheckCircle2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '../../context/ProjectContext';
import toast from 'react-hot-toast';
import { downloadPDF } from '../../utils/downloadPDF';
import { FileDown, FileText } from 'lucide-react';

const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSyCVm4RJrXa0-_yizZL44KrU3T528UgzSv4',
  LEAD_EMAIL: 'vishalyadavdgtl@gmail.com'
};

const BrandAudit = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { project: contextProject, history: contextHistory, loading: projectLoading } = useProject();

  const [input, setInput] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncLoading, setSyncLoading] = useState(!!projectId);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setPendingQuery(input.trim());
    performSearch(input.trim());
  };

  const performSearch = async (query) => {
    setLoading(true);
    setResults(null);
    try {
      // PROPER FIX: Use a higher limit (Google max is usually around 500 per request, but let's go for 100)
      // Note: limit=10000 might hit quota or timeouts, 100 is safer but providing a broader set
      const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&limit=100&key=${CONFIG.GOOGLE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch results (${response.status})`);
      const data = await response.json();
      setResults(data);
      
      if (data.itemListElement?.length > 0) {
        saveReport(query, data);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async (query, data) => {
    setIsSaving(true);
    try {
      const reportData = {
        query,
        timestamp: new Date().toISOString(),
        topScore: Math.round(data.itemListElement?.[0]?.resultScore || 0),
        topEntity: data.itemListElement?.[0]?.result?.name || '',
        data: data,
        id: Date.now()
      };
      
      const existingReports = JSON.parse(localStorage.getItem('brand_audit_reports') || '[]');
      const updatedReports = [reportData, ...existingReports].slice(0, 20);
      localStorage.setItem('brand_audit_reports', JSON.stringify(updatedReports));
      setReports(updatedReports);
    } catch (error) {
      console.error('Failed to save report:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved reports for standalone mode
  useEffect(() => {
    if (!projectId) {
      const saved = JSON.parse(localStorage.getItem('brand_audit_reports') || '[]');
      setReports(saved);
    }
  }, [projectId]);

  // PROJECT MODE: Read from snapshot data (same pattern as AIVisibilityAudit)
  useEffect(() => {
    if (projectId) {
      if (contextHistory && contextHistory.length > 0) {
        const latest = contextHistory[0];
        if (latest.brandAudit) {
          setResults(latest.brandAudit);
          setPendingQuery(latest.brandAudit.query || contextProject?.brandName || '');
        } else {
          setResults(null);
        }
      }
      setSyncLoading(false);
    }
  }, [projectId, contextHistory]);

  const cleanId = (id) => id?.startsWith('kg:') ? id.substring(3) : id;

  const truncate = (text, length) => 
    text?.length > length ? text.substring(0, length).trim() + '...' : text;

  const getDomain = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  };

  // ─── PROJECT MODE: SYNC LOADING ────────────────────────────
  if (projectId && (syncLoading || projectLoading) && !results) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 relative">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl animate-ping opacity-20" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2 text-center">Synchronizing Intelligence</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] text-center">Loading brand audit data...</p>
      </div>
    );
  }

  // ─── PROJECT MODE: RESULTS VIEW (No search bar) ────────────
  if (projectId && results) {
    const entities = results.entities || [];
    const brandName = contextProject?.brandName || contextProject?.name || results.query || '';

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" id="brand-audit-results">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6">
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-400">AI Module</span>
          <span>›</span>
          <span className="text-gray-600 font-medium">Brand Audit</span>
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
              <div className="bg-blue-600/10 border border-blue-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 rounded-xl p-2.5 animate-pulse shadow-lg shadow-blue-500/20">
                    <RefreshCw className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">Comprehensive Scan in Progress</h4>
                    <p className="text-[11px] text-blue-700 font-bold opacity-70 uppercase tracking-widest mt-0.5">Updating Knowledge Graph nodes & Digital Authority (30-60s) • Live sync active</p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-3">
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 rounded-lg border border-blue-100">
                    <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Processing Node</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Fingerprint className="w-3 h-3" /> Knowledge Graph Synced
              </div>
              <h1 className="text-3xl font-black mb-2 tracking-tight">Brand Audit Report</h1>
              <p className="text-slate-400 text-sm font-medium">
                Google Knowledge Graph analysis for <span className="text-white font-bold">{brandName}</span> · {entities.length} {entities.length === 1 ? 'entity' : 'entities'} found
              </p>
            </div>
            <button 
              onClick={() => downloadPDF('brand-audit-results', `Brand_Audit_${brandName}`)}
              className="flex items-center gap-2 bg-white text-[#1a202c] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </motion.div>

        {/* Results */}
        {entities.length > 0 ? (
          <div className="space-y-4">
            {entities.map((entity, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/70 backdrop-blur-md border border-white/40 rounded-3xl p-8 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden group"
              >
                {/* Decorative Background Glows */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-indigo-500/10 transition-colors" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-[80px] -ml-30 -mb-30 transition-colors group-hover:bg-emerald-500/10" />

                <div className="flex flex-col md:flex-row gap-8 mb-8 relative z-10">
                  {entity.image && (
                    <div className="shrink-0 self-center md:self-start">
                      <div className="p-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 group-hover:scale-105 transition-transform duration-500">
                        <img 
                          src={entity.image} 
                          alt={entity.name}
                          className="w-32 h-32 rounded-xl object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                      {entity.types?.slice(0, 3).map((type, tIdx) => (
                        <span key={tIdx} className="px-3 py-1 bg-indigo-50/80 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100/50 backdrop-blur-sm">
                          {type}
                        </span>
                      ))}
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">{entity.name}</h2>
                    <p className="text-gray-400 font-bold text-sm mb-6 italic">{entity.description || 'Google Knowledge Graph Entry'}</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 text-emerald-600 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm">
                        <LineChart className="w-4 h-4" /> 
                        Confidence: <span className="text-emerald-700 ml-1">{entity.confidenceScore || 0}%</span>
                      </div>
                      
                      {entity.kgId && (
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm">
                          <Fingerprint className="w-4 h-4" /> ID: <span className="text-slate-700 ml-1 truncate max-w-[80px]">{entity.kgId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {entity.detailedDescription && (
                  <div className="bg-slate-50/50 backdrop-blur-sm border border-slate-100 rounded-3xl p-8 mb-8 relative z-10 hover:bg-white/80 transition-colors duration-300">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      <Brain className="w-3.5 h-3.5" /> Entity Synthesis
                    </div>
                    <p className="text-[14px] text-slate-600 leading-relaxed font-bold">
                      {truncate(entity.detailedDescription, 500)}
                    </p>
                    {entity.descriptionUrl && (
                      <a 
                        href={entity.descriptionUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-2 mt-6 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:translate-x-1 transition-all"
                      >
                        Read Full Insight <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  {entity.kgId && (
                    <a 
                      href={`https://www.google.com/search?kgmid=${entity.kgId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 hover:shadow-lg transition-all duration-300 flex items-center gap-4 group/link shadow-sm"
                    >
                      <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover/link:scale-110 group-hover/link:bg-purple-100 transition-all duration-300">
                        <Fingerprint className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Knowledge Node</p>
                        <p className="text-xs font-black text-slate-900 truncate">Google ID: {entity.kgId}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover/link:text-indigo-600 group-hover/link:translate-x-0.5 transition-all" />
                    </a>
                  )}

                  {entity.url && (
                    <a 
                      href={entity.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-5 bg-white border border-slate-100 rounded-3xl hover:border-emerald-200 hover:shadow-lg transition-all duration-300 flex items-center gap-4 group/link shadow-sm"
                    >
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover/link:scale-110 group-hover/link:bg-emerald-100 transition-all duration-300">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Official Domain</p>
                        <p className="text-xs font-black text-slate-900 truncate">{getDomain(entity.url)}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover/link:text-emerald-600 group-hover/link:translate-x-0.5 transition-all" />
                    </a>
                  )}

                  {entity.descriptionUrl && (
                    <a 
                      href={entity.descriptionUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-lg transition-all duration-300 flex items-center gap-4 group/link shadow-sm"
                    >
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover/link:scale-110 group-hover/link:bg-blue-100 transition-all duration-300">
                        <Info className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Source</p>
                        <p className="text-xs font-black text-slate-900 truncate">{getDomain(entity.descriptionUrl)}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-300 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Fingerprint className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Knowledge Graph Data</h3>
            <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
              No entities were found for <span className="font-bold text-slate-700">{brandName}</span> in the Google Knowledge Graph. Run a <span className="font-bold">Comprehensive Scan</span> from the project dashboard to generate this data.
            </p>
          </div>
        )}

        {/* Compact Info Grid */}
        <div className="mt-12 bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden max-w-5xl mx-auto">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] -mr-24 -mt-24" />
          
          <div className="text-center mb-8 relative z-10">
            <h3 className="text-lg font-black text-slate-800 flex items-center justify-center gap-2 tracking-tight">
              <span className="text-xl">💡</span> What you'll discover about your digital presence
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {[
              { icon: User, label: 'About You', desc: 'See if Google recognizes you as a person or entity', color: 'bg-blue-50 text-blue-600' },
              { icon: Building, label: 'Your Brand', desc: 'Check how your business appears in Google\'s knowledge', color: 'bg-emerald-50 text-emerald-600' },
              { icon: LineChart, label: 'Authority Score', desc: 'Get your digital brand authority rating', color: 'bg-purple-50 text-purple-600' },
              { icon: Eye, label: 'Visibility', desc: 'Measure your Google search presence', color: 'bg-indigo-50 text-indigo-600' }
            ].map((item, i) => (
              <div key={i} className="text-center group px-2">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-900 mb-1 uppercase tracking-tighter text-[11px]">{item.label}</h4>
                <p className="text-[10px] font-bold text-slate-400 leading-tight max-w-[120px] mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center relative z-10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              This tool analyzes your digital footprint using authentic Google data
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── PROJECT MODE: No Data ─────────────────────────────────
  if (projectId && !results && !syncLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6">
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-400">AI Module</span>
          <span>›</span>
          <span className="text-gray-600 font-medium">Brand Audit</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a202c] text-white p-8 rounded-2xl mb-8 relative overflow-hidden"
        >
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Brand Audit</h1>
            <p className="text-slate-400 text-sm font-medium">
              Google Knowledge Graph analysis for <span className="text-white font-bold">{contextProject?.brandName || contextProject?.name || 'your brand'}</span>
            </p>
          </div>
          <div className="mt-6 bg-slate-700/50 border border-slate-600 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center shrink-0">
              <Fingerprint className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-300">No Data Available</h4>
              <p className="text-xs text-slate-500 font-medium">
                Run a <span className="text-indigo-400 font-bold">Comprehensive Scan</span> from the Project Overview to generate Brand Audit data.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── STANDALONE MODE: Full search UI (when not in a project) ──────
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 pt-6">
          <Link to="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
          <span>›</span>
          <span className="text-gray-400">AI Module</span>
          <span>›</span>
          <button 
            onClick={() => setResults(null)} 
            className={`transition-colors font-medium ${results ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 cursor-default'}`}
          >
            Brand Audit
          </button>
          {results && (
            <>
              <span>›</span>
              <span className="text-gray-600 font-medium tracking-tight">Report</span>
            </>
          )}
        </div>

        {/* Dark Header */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1a202c] text-white p-6 rounded-2xl mb-8 shadow-xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          
          <div className="relative z-10 mb-8">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Brand Audit Explorer</h1>
            <p className="text-slate-400 text-sm font-medium">Check your Google visibility and digital brand authority across the Knowledge Graph.</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative group max-w-4xl z-10">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </div>
            <input
              id="audit-query"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your name, brand, or topic..."
              className="block w-full pl-14 pr-44 py-5 bg-[#2d3748] border-2 border-transparent focus:border-indigo-500 text-white placeholder-slate-500 rounded-2xl focus:outline-none transition-all text-lg font-bold shadow-2xl"
            />
            <div className="absolute inset-y-2.5 right-2.5">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <Zap className="mr-2 h-4 w-4 fill-current" />
                    Analyze
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 mt-6 relative z-10">
            {['Elon Musk', 'Apple Inc', 'New York', 'Bitcoin'].map(example => (
              <button 
                key={example}
                onClick={() => {
                  setInput(example);
                  setPendingQuery(example);
                  performSearch(example);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-white/5"
              >
                {example}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
            <span className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-shadow">
              <LineChart className="w-3.5 h-3.5 text-emerald-500" /> Confidence Score
            </span>
            <span className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-shadow">
              <Crown className="w-3.5 h-3.5 text-amber-500" /> Digital Authority
            </span>
            <span className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-shadow">
              <Brain className="w-3.5 h-3.5 text-indigo-500" /> Graph Analysis
            </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 relative">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl animate-ping opacity-20" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Analyzing Intelligence</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Checking Knowledge Graph & Digital Authority...</p>
          </div>
        )}

        {/* Results */}
        <div id="brand-audit-results" className="space-y-6">
          {results && (
            <>
              <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Found {results.itemListElement?.length || 0} result{results.itemListElement?.length !== 1 ? 's' : ''}
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">For query: {pendingQuery}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                 
                </div>
              </div>

              {results.itemListElement?.map((item, i) => {
                const entity = item.result;
                const score = Math.round(item.resultScore);
                const id = cleanId(entity['@id']);
                const image = entity.image?.contentUrl;
                const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type'] || 'Thing'];

                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                    
                    <div className="flex flex-col md:flex-row gap-8 mb-8 relative z-10">
                      {image && (
                        <div className="shrink-0 self-center md:self-start">
                          <img 
                            src={image} 
                            alt={entity.name}
                            className="w-28 h-28 rounded-2xl object-cover border border-gray-100 shadow-md"
                          />
                        </div>
                      )}
                      <div className="flex-1 text-center md:text-left">
                        <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg mb-3">
                          {types[0]}
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">{entity.name}</h2>
                        <p className="text-gray-400 font-bold text-sm mb-5 italic">{entity.description || 'Google Knowledge Graph Entry'}</p>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-3">
                          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-tighter">
                            <LineChart className="w-4 h-4" /> Confidence: {score}
                          </div>
                          {id && (
                            <a 
                              href={`https://www.google.com/search?kgmid=${id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-indigo-100 hover:border-indigo-300 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all hover:bg-white"
                            >
                              <Fingerprint className="w-4 h-4" /> ID: {id}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {entity.detailedDescription?.articleBody && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 relative z-10">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Entity Synthesis</div>
                        <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                          {truncate(entity.detailedDescription.articleBody, 400)}
                        </p>
                        {entity.detailedDescription.url && (
                          <a href={entity.detailedDescription.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors">
                            Read Full Article <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                      {id && (
                        <a 
                          href={`https://www.google.com/search?kgmid=${id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all flex items-center gap-4 group/link shadow-sm"
                        >
                          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover/link:scale-110 transition-transform">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Search Result</p>
                            <p className="text-xs font-bold text-gray-700 truncate">Google Search Node</p>
                          </div>
                          <ExternalLink className="w-4 h-4 ml-auto text-gray-300 group-hover/link:text-indigo-600 transition-colors" />
                        </a>
                      )}
                      {entity.url && (
                        <a 
                          href={entity.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-5 py-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all flex items-center gap-4 group/link shadow-sm"
                        >
                          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover/link:scale-110 transition-transform">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Official Site</p>
                            <p className="text-xs font-bold text-gray-700 truncate">{getDomain(entity.url)}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 ml-auto text-gray-300 group-hover/link:text-indigo-600 transition-colors" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}

          {!results && !loading && (
            <div className="space-y-8">
               <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                   <div>
                     <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Audits</h2>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">History of your analytical queries</p>
                   </div>
                   {reports.length > 0 && (
                     <div className="relative w-full md:w-64">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input
                         type="text"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder="Search audits..."
                         className="w-full bg-[#F8F9FB] border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                       />
                     </div>
                   )}
                 </div>
                 
                 {reports.length === 0 ? (
                   <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                     <Globe className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                     <p className="text-sm text-slate-400 font-medium uppercase tracking-widest leading-none">No previous audits found</p>
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead>
                         <tr className="border-b border-gray-100">
                           <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                           <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence</th>
                           <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                           <th className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                         </tr>
                       </thead>
                       <tbody>
                         {reports
                           .filter(r => r.query.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       r.topEntity?.toLowerCase().includes(searchQuery.toLowerCase()))
                           .map((report) => (
                           <tr key={report.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                             <td className="py-4 px-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                   <FileText className="w-4 h-4" />
                                 </div>
                                 <div>
                                   <p className="text-sm font-bold text-slate-900 leading-none mb-1">{report.query}</p>
                                   <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{report.topEntity}</p>
                                 </div>
                               </div>
                             </td>
                             <td className="py-4 px-4">
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black tracking-tight">
                                 {report.topScore}% RELIABILITY
                               </span>
                             </td>
                             <td className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase text-center">
                               {new Date(report.timestamp).toLocaleDateString()}
                             </td>
                             <td className="py-4 px-4 text-right">
                               <button
                                 onClick={() => {
                                   if (report.data) {
                                     setResults(report.data);
                                     setPendingQuery(report.query);
                                     setInput(report.query);
                                   } else {
                                     setInput(report.query);
                                     performSearch(report.query);
                                   }
                                 }}
                                 className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 ml-auto"
                               >
                                 View Results <ArrowRight className="w-3 h-3" />
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </div>
          )}
        </div>

        {/* Compact Info Grid */}
        <div className="mt-12 bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden max-w-5xl mx-auto">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] -mr-24 -mt-24" />
          
          <div className="text-center mb-8 relative z-10">
            <h3 className="text-lg font-black text-slate-800 flex items-center justify-center gap-2 tracking-tight">
              <span className="text-xl">💡</span> What you'll discover about your digital presence
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {[
              { icon: User, label: 'About You', desc: 'See if Google recognizes you as a person or entity', color: 'bg-blue-50 text-blue-600' },
              { icon: Building, label: 'Your Brand', desc: 'Check how your business appears in Google\'s knowledge', color: 'bg-emerald-50 text-emerald-600' },
              { icon: LineChart, label: 'Authority Score', desc: 'Get your digital brand authority rating', color: 'bg-purple-50 text-purple-600' },
              { icon: Eye, label: 'Visibility', desc: 'Measure your Google search presence', color: 'bg-indigo-50 text-indigo-600' }
            ].map((item, i) => (
              <div key={i} className="text-center group px-2">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-900 mb-1 uppercase tracking-tighter text-[11px]">{item.label}</h4>
                <p className="text-[10px] font-bold text-slate-400 leading-tight max-w-[120px] mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center relative z-10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              This tool analyzes your digital footprint using authentic Google data
            </p>
          </div>
        </div>
    </div>
  );
};

export default BrandAudit;
