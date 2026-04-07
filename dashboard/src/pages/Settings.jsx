import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Shield, CreditCard, Lock, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.patch('/auth/update-me', { name, phone });
      updateUser(res.data.data.user);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      return toast.error('Please fill in both fields');
    }
    try {
      setLoading(true);
      await api.patch('/auth/update-password', { currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Billing Form States
  const [invoices, setInvoices] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'billing') {
      const fetchInvoices = async () => {
        try {
          setBillingLoading(true);
          const res = await api.get('/payments/my-invoices');
          setInvoices(res.data.data.invoices);
        } catch (err) {
          console.error('Failed to fetch invoices', err);
        } finally {
          setBillingLoading(false);
        }
      };
      fetchInvoices();
    }
  }, [activeTab, user]);

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  ].filter(tab => {
    if (user?.role === 'admin' && tab.id === 'billing') return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile, billing, and security preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-8">
            {activeTab === 'profile' && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-2xl text-slate-400 overflow-hidden">
                    {user?.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">Profile Picture</h3>
                    <p className="text-xs text-slate-500 font-medium">PNG, JPG under 10MB</p>
                    <button className="text-xs font-bold text-blue-600 hover:underline">Upload new</button>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                      <input 
                        type="email" 
                        defaultValue={user?.email}
                        disabled
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 font-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-900" 
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-900" 
                        required
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                {/* <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-500 font-medium mb-4">Add an extra layer of security to your account.</p>
                  <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                    Enable 2FA
                  </button>
                </div> */}
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="bg-blue-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CreditCard className="w-24 h-24" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Current Subscription</p>
                    <h3 className="text-2xl font-bold capitalize">{user?.subscription?.tier || 'Free'} Plan</h3>
                    <div className="pt-4 flex items-center gap-4">
                      <button 
                        onClick={() => navigate('/dashboard/pricing')}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
                      >
                        Upgrade Plan
                      </button>
                      
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest text-[10px] text-slate-400">Recent Invoices</h3>
                  {billingLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 py-4">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading transactions...</span>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">No recent transactions found</p>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl divide-y divide-slate-50">
                      {invoices.map((inv, i) => (
                        <div key={inv.orderId || i} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <div>
                              <p className="text-sm font-bold text-slate-800 capitalize">{inv.planName || 'Subscription'} Plan</p>
                              <p className="text-[10px] text-slate-400 font-medium">{new Date(inv.paidAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-900">₹{Number(inv.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
