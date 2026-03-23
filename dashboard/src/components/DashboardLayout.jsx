import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, AlertTriangle, ArrowRight, Star, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isExpired = user?.subscription?.status === 'expired';
  const isPricingPage = location.pathname === '/dashboard/pricing';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA] text-[#1E293B] selection:bg-blue-500/10">
      <Sidebar 
        logout={logout} 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />
      <main className="flex-1 overflow-y-auto w-full">
        <header className="h-16 border-b border-gray-200/80 flex items-center justify-between px-4 md:px-8 sticky top-0 bg-white/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-medium text-gray-600 hidden sm:block">Welcome back, <span className="text-[#1E293B] font-semibold">{user?.name}</span></h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right hidden sm:flex">
              {user?.role === 'admin' ? (
                <span className="text-[11px] font-bold text-blue-600 tracking-wide uppercase flex items-center gap-1 justify-end">
                  <Shield className="w-3 h-3" /> System Admin
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#1E293B] tracking-wide uppercase">{user?.subscription?.tier || 'Free'} Plan</span>
              )}
              <span className="text-[10px] text-gray-600">{user?.email}</span>
            </div>
            <div className="relative group">
              <div className="w-9 h-9 rounded-lg bg-gray-100 p-0.5 border border-gray-200 group-hover:border-blue-500/30 transition-colors">
                <div className="w-full h-full bg-white rounded-md flex items-center justify-center font-bold text-[11px] text-gray-600">
                  {user?.name?.substring(0, 2).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="p-4 md:px-10 md:pt-8 md:pb-10 max-w-full overflow-x-hidden relative">
          {isExpired && !isPricingPage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
            >
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Your free trial has expired</h3>
                  <p className="text-sm text-slate-600 font-medium">Upgrade your plan to continue using AIsonx's powerful audit tools and insights.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Link 
                  to="/dashboard/pricing"
                  className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  View Plans
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button 
                  onClick={logout}
                  className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
