import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SidebarSection = ({ title, children }) => (
  <div className="mb-6 last:mb-0">
    <h3 className="px-4 text-[11px] font-bold text-white uppercase tracking-wider mb-2 opacity-80">
      {title}
    </h3>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const NavItem = ({ to, icon: Icon, label, badge, hasDropdown, isChild }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        "flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 group text-sm",
        isActive 
          ? "bg-blue-600/10 text-blue-400 font-semibold border border-blue-500/20" 
          : "text-white hover:bg-white/5",
        isChild && "pl-12 py-1.5"
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-white/70 group-hover:text-white")} />}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="bg-blue-500/10 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-blue-400 border border-blue-500/20">
            {badge}
          </span>
        )}
        {hasDropdown && <ChevronDown className="w-3.5 h-3.5 text-white/70" />}
      </div>
    </NavLink>
  );
};

const Sidebar = ({ logout, isOpen, setIsOpen }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContentOpen, setIsContentOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0a0e1a] flex flex-col overflow-y-auto no-scrollbar selection:bg-blue-500/20 shadow-2xl transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo Area */}
        <div className="p-8 pb-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">AIsonx<span className="text-gray-500 font-medium">.ai</span></span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white md:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="px-4 flex-1">
        {user?.role === 'admin' ? (
          <>
            <SidebarSection title="Administration">
              <NavItem to="/dashboard/admin/stats" icon={LineChart} label="Platform Stats" badge="Admin" />
              <NavItem to="/dashboard/admin/users" icon={Users} label="User Manager" />
              <NavItem to="/dashboard/admin/manager" icon={Shield} label="Admin Manager" />
              <NavItem to="/dashboard/inquiries" icon={Mail} label="Support Inquiries" />
            </SidebarSection>

            <SidebarSection title="User Portal">
              <button 
                onClick={() => setIsContentOpen(!isContentOpen)}
                className="w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 group text-sm text-white/60 hover:text-white hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4" />
                  <span>View as User</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isContentOpen && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {isContentOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-l border-white/5 ml-6 pl-2 mt-1 space-y-1"
                  >
                    <NavItem to="/dashboard/projects" icon={Home} label="User Dashboard" isChild />
                    <NavItem to="/dashboard/audit" label="AI Visibility Audit" isChild />
                    <NavItem to="/dashboard/profiler" label="Domain Profiler" isChild />
                    <NavItem to="/dashboard/readiness" label="Readiness Analyzer" isChild />
                    <NavItem to="/dashboard/search" label="Web Visibility" isChild />
                  </motion.div>
                )}
              </AnimatePresence>
            </SidebarSection>
          </>
        ) : (
          <>
            <SidebarSection title="Project">
              <NavItem to="/dashboard" icon={Home} label="Dashboard" />
            </SidebarSection>

            <SidebarSection title="AI Modules">
              <button 
                onClick={() => setIsContentOpen(!isContentOpen)}
                className="w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 group text-sm text-white hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-white/70 group-hover:text-white" />
                  <span>Audit Tools</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isContentOpen && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {isContentOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-l border-white/5 ml-6 pl-2 mt-1 space-y-1"
                  >
                    <NavItem to="/dashboard/audit" label="AI Visibility Audit" isChild />
                    <NavItem to="/dashboard/profiler" label="Domain Profiler" isChild />
                    <NavItem to="/dashboard/readiness" label="Readiness Analyzer" isChild />
                    <NavItem to="/dashboard/search" label="Web Visibility" isChild />
                  </motion.div>
                )}
              </AnimatePresence>
            </SidebarSection>

            <SidebarSection title="General">
              <NavItem to="/dashboard/orders" icon={DollarSign} label="My Orders" />
              <NavItem to="/dashboard/inquiries" icon={Mail} label="My Inquiries" />
              <NavItem to="/dashboard/pricing" icon={CreditCard} label="Pricing & Plans" />
              <NavItem to="/dashboard/help" icon={HelpCircle} label="Help" />
            </SidebarSection>
          </>
        )}

        <SidebarSection title="Account">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 group text-sm text-white hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-white/70 group-hover:text-white" />
              <span>Settings</span>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isSettingsOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 space-y-1 overflow-hidden ml-6 border-l border-white/5 pl-2"
              >
                <NavItem to="/dashboard/settings" label="Profile Settings" isChild />
                {user?.role !== 'admin' && <NavItem to="/dashboard/team" label="Team Members" isChild />}
              </motion.div>
            )}
          </AnimatePresence>
        </SidebarSection>
      </div>

      <div className="p-4 mt-auto border-t border-white/5 pb-8 md:pb-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
