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
      const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(query)}&limit=20&key=${CONFIG.GOOGLE_API_KEY}`;
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
              className="flex items-center gap-2 bg-white text-[#1a202c] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95 shrink-0"
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
                
                <div className="flex flex-col md:flex-row gap-6 mb-6 relative z-10">
                  {entity.image && (
                    <div className="shrink-0 self-center md:self-start">
                      <img 
                        src={entity.image} 
                        alt={entity.name}
                        className="w-24 h-24 rounded-2xl object-cover border border-gray-100 shadow-md"
                      />
                    </div>
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg mb-3">
                      {entity.types?.[0] || 'Entity'}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{entity.name}</h2>
                    <p className="text-gray-400 font-bold text-sm mb-4 italic">{entity.description || 'Google Knowledge Graph Entry'}</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-black uppercase tracking-tighter">
                        <LineChart className="w-4 h-4" /> Confidence: {entity.confidenceScore || 0}
                      </div>
                      {entity.kgId && (
                        <a 
                          href={`https://www.google.com/search?kgmid=${entity.kgId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-indigo-100 hover:border-indigo-300 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all hover:bg-white"
                        >
                          <Fingerprint className="w-4 h-4" /> ID: {entity.kgId}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {entity.detailedDescription && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-6 relative z-10">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Entity Synthesis</div>
                    <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                      {truncate(entity.detailedDescription, 400)}
                    </p>
                    {entity.descriptionUrl && (
                      <a href={entity.descriptionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors">
                        Read Full Article <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {entity.kgId && (
                    <a 
                      href={`https://www.google.com/search?kgmid=${entity.kgId}`} 
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

        {/* Info Grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: User, label: 'About You', desc: 'Identity check', color: 'bg-blue-50 text-blue-600' },
            { icon: Building, label: 'Your Brand', desc: 'Brand recognition', color: 'bg-emerald-50 text-emerald-600' },
            { icon: LineChart, label: 'Authority', desc: 'Brand ranking', color: 'bg-purple-50 text-purple-600' },
            { icon: Eye, label: 'Visibility', desc: 'Search presence', color: 'bg-indigo-50 text-indigo-600' }
          ].map((item, i) => (
            <div key={i} className="p-6 bg-white border border-gray-100 rounded-2xl text-center hover:border-indigo-200 transition-all shadow-sm group hover:-translate-y-1">
              <div className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${item.color}`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h4 className="font-black text-gray-900 mb-1 uppercase tracking-tight text-sm">{item.label}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.desc}</p>
            </div>
          ))}
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
                  <button 
                    onClick={() => downloadPDF('brand-audit-results', `Brand_Audit_${pendingQuery}`)}
                    className="p-3.5 bg-gray-50 hover:bg-white text-gray-400 hover:text-indigo-600 rounded-2xl transition-all border border-gray-100 hover:border-indigo-100 group shadow-sm"
                    title="Download Report"
                  >
                    <FileDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
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

        {/* Info Grid */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: User, label: 'About You', desc: 'Identity check', color: 'bg-blue-50 text-blue-600' },
            { icon: Building, label: 'Your Brand', desc: 'Brand recognition', color: 'bg-emerald-50 text-emerald-600' },
            { icon: LineChart, label: 'Authority', desc: 'Brand ranking', color: 'bg-purple-50 text-purple-600' },
            { icon: Eye, label: 'Visibility', desc: 'Search presence', color: 'bg-indigo-50 text-indigo-600' }
          ].map((item, i) => (
            <div key={i} className="p-8 bg-white border border-gray-100 rounded-[32px] text-center hover:border-indigo-200 transition-all shadow-sm group hover:-translate-y-1">
              <div className={`w-14 h-14 mx-auto mb-5 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 ${item.color}`}>
                <item.icon className="w-7 h-7" />
              </div>
              <h4 className="font-black text-gray-900 mb-1 uppercase tracking-tight text-sm">{item.label}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.desc}</p>
            </div>
          ))}
        </div>
    </div>
  );
};

export default BrandAudit;
