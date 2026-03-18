import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Zap,
  Star,
  Rocket,
  Loader2,
  Calendar,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Subscription Edit States
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    tier: 'none',
    status: 'inactive',
    expiresAt: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data.data.users);
    } catch (err) {
      toast.error('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      tier: user.subscription.tier,
      status: user.subscription.status,
      expiresAt: user.subscription.expiresAt ? new Date(user.subscription.expiresAt).toISOString().split('T')[0] : ''
    });
  };

  const handleUpdateSubscription = async (e) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      await api.patch('/admin/update-subscription', {
        userId: editingUser._id,
        ...editForm
      });
      toast.success('Subscription updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.phone && user.phone.includes(searchTerm));
    const matchesFilter = filterStatus === 'all' || user.subscription.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    const styles = {
      active: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      trialing: 'bg-blue-50 text-blue-600 border-blue-100',
      expired: 'bg-red-50 text-red-600 border-red-100',
      inactive: 'bg-slate-50 text-slate-500 border-slate-100'
    };
    return styles[status?.toLowerCase() || 'inactive'];
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-slate-900 font-display">User Manager</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Search, filter, and manage platform user accounts and subscriptions.</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh Users'}
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Filter:</span>
          <select 
            className="bg-slate-50 border-none rounded-xl text-sm py-2 px-3 outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-600 flex-1 md:flex-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block" />
          <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            Total: {filteredUsers.length}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <motion.tr 
                  layout
                  key={u._id} 
                  className="hover:bg-slate-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden text-xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{u.name}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-black uppercase tracking-tight text-slate-600 flex items-center gap-1">
                      {u.subscription.tier === 'professional' && <Star className="w-3 h-3 text-purple-500 fill-purple-500" />}
                      {u.subscription.tier === 'growth' && <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />}
                      {u.subscription.tier === 'starter' && <Rocket className="w-3 h-3 text-emerald-500 fill-emerald-500" />}
                      {u.subscription.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">{u.phone || 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Contact Number</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getStatusColor(u.subscription.status)}`}>
                      {u.subscription.status || 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        {u.subscription.expiresAt ? `Ends ${new Date(u.subscription.expiresAt).toLocaleDateString()}` : 'No expiry'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEditClick(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      Edit Sub
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-16 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 opacity-20" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-slate-900">No users found</p>
              <p className="text-xs font-medium">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Subscription Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Edit Subscription</h2>
                      <p className="text-xs font-medium text-slate-500">Updating settings for {editingUser.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateSubscription} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subscription Tier</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['none', 'starter', 'growth', 'professional'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, tier: t })}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all capitalize ${
                            editForm.tier === t 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Status</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['active', 'trialing', 'expired', 'inactive'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, status: s })}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all capitalize ${
                            editForm.status === s 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-900'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="date" 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-600"
                        value={editForm.expiresAt}
                        onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Updates
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
