import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Folder, 
  Search, 
  Globe, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  MoreVertical,
  BarChart3,
  X,
  CheckCircle2,
  Loader2,
  Building2,
  Hash,
  Clock,
  MoreHorizontal,
  Zap
} from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { downloadPDF } from '../utils/downloadPDF';
import { markets } from '../utils/markets';
import { FileDown } from 'lucide-react';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProject, setNewProject] = useState({
    name: '',
    brandName: '',
    domain: '',
    prompts: '',
    competitors: '',
    market: markets.find(m => m.name === 'India') || markets[103] // Default to India
  });
  const [isCreating, setIsCreating] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [marketType, setMarketType] = useState('country'); // 'country' or 'region'
  const navigate = useNavigate();
  const { user } = useAuth();

  const tier = user?.subscription?.tier || 'starter';
  const totalScans = tier === 'professional' ? 20 : (tier === 'growth' ? 15 : 10);
  const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;
  const scansLeft = Math.max(0, totalScans - scansUsed);
  const promptsPerProject = tier === 'professional' ? 25 : (tier === 'growth' ? 10 : 2);

  const stats = [
    { label: 'AI Scans Used', value: `${scansUsed}`, total: totalScans },
    { 
      label: 'Current Tier', 
      value: tier, 
      highlight: true,
      isTierCard: true,
      details: [
        { label: 'Total Scans', value: totalScans },
        { label: 'Scans Left', value: scansLeft },
        { label: 'Prompts / Project', value: promptsPerProject }
      ]
    },
    { label: 'Active Projects', value: projects.length.toString() },
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      // Fetch latest snapshot for each project to show score
      const projectsWithScores = await Promise.all(data.map(async (p) => {
        try {
          const hist = await api.get(`/projects/${p._id}/history`);
          return { ...p, latestScore: hist.data[0]?.overallScore || 0 };
        } catch {
          return { ...p, latestScore: 0 };
        }
      }));
      setProjects(projectsWithScores);
    } catch (err) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = scansLeft <= 0 || user?.subscription?.status === 'expired';
  const isExpired = user?.subscription?.status === 'expired';

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const tier = user?.subscription?.tier || 'starter';
    const totalScans = tier === 'professional' ? 20 : (tier === 'growth' ? 15 : 10);
    const scansUsed = user?.subscription?.promptsUsedThisMonth || 0;

    if (user?.subscription?.status === 'expired' || scansUsed >= totalScans) {
      toast.error(scansUsed >= totalScans 
        ? 'Monthly scan limit reached. Please upgrade your plan for more scans.'
        : 'Your free trial has expired. Please upgrade your plan to create new projects.');
      navigate('/dashboard/pricing');
      return;
    }
    const loadingToast = toast.loading('Creating project...');
    setIsCreating(true);
    
    try {
      const formattedProject = {
        ...newProject,
        prompts: (newProject.prompts || '').split(',').map(k => k.trim()).filter(k => k),
        competitors: (newProject.competitors || '').split(',').map(c => ({ domain: c.trim() })).filter(c => c.domain)
      };
      await api.post('/projects', formattedProject);
      toast.success('Project created successfully', { id: loadingToast });
      setIsModalOpen(false);
      setNewProject({ 
        name: '', 
        brandName: '',
        domain: '', 
        prompts: '',
        competitors: '',
        market: markets[0]
      });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project', { id: loadingToast });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project? All historical data will be lost.')) return;
    
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEngineColor = (score) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-blue-500';
    return 'text-slate-300';
  };

  return (
    <div className="min-h-screen bg-gray-50" id="projects-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <AnimatePresence>
          {isLimitReached && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
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
        

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-gray-200/60 p-6 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-500/20 transition-all"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-[40px] -mr-12 -mt-12 group-hover:bg-blue-100/50 transition-all" />
              <p className="text-[10px] text-[#1E293B] uppercase tracking-widest font-bold mb-3">{stat.label}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <h3 className={`${stat.isTierCard ? 'text-2xl capitalize' : 'text-4xl'} font-bold tracking-tight ${stat.highlight ? 'text-blue-600' : 'text-[#1E293B]'}`}>
                    {stat.value}
                  </h3>
                  {stat.total && <span className="text-gray-400 font-semibold text-sm">/ {stat.total}</span>}
                </div>
                {stat.details && (
                  <div className="flex gap-4 mt-2 border-t border-gray-100 pt-3">
                    {stat.details.map((d, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">{d.label}</span>
                        <span className="text-xs font-bold text-gray-700">{d.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage and monitor your brand visibility projects</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={isExpired}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {isExpired ? 'Upgrade to Create' : 'New Project'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading your projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white border border-slate-900 rounded-lg p-12 text-center shadow-sm">
            <Folder className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="text-lg font-black text-black mb-2 uppercase tracking-tight">No projects found</h3>
            <p className="text-sm text-black font-bold mb-6">
              {searchTerm ? 'Try adjusting your search' : 'Get started by creating your first project'}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project, i) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                id={`project-card-${project._id}`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <Globe className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{project.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">{project.brandName}</span>
                          </div>
                          {project.competitors?.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-full uppercase tracking-widest border border-blue-100">
                              {project.competitors.length} RIVAL{project.competitors.length > 1 ? 'S' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Button */}
                    <div className="flex items-center gap-4">
                     {/* Score Gauge */}
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                          <circle cx="50" cy="50" r="44" fill="none" stroke="#3b82f6" strokeWidth="10"
                            strokeDasharray={`${2 * Math.PI * 44}`}
                            strokeDashoffset={`${2 * Math.PI * 44 * (1 - (project.latestScore || 0) / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-black text-slate-900">{(project.latestScore || 0)}%</span>
                        </div>
                      </div>
                      <div className="text-left hidden sm:block">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                          GEO INDEX
                        </div>
                      </div>
                    </div>
                      
                      {/* Menu Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === project._id ? null : project._id);
                          }}
                          className="p-1 hover:bg-slate-50 rounded transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                        </button>
                        
                        {activeMenu === project._id && (
                          <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadPDF(`project-card-${project._id}`, `${project.name}_Report.pdf`);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileDown className="w-3 h-3" />
                              Export PDF
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/projects/${project._id}`);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <BarChart3 className="w-3 h-3" />
                              View Details
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(project._id, e)}
                              className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Engine Favorability & Domain */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[120px]">{project.domain}</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5" title="OpenAI Favorability">
                        <span className={`text-[8px] font-black ${getEngineColor(project.latestSnapshot?.engineScores?.openai || 0)}`}>GPT</span>
                      </div>
                      <div className="w-px h-2.5 bg-slate-200" />
                      <div className="flex items-center gap-1.5" title="Gemini Favorability">
                        <span className={`text-[8px] font-black ${getEngineColor(project.latestSnapshot?.engineScores?.gemini || 0)}`}>GEM</span>
                      </div>
                    </div>
                  </div>

                  {/* Prompts */}
                  {project.prompts && project.prompts.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-2">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-tight">Prompts</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {project.prompts.slice(0, 2).map((promptText, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-semibold rounded"
                          >
                            {promptText.length > 12 ? promptText.substring(0, 12) + '...' : promptText}
                          </span>
                        ))}
                        {project.prompts.length > 2 && (
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-semibold rounded">
                            +{project.prompts.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        {project.lastScanAt 
                          ? new Date(project.lastScanAt).toLocaleDateString() 
                          : 'Not scanned'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/30"
              />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Create Project</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Define brand & localization</p>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                  <form onSubmit={handleCreateProject} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Project Name
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Nike Performance"
                        value={newProject.name}
                        onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Brand Name
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Nike"
                        value={newProject.brandName}
                        onChange={(e) => setNewProject({...newProject, brandName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Domain / Website
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. nike.com"
                        value={newProject.domain}
                        onChange={(e) => setNewProject({...newProject, domain: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-4 pt-2 border-t border-gray-50 mt-2">
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Market Selection Strategy
                      </label>
                      
                      <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setMarketType('country');
                            setNewProject({ ...newProject, market: markets.find(m => m.type === 'country') });
                          }}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${marketType === 'country' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Specific Country
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMarketType('region');
                            setNewProject({ ...newProject, market: markets.find(m => m.type === 'region') });
                          }}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${marketType === 'region' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Region
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                          <span>{marketType === 'region' ? 'Select Region' : 'Select Country'}</span>
                          <span className="text-blue-500 lowercase font-medium">{newProject.market?.name}</span>
                        </label>
                        <div className="relative group/market">
                          <select
                            value={newProject.market?.code}
                            onChange={(e) => {
                              const market = markets.find(m => m.code === e.target.value);
                              setNewProject({ ...newProject, market });
                            }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none appearance-none cursor-pointer"
                          >
                            {marketType === 'region' ? (
                              markets.filter(m => m.type === 'region').map(m => (
                                <option key={m.code} value={m.code}>{m.name}</option>
                              ))
                            ) : (
                              markets.filter(m => m.type === 'country').map(m => (
                                <option key={m.code} value={m.code}>{m.name}</option>
                              ))
                            )}
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic">
                          {newProject.market?.context || 'AI results will be tailored for this market.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Audit Prompts</span>
                        <span className="text-blue-600">
                          Max: {user?.subscription?.tier === 'professional' ? 25 : user?.subscription?.tier === 'growth' ? 10 : 2}
                        </span>
                      </label>
                      <textarea 
                        placeholder="e.g. best sports shoes, running shoes guide"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium min-h-[80px]"
                        value={newProject.prompts}
                        onChange={(e) => {
                          const val = e.target.value;
                          const count = val.split(',').filter(k => k.trim()).length;
                          const limit = user?.subscription?.tier === 'professional' ? 25 : user?.subscription?.tier === 'growth' ? 10 : 2;
                          
                          if (count > limit) {
                            toast.error(`Your ${user?.subscription?.tier || 'Free'} plan is limited to ${limit} prompts per project.`);
                            return;
                          }
                          setNewProject({...newProject, prompts: val});
                        }}
                      />
                      <p className="text-[10px] text-slate-400 font-medium mt-1.5">Separate multiple prompts with commas</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Competitors (Optional)</span>
                        <span className="text-xs normal-case font-medium text-slate-500">Leave blank for AI discovery</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. competitor1.com, competitor2.com"
                        value={newProject.competitors}
                        onChange={(e) => setNewProject({...newProject, competitors: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                      />
                      <p className="text-[10px] text-slate-400 font-medium mt-1.5">Domains separated by commas</p>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="flex-3 px-6 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Launch Project'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Projects;