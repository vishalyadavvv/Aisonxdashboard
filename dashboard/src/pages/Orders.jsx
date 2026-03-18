import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Search, Filter, ExternalLink, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await api.get('/payments/my-invoices');
        setOrders(res.data.data.invoices || []);
      } catch (err) {
        toast.error('Failed to load transaction history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-3 h-3" />
            Processing
          </span>
        );
    }
  };

  const filteredOrders = orders.filter(order =>
    (order.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.planName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing History</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your subscriptions and download invoices.</p>
        </div>
        <div className="bg-blue-600 px-4 py-3 rounded-2xl flex items-center gap-4 text-white shadow-lg shadow-blue-500/20">
          <div className="p-2 bg-white/10 rounded-xl">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 leading-none">Current Plan</p>
            <p className="text-sm font-bold capitalize">{user?.subscription?.tier || 'Free'} Plan</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Orders</p>
            <p className="text-xl font-bold text-slate-900">{orders.length}</p>
          </div>
        </div>
        {/* Placeholder for other stats */}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search invoice number..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 font-bold text-sm">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID / Invoice</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8 h-16 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <ShoppingBag className="w-8 h-8" />
                      <p className="text-sm font-bold">No transactions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, i) => (
                  <motion.tr 
                    key={order.orderId || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 capitalize">{order.planName} Plan</span>
                        <span className="text-[10px] text-slate-400 font-mono">{order.orderId || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-600">
                        {new Date(order.paidAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-slate-900">₹{Number(order.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge('paid')}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="p-2 text-slate-400 inline-flex items-center gap-2 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Paid
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Note */}
      <div className="bg-slate-50 rounded-2xl p-6 flex items-start gap-4">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          <CreditCard className="w-5 h-5 text-blue-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">About your billing</p>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            All prices include GST where applicable. Invoices are generated automatically after successful payment. 
            If you need a GST invoice, please update your billing details in the Settings section.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Orders;
