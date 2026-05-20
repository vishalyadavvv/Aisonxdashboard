import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  UserMinus, 
  BarChart3, 
  TrendingUp, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  CreditCard,
  Zap,
  Star,
  Rocket,
  Loader2,
  Mail,
  Globe,
  FileText,
  LineChart,
  AArrowUp,
  ArrowDownRight,
  ArrowUpRight,
  X,
  ChevronRight,
  IndianRupee,
  Cpu,
  Clock,
  Trash2,
  Play,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);
  const [isPurgingQueue, setIsPurgingQueue] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const formatUptime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${seconds % 60}s`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const handleTriggerDailyScan = async () => {
    try {
      setIsTriggeringScan(true);
      const res = await api.post('/admin/trigger-daily-scan');
      toast.success(res.data.message || 'Scan triggered successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger scan');
    } finally {
      setIsTriggeringScan(false);
    }
  };

  const handlePurgeQueue = async () => {
    if (!window.confirm('Are you sure you want to clear the entire pending scan queue waitlist?')) return;
    try {
      setIsPurgingQueue(true);
      const res = await api.post('/admin/clear-queue');
      toast.success(res.data.message || 'Queue cleared successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear queue');
    } finally {
      setIsPurgingQueue(false);
    }
  };

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else setLoading(true);
      
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      toast.error('Failed to load admin data');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };



  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Command Center</h1>
          <p className="text-sm text-slate-500 font-medium">Track registrations, subscriptions, and platform usage.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh Data'}
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats?.users.total} 
          icon={Users} 
          color="blue"
        />
        <StatCard 
          title="Paid Subscriptions" 
          value={stats?.users.activePaid} 
          icon={UserCheck} 
          color="emerald"
        />
        <StatCard 
          title="Active Trials" 
          value={stats?.users.trialing} 
          icon={Zap} 
          color="amber"
        />
        <StatCard 
          title="Reports Generated" 
          value={stats?.usage.totalReports} 
          icon={FileText} 
          color="purple"
        />
        <StatCard 
          title="Total Revenue" 
          value={`₹${stats?.revenue?.total?.toLocaleString() || '0'}`} 
          icon={IndianRupee} 
          color="rose"
        />
        <StatCard 
          title="Monthly Revenue" 
          value={`₹${stats?.revenue?.mrr?.toLocaleString() || '0'}`} 
          icon={TrendingUp} 
          color="indigo"
        />
      </div>

      {/* Live Systems & Redis Queue Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Systems Diagnostics */}
        <div className="lg:col-span-1 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Live System Health</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active resources & latencies</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Memory Heap</span>
              </div>
              <span className="text-sm font-black text-slate-800">{stats?.diagnostics?.memoryUsage || 0} MB</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">DB Latency</span>
              </div>
              <span className={`text-sm font-black ${stats?.diagnostics?.dbLatency < 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {stats?.diagnostics?.dbLatency || 0} ms
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">Server Uptime</span>
              </div>
              <span className="text-xs font-black text-slate-800">
                {stats?.diagnostics?.uptime ? formatUptime(stats.diagnostics.uptime) : '0s'}
              </span>
            </div>
          </div>
        </div>

        {/* Redis Scan Queue Controller */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Redis Background Queue</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active crawlers status & jobs waitlist</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleTriggerDailyScan}
                disabled={isTriggeringScan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
              >
                {isTriggeringScan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Trigger Scan
              </button>
              <button 
                onClick={handlePurgeQueue}
                disabled={isPurgingQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
              >
                {isPurgingQueue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Purge Queue
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Scans</p>
              <p className={`text-2xl font-black ${stats?.queue?.active > 0 ? 'text-indigo-600 animate-pulse' : 'text-slate-800'}`}>
                {stats?.queue?.active || 0}
              </p>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending Waitlist</p>
              <p className="text-2xl font-black text-slate-800">{stats?.queue?.waiting || 0}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Scans Succeeded</p>
              <p className="text-2xl font-black text-emerald-600">{stats?.queue?.completed || 0}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Failed Jobs</p>
              <p className="text-2xl font-black text-red-500">{stats?.queue?.failed || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plan Distribution */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Plan Distribution</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Live updates <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <PlanProgress label="Starter" count={stats?.plans.starter} total={stats?.users.total} color="bg-emerald-500" />
            <PlanProgress label="Growth" count={stats?.plans.growth} total={stats?.users.total} color="bg-blue-500" />
            <PlanProgress label="Professional" count={stats?.plans.professional} total={stats?.users.total} color="bg-purple-500" />
            <PlanProgress label="Free/Expired" count={stats?.users.total - (stats?.plans.starter + stats?.plans.growth + stats?.plans.professional)} total={stats?.users.total} color="bg-slate-700" />
          </div>
        </div>

        {/* Feature Usage Overview */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Feature Usage</h3>
            <button 
              onClick={() => setShowUsageModal(true)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Detailed Reports
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <UsageMetric label="AI Audits" value={stats?.usage.auditReports} icon={Shield} color="blue" />
            <UsageMetric label="Domain Profilers" value={stats?.usage.profilerReports} icon={Search} color="emerald" />
            <UsageMetric label="Readiness Scans" value={stats?.usage.readinessReports} icon={LineChart} color="indigo" />
            <UsageMetric label="Web Visibility" value={stats?.usage.searchReports} icon={Globe} color="purple" />
          </div>
          
          <div className="pt-4 border-t border-slate-50">
            <div 
              onClick={() => navigate('/dashboard/inquiries')}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all group/tickets"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm group-hover/tickets:scale-110 transition-transform">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">Open Tickets</span>
                  <span className="text-[10px] text-slate-500 font-medium tracking-tight">Requires admin attention</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">{stats?.inquiries.open}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover/tickets:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Platform Signups */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Platform Signups</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Real-time pulse of registrations & active levels</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Current Package</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentUsers?.map((userObj) => (
                <tr key={userObj._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-800 text-sm">{userObj.name}</td>
                  <td className="py-4 px-4 text-slate-500 text-sm">{userObj.email}</td>
                  <td className="py-4 px-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {userObj.subscription?.tier || 'Free'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <StatusBadge status={userObj.subscription?.status || 'inactive'} />
                  </td>
                  <td className="py-4 px-4 text-right text-xs font-semibold text-slate-400 font-mono">
                    {new Date(userObj.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm font-medium text-slate-400">
                    No recent user activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Usage Modal */}
      <AnimatePresence>
        {showUsageModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Feature Usage Reports</h3>
                    <p className="text-sm text-slate-500 font-medium">Detailed breakdown of AI tool utilization across the platform.</p>
                  </div>
                  <button 
                    onClick={() => setShowUsageModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ReportDetailItem 
                    label="AI Visibility Audit" 
                    count={stats?.usage.auditReports} 
                    total={stats?.usage.totalReports} 
                    icon={Shield} 
                    color="blue" 
                  />
                  <ReportDetailItem 
                    label="Domain Profiler" 
                    count={stats?.usage.profilerReports} 
                    total={stats?.usage.totalReports} 
                    icon={Search} 
                    color="emerald" 
                  />
                  <ReportDetailItem 
                    label="AI Readiness Scans" 
                    count={stats?.usage.readinessReports} 
                    total={stats?.usage.totalReports} 
                    icon={LineChart} 
                    color="indigo" 
                  />
                  <ReportDetailItem 
                    label="Web Visibility Search" 
                    count={stats?.usage.searchReports} 
                    total={stats?.usage.totalReports} 
                    icon={Globe} 
                    color="purple" 
                  />
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platform Efficiency</h4>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-slate-900">{stats?.usage.totalReports || 0}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Total reports generated to date</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold flex items-center justify-end gap-1 ${stats?.usage.systemStatus === 'Healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <TrendingUp className="w-4 h-4" /> {stats?.usage.systemStatus || 'Healthy'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">System Status</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowUsageModal(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all font-sans"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 hover:border-blue-100 transition-all group">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
        <p className="text-2xl font-black text-slate-900">{displayValue || '0'}</p>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    trialing: 'bg-blue-50 text-blue-600 border-blue-100',
    expired: 'bg-red-50 text-red-600 border-red-100',
    inactive: 'bg-slate-50 text-slate-500 border-slate-100'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${styles[status?.toLowerCase() || 'inactive']}`}>
      {status || 'Inactive'}
    </span>
  );
};

const PlanProgress = ({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-slate-400 uppercase tracking-widest">{label}</span>
        <span>{count} ({Math.round(percentage)}%)</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
};

const UsageMetric = ({ label, value, icon: Icon }) => (
  <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
    <Icon className="w-4 h-4 mx-auto text-slate-400" />
    <p className="text-xs font-bold text-slate-900">{value?.toLocaleString() || '0'}</p>
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
  </div>
);

const ReportDetailItem = ({ label, count, total, icon: Icon, color }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const colors = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className="p-5 border border-slate-100 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-50">
            <Icon className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-sm font-bold text-slate-800">{label}</span>
        </div>
        <span className="text-sm font-black text-slate-900">{count || 0}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Utilization</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${colors[color]}`}
          />
        </div>
      </div>
    </div>
  );
};


export default AdminDashboard;
