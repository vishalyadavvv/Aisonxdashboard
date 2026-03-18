import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Clock, CheckCircle2, AlertCircle, Search, Filter, MoreHorizontal, MessageSquare, Send } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Inquiries = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newInquiry, setNewInquiry] = useState({
    subject: '',
    message: '',
    category: 'Support',
    priority: 'Medium'
  });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin reply modal state
  const [replyModal, setReplyModal] = useState({ open: false, inquiry: null });
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Expanded row to view details (for users to see admin reply)
  const [expandedId, setExpandedId] = useState(null);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inquiries');
      setInquiries(res.data.data.inquiries);
    } catch (err) {
      toast.error('Failed to load inquiries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleCreateInquiry = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/inquiries', newInquiry);
      toast.success('Inquiry submitted successfully');
      setIsModalOpen(false);
      setNewInquiry({ subject: '', message: '', category: 'Support', priority: 'Medium' });
      fetchInquiries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveInquiry = async (id) => {
    try {
      await api.patch(`/inquiries/${id}`, { status: 'resolved' });
      toast.success('Inquiry marked as resolved');
      fetchInquiries();
    } catch (err) {
      toast.error('Failed to update inquiry');
    }
  };

  // Admin: open reply modal
  const openReplyModal = (inq) => {
    setReplyModal({ open: true, inquiry: inq });
    setReplyText(inq.adminReply || '');
  };

  // Admin: submit reply + mark resolved
  const handleAdminReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }
    try {
      setReplying(true);
      await api.patch(`/inquiries/${replyModal.inquiry._id}`, {
        status: 'resolved',
        adminReply: replyText.trim()
      });
      toast.success('Reply sent & inquiry resolved');
      setReplyModal({ open: false, inquiry: null });
      setReplyText('');
      fetchInquiries();
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'bg-emerald-50 text-emerald-600 ring-emerald-100';
      case 'pending': return 'bg-amber-50 text-amber-600 ring-amber-100';
      case 'in-progress': return 'bg-blue-50 text-blue-600 ring-blue-100';
      default: return 'bg-slate-50 text-slate-600 ring-slate-100';
    }
  };

  const filteredInquiries = inquiries.filter(inq => {
    if (activeTab === 'all') return true;
    return inq.status === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Platform Support Center' : 'My Inquiries'}
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin 
              ? 'Manage and respond to support tickets from all users.' 
              : 'Track and manage your support tickets and inquiries.'}
          </p>
        </div>
        {!isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            New Inquiry
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Inquiries', value: inquiries.length, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Response', value: inquiries.filter(i => i.status === 'pending').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Resolved Tickets', value: inquiries.filter(i => i.status === 'resolved').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {['all', 'pending', 'resolved'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-bold uppercase tracking-widest pb-1 transition-all border-b-2 ${
                  activeTab === tab ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID</th>
                {isAdmin && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInquiries.map((inq, i) => (
                <motion.tr 
                  key={inq._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === inq._id ? null : inq._id)}
                >
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{inq._id.substring(inq._id.length - 8).toUpperCase()}</td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{inq.user?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-400">{inq.user?.email}</span>
                        {inq.user?.phone && <span className="text-[10px] text-slate-400">📞 {inq.user.phone}</span>}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{inq.subject}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600">{inq.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ring-1 ${getStatusColor(inq.status)}`}>
                      {(inq.status || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-bold text-slate-400 mr-2">{new Date(inq.createdAt).toLocaleDateString()}</span>
                      {isAdmin && inq.status !== 'resolved' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openReplyModal(inq); }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold"
                          title="Reply & Resolve"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Reply
                        </button>
                      )}
                      {!isAdmin && inq.status !== 'resolved' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleResolveInquiry(inq._id); }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Mark as Resolved"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}

              {/* Expanded detail row — shows message & admin reply */}
              {filteredInquiries.map((inq) => (
                expandedId === inq._id && (
                  <tr key={`${inq._id}-detail`}>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-0">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pb-5 space-y-3"
                      >
                        {/* User's original message */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Message</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{inq.message}</p>
                        </div>

                        {/* Admin reply */}
                        {inq.adminReply && (
                          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Admin Response</p>
                            </div>
                            <p className="text-sm text-emerald-800 leading-relaxed">{inq.adminReply}</p>
                          </div>
                        )}

                        {/* If resolved but no reply */}
                        {inq.status === 'resolved' && !inq.adminReply && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-xs text-slate-400 italic">This inquiry was resolved without a response message.</p>
                          </div>
                        )}
                      </motion.div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Inquiry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">New Inquiry</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold px-2">✕</button>
                </div>

                <form onSubmit={handleCreateInquiry} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subject</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Billing Issue, Technical Support"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      value={newInquiry.subject}
                      onChange={(e) => setNewInquiry({...newInquiry, subject: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={newInquiry.category}
                        onChange={(e) => setNewInquiry({...newInquiry, category: e.target.value})}
                      >
                        <option>Support</option>
                        <option>Billing</option>
                        <option>Sales</option>
                        <option>Feedback</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        value={newInquiry.priority}
                        onChange={(e) => setNewInquiry({...newInquiry, priority: e.target.value})}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message</label>
                    <textarea 
                      placeholder="Describe your issue in detail..."
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                      value={newInquiry.message}
                      onChange={(e) => setNewInquiry({...newInquiry, message: e.target.value})}
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Inquiry'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Reply Modal */}
      <AnimatePresence>
        {replyModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Reply & Resolve</h2>
                    <p className="text-xs text-slate-400 mt-1">Respond to: <span className="font-bold text-slate-600">{replyModal.inquiry?.subject}</span></p>
                  </div>
                  <button onClick={() => { setReplyModal({ open: false, inquiry: null }); setReplyText(''); }} className="text-slate-400 hover:text-slate-600 font-bold px-2">✕</button>
                </div>

                {/* User's message preview */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{replyModal.inquiry?.user?.name?.[0] || 'U'}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{replyModal.inquiry?.user?.name}</p>
                      <p className="text-[10px] text-slate-400">{replyModal.inquiry?.user?.email}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{replyModal.inquiry?.message}</p>
                </div>

                {/* Admin reply textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Response</label>
                  <textarea 
                    placeholder="Type your solution or response here..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => { setReplyModal({ open: false, inquiry: null }); setReplyText(''); }}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAdminReply}
                    disabled={replying || !replyText.trim()}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {replying ? 'Sending...' : 'Send & Resolve'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inquiries;
