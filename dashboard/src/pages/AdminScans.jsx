import { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Loader2, 
  Calendar, 
  Terminal, 
  Cpu, 
  Globe, 
  FileText, 
  Database,
  ArrowUpRight,
  TrendingUp,
  Download,
  AlertCircle,
  Folder
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const AdminScans = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  useEffect(() => {
    fetchLogs(false, currentPage);
  }, [currentPage, activeFilter]);

  // Reset page when filter changes (don't reset for search changes to preserve view)
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const fetchLogs = async (manual = false, page = 1) => {
    try {
      if (manual) setIsRefreshing(true);
      else setLoading(true);
      
      const res = await api.get(`/admin/scan-logs?page=${page}&limit=15&type=${activeFilter}`);
      setLogs(res.data.data.logs);

      const pagination = res.data.data.pagination;
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalLogs(pagination.totalLogs || 0);
        setCurrentPage(pagination.currentPage || 1);
      }
    } catch (err) {
      toast.error('Failed to load scan explorer logs');
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const getLogTypeStyle = (type) => {
    switch (type) {
      case 'AI Visibility Scan':
        return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Project Automated Scan':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Domain Profiler':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Readiness Report':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Web Search Report':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getLogTypeIcon = (type) => {
    switch (type) {
      case 'AI Visibility Scan': return Cpu;
      case 'Project Automated Scan': return Folder;
      case 'Domain Profiler': return Globe;
      case 'Readiness Report': return FileText;
      case 'Web Search Report': return Search;
      default: return Activity;
    }
  };

  // Filter & Search Logic
  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase().trim();
    const matchesFilter = activeFilter === 'All' || log.type === activeFilter;
    
    if (!term) return matchesFilter;

    const userName = (log.user?.name || '').toLowerCase();
    const userEmail = (log.user?.email || '').toLowerCase();
    const target = (log.target || '').toLowerCase();
    const meta = (log.meta || '').toLowerCase();
    const type = (log.type || '').toLowerCase();

    const matchesSearch = 
      userName.includes(term) ||
      userEmail.includes(term) ||
      target.includes(term) ||
      meta.includes(term) ||
      type.includes(term);

    return matchesSearch && matchesFilter;
  });

  const exportLogsToCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No scan logs to export');
      return;
    }

    const headers = ['Log ID', 'Activity Type', 'User Name', 'User Email', 'Target Domain/Brand', 'Meta Context', 'Scoring', 'Executed Timestamp'];
    const rows = filteredLogs.map(log => [
      log._id,
      log.type,
      log.user?.name || 'N/A',
      log.user?.email || 'N/A',
      log.target || 'N/A',
      log.meta || 'N/A',
      log.score !== null ? `${log.score}%` : 'N/A',
      new Date(log.createdAt).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `aisonx_scan_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Logs exported successfully!');
  };



  const uniqueTypes = ['All', 'Project Automated Scan', 'AI Visibility Scan', 'Domain Profiler', 'Readiness Report', 'Web Search Report'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 px-4">
      {/* Header Deck */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Terminal className="w-7 h-7 text-indigo-600" />
            Audit Log & Scan Explorer
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitor and track real-time visibility crawls, LLM search executions, and readiness scoring.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => fetchLogs(true, currentPage)}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refresh Stream'}
          </button>
          <button 
            onClick={exportLogsToCSV}
            className="px-4 py-2.5 bg-slate-950 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export logs CSV
          </button>
        </div>
      </div>

      {/* Control Deck: Search & Type Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            placeholder="Search logs (by user, domain, or meta)..."
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {uniqueTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                activeFilter === type
                  ? 'bg-slate-900 border-slate-950 text-white shadow-lg'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Results Deck */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Tool / Scan Type</th>
                <th className="py-4 px-6">User Account</th>
                <th className="py-4 px-6">Target Brand / Domain</th>
                <th className="py-4 px-6">Scan Details / Prompt</th>
                <th className="py-4 px-6">Visibility Score</th>
                <th className="py-4 px-6 text-right">Scanned At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse border-b border-slate-50">
                    <td className="py-4 px-6"><div className="h-6 w-32 bg-slate-100 rounded-full"></div></td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0"></div>
                        <div className="space-y-1.5">
                          <div className="h-3 w-20 bg-slate-100 rounded"></div>
                          <div className="h-3 w-28 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6"><div className="h-4 w-36 bg-slate-100 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-4 w-60 bg-slate-100 rounded"></div></td>
                    <td className="py-4 px-6"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 w-20 ml-auto bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredLogs.map((log) => {
                const Icon = getLogTypeIcon(log.type);
                const badgeStyle = getLogTypeStyle(log.type);

                return (
                  <tr key={log._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    
                    {/* Log Type */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeStyle}`}>
                        <Icon className="w-3 h-3" />
                        {log.type}
                      </span>
                    </td>

                    {/* User */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600 uppercase">
                          {log.user?.name ? log.user.name.substring(0, 2) : 'SY'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{log.user?.name || 'System'}</span>
                          <span className="text-[10px] font-medium text-slate-400">{log.user?.email || 'automated'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Target Domain / Brand */}
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-700">
                      {log.target || 'N/A'}
                    </td>

                    {/* Context Meta */}
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium max-w-md break-words">
                      {log.meta || 'N/A'}
                    </td>

                    {/* Score */}
                    <td className="py-4 px-6">
                      {typeof log.score === 'number' && log.score >= 0 ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${log.score >= 70 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span className="text-xs font-extrabold text-slate-800">{log.score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">—</span>
                      )}
                    </td>

                    {/* Execution Date */}
                    <td className="py-4 px-6 text-right text-xs font-semibold text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-medium text-slate-400">
                      No matching platform scan logs found in this query scope.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Deck */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 rounded-b-2xl shadow-sm border border-slate-100/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Showing <span className="text-slate-800 font-extrabold">{filteredLogs.length}</span> logs
            </span>
            <span className="text-slate-200">|</span>
            <span className="text-xs text-slate-400 font-semibold">
              Total logs: {totalLogs}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1.5"
            >
              Previous
            </button>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-slate-600 uppercase tracking-widest min-w-[80px] text-center">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1.5"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminScans;
