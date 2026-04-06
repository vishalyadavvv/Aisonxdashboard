import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, matchPath, useNavigate } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Database, 
  Brain, 
  FileText, 
  LineChart, 
  ShieldCheck, 
  Edit3, 
  Zap, 
  Users, 
  Folder, 
  Globe, 
  DollarSign, 
  Mail, 
  HelpCircle, 
  Settings,
  CreditCard,
  ChevronRight,
  LogOut,
  Search,
  X,
  ChevronDown,
  Sparkles,
  Shield,
  Target,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const RailItem = ({ to, icon: Icon, label, badge, active }) => (
  <Link
    to={to}
    className={cn(
      "group relative flex flex-col items-start w-full py-4 pl-5 transition-all duration-300",
      active ? "text-white" : "text-gray-500 hover:text-gray-300"
    )}
  >
    <div className={cn(
      "p-2.5 rounded-2xl transition-all duration-300 mb-1",
      active ? "bg-white/10 shadow-lg text-white" : "text-gray-500 group-hover:text-gray-300 group-hover:bg-white/5"
    )}>
      <Icon className="w-5 h-5 stroke-[1.5]" />
    </div>
    <span className={cn("text-[10px] font-bold tracking-tight", active ? "text-white" : "text-gray-500")}>{label}</span>
    {badge && (
      <span className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#0a0e1a]" />
    )}
    {active && (
      <div className="absolute -right-[1px] top-1/2 -translate-y-1/2 w-0.5 h-8 bg-blue-500 rounded-l-full shadow-[0_0_10px_rgba(59,130,246,0.5)] md:block hidden" />
    )}
  </Link>
);

const ContextItem = ({ to, icon: Icon, label, badge, isChild, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) => cn(
      "flex items-center justify-between px-2 py-3 rounded-xl transition-all duration-300 group text-[13px] font-medium",
      isActive 
        ? "bg-blue-600/10 text-white border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]" 
        : "text-slate-200 hover:text-white hover:bg-white/5",
      isChild && "pl-8 py-2 border-l border-white/5 ml-2 rounded-l-none"
    )}
  >
    {({ isActive }) => (
      <>
        <div className="flex items-center gap-3">
          {Icon && <Icon className={cn("w-4 h-4 stroke-[1.5]", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />}
          <span>{label}</span>
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            {badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const SidebarSection = ({ title, children }) => (
  <div className="mb-4 last:mb-0">
    <h3 className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">
      {title}
    </h3>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const NavItem = ({ to, icon: Icon, label, badge, hasDropdown, isChild, end }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(
        "flex items-center justify-between px-2 py-2.5 rounded-xl transition-all duration-300 group text-sm font-medium",
        isActive 
          ? "bg-white/10 text-white border border-white/10" 
          : "text-white/70 hover:bg-white/5 hover:text-white",
        isChild && "pl-8 py-1.5"
      )}
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            {Icon && <Icon className={cn("w-4 h-4 stroke-[1.5]", isActive ? "text-white" : "text-white/40 group-hover:text-white/70")} />}
            <span>{label}</span>
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="bg-blue-500 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-lg shadow-blue-500/20">
                {badge}
              </span>
            )}
            {hasDropdown && <ChevronDown className="w-3.5 h-3.5 text-white/70" />}
          </div>
        </>
      )}
    </NavLink>
  );
};

const Sidebar = ({ logout, isOpen, setIsOpen }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const projectMatch = matchPath({ path: "/dashboard/projects/:projectId/*" }, location.pathname) 
                       || matchPath({ path: "/dashboard/projects/:projectId" }, location.pathname);
  const projectId = projectMatch?.params?.projectId;
  const isProjectContext = !!projectId && projectId !== 'new';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, []);

  const currentProject = projects.find(p => p._id === projectId);

  const getSidebarCategory = () => {
    const path = location.pathname;
    if (path.includes('/projects') || path === '/dashboard' || 
        ['/orders', '/inquiries', '/settings', '/pricing', '/help'].some(p => path.includes(p))) {
      return 'projects';
    }
    if (path.includes('/audit') || path.includes('/profiler') || path.includes('/search') || path.includes('/readiness') || path.includes('/brand-audit')) {
      return 'ai_module';
    }
    return 'projects';
  };

  const category = getSidebarCategory();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen flex transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Primary Rail */}
        <aside className="w-[72px] h-full bg-[#0a0e1a] border-r border-white/5 flex flex-col items-stretch py-8 overflow-y-auto no-scrollbar">
          <Link to="/dashboard" className="mb-10 flex flex-col items-start pl-5 gap-2 group">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all">
               <img src="/logo.png" className="w-8 h-8 object-contain" alt="Logo" />
            </div>
          </Link>

          <div className="flex-1 w-full space-y-2">
            <RailItem 
              to="/dashboard/projects" 
              icon={Home} 
              label="Projects" 
              active={category === 'projects'}
            />

            {/* AI MODULE DIVIDER */}
            <div className="w-full h-px bg-white/5 my-4 max-w-[40px] ml-5" />
            <div className="w-full flex justify-start pl-5 mb-1">
              <span className="text-[7px] text-blue-500/80 font-black uppercase tracking-[0.1em] select-none text-left">AI MODULE</span>
            </div>

            <RailItem 
              to="/dashboard/audit" 
              icon={Brain} 
              label="AI Module" 
              active={category === 'ai_module'}
              badge
            />
          </div>

          <div className="mt-auto w-full space-y-4">
            <Link 
              to="/dashboard/settings"
              className={cn(
                "w-full flex justify-center py-2 transition-colors",
                location.pathname === '/dashboard/settings' ? "text-blue-400" : "text-gray-500 hover:text-white"
              )}
            >
              <Settings className="w-6 h-6" />
            </Link>
            <button 
              onClick={logout}
              className="w-full flex justify-center text-gray-500 hover:text-red-400 transition-colors pb-4"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </aside>

        {/* Secondary Context Panel - STATIC WIDTH TO PREVENT JITTER */}
        <aside
          className="w-[260px] h-full bg-[#0f172a] border-r border-white/5 flex flex-col overflow-y-auto no-scrollbar"
        >
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
          {/* Section Header */}
          <h2 className="text-lg font-bold text-slate-400 mb-8 text-[10px] uppercase tracking-[0.2em] px-0 opacity-60">
            {category === 'projects' ? 'Platform' : 'AI Module'}
          </h2>
          
          {/* Dynamic Content: Projects Category */}
          {category === 'projects' && (
            <div className="space-y-6">
              {/* Project Selector - REFINED UI */}
              <div className="relative group mb-8">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center pointer-events-none group-hover:bg-indigo-500/20 transition-colors z-10 border border-indigo-500/20">
                  {currentProject ? (
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${currentProject.domain}&sz=64`} 
                      className="w-4 h-4 rounded-sm" 
                      alt=""
                    />
                  ) : (
                    <Database className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                <select 
                  value={projectId || ""}
                  onChange={(e) => {
                    const newId = e.target.value;
                    if (!newId) return navigate('/dashboard/projects');
                    
                    const paths = location.pathname.split('/');
                    const currentTool = paths[paths.length - 1];
                    const tools = ['audit', 'profiler', 'readiness', 'search'];
                    
                    if (tools.includes(currentTool)) {
                      navigate(`/dashboard/projects/${newId}/${currentTool}`);
                    } else {
                      navigate(`/dashboard/projects/${newId}`);
                    }
                  }}
                  className="w-full bg-[#161c2e] hover:bg-[#1a2236] text-slate-200 text-[13px] font-bold py-3.5 pl-14 pr-10 rounded-2xl border border-white/5 hover:border-indigo-500/30 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xl relative"
                >
                  <option value="" className="bg-[#0f172a]">Select Project...</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0f172a] py-2">
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity z-10">
                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                </div>
              </div>

              {isProjectContext ? (
                <div className="space-y-6">
                  <SidebarSection title="PROJECT">
                     <NavItem to="/dashboard/projects" icon={Folder} label="All Projects" end />
                     <ContextItem to={`/dashboard/projects/${projectId}`} icon={Home} label="Project Overview" end />
                     <ContextItem to={`/dashboard/projects/${projectId}/rankings`} icon={LineChart} label="Professional Rankings" />
                  </SidebarSection>

                  <SidebarSection title="AI MODULES">
                    <div className="px-2 py-2 flex items-center gap-3 text-white/70">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[13px] font-bold">AI Module Tools</span>
                      <ChevronDown className="w-3 h-3 ml-auto" />
                    </div>
                    <div className="space-y-1">
                      <ContextItem to={`/dashboard/projects/${projectId}/audit`} label="AI Visibility Audit" isChild />
                      <ContextItem to={`/dashboard/projects/${projectId}/profiler`} label="Domain Profiler" isChild />
                      <ContextItem to={`/dashboard/projects/${projectId}/readiness`} label="Readiness Analyzer" isChild />
                      <ContextItem to={`/dashboard/projects/${projectId}/search`} label="Web Visibility" isChild />
                      <ContextItem to={`/dashboard/projects/${projectId}/brand-audit`} label="Brand Audit" isChild />
                    </div>
                  </SidebarSection>


                  <div className="pt-4 border-t border-white/5">
                    <SidebarSection title="GENERAL">
                      <ContextItem to="/dashboard/orders" icon={DollarSign} label="My Orders" />
                      <ContextItem to="/dashboard/inquiries" icon={Mail} label="My Inquiries" />
                      <ContextItem to="/dashboard/pricing" icon={CreditCard} label="Pricing & Plans" />
                      <ContextItem to="/dashboard/help" icon={HelpCircle} label="Help" />
                    </SidebarSection>
                  </div>

                  <SidebarSection title="ACCOUNT">
                    <div className="px-4 py-2 flex items-center gap-3 text-white/70">
                      <Settings className="w-4 h-4" />
                      <span className="text-[13px] font-bold">Settings</span>
                      <ChevronDown className="w-3 h-3 ml-auto" />
                    </div>
                    <div className="px-4 py-2">
                       <button 
                         onClick={() => navigate('/dashboard/settings')}
                         className="w-full bg-blue-600/10 text-blue-400 text-[11px] font-black uppercase tracking-widest py-3 rounded-xl border border-blue-500/20 hover:bg-blue-600/20 transition-all font-bold"
                       >
                         Profile Settings
                       </button>
                    </div>
                  </SidebarSection>
                </div>
              ) : (
                <div className="space-y-2">
                  <NavItem to="/dashboard/projects" icon={Folder} label="My Projects" end />
                  <NavItem to="/dashboard/projects/new" icon={Edit3} label="Add New Project" badge="NEW" />
                </div>
              )}
            </div>
          )}

          {/* Dynamic Content: AI Module (Global) */}
          {category === 'ai_module' && !isProjectContext && (
            <div className="space-y-6">
              <SidebarSection title="AI AUDITS">
                <ContextItem to="/dashboard/audit" icon={ShieldCheck} label="AI Visibility Audit" />
                <ContextItem to="/dashboard/profiler" icon={Search} label="Brand Identity Profiler" />
              </SidebarSection>
              
              <SidebarSection title="SEARCH LAB">
                <ContextItem to="/dashboard/search" icon={Globe} label="Authority & Mentions" />
                <ContextItem to="/dashboard/brand-audit" icon={Search} label="Brand Audit" />
              </SidebarSection>

              <SidebarSection title="GEO STRATEGY">
                <ContextItem to="/dashboard/readiness" icon={Zap} label="Technical Readiness" />
              </SidebarSection>
            </div>
          )}

          {/* Bottom Common Sections */}
          {!location.pathname.startsWith('/dashboard/projects/') && (
            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
               <SidebarSection title="Management">
                {user?.role === 'admin' && (
                  <ContextItem to="/dashboard/admin/stats" icon={LineChart} label="Admin Panel" badge="Admin" />
                )}
                <ContextItem to="/dashboard/orders" icon={DollarSign} label="My Orders" />
                <ContextItem to="/dashboard/pricing" icon={CreditCard} label="Subscription" />
              </SidebarSection>
            </div>
          )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
