import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Loader2, 
  Edit3, 
  Check, 
  Trash2, 
  Plus, 
  HelpCircle, 
  Save, 
  X, 
  ShieldAlert, 
  CheckCircle,
  Zap,
  Star,
  Rocket
} from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const AdminPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    price: 0,
    description: '',
    monthlyScans: 0,
    promptsPerProject: 0,
    bestFor: '',
    trial: '',
    features: {}
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/packages');
      setPackages(res.data.data.packages);
    } catch (err) {
      toast.error('Failed to load pricing packages');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (pkg) => {
    setEditingPlan(pkg);
    setFormData({
      price: pkg.price,
      description: pkg.description,
      monthlyScans: pkg.monthlyScans || 10,
      promptsPerProject: pkg.promptsPerProject || 2,
      bestFor: pkg.bestFor || '',
      trial: pkg.trial || '',
      features: { ...pkg.features }
    });
  };

  const handleFeatureChange = (featureKey, val) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: val
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setIsSaving(true);
      const res = await api.patch(`/admin/packages/${editingPlan._id}`, formData);
      toast.success(`🎉 ${editingPlan.name} package updated successfully!`);
      
      // Update local state list
      setPackages(prev => prev.map(p => p._id === editingPlan._id ? res.data.data.package : p));
      setEditingPlan(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update package');
    } finally {
      setIsSaving(false);
    }
  };

  const getPlanIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'starter': return Rocket;
      case 'growth': return Zap;
      case 'professional': return Star;
      default: return CreditCard;
    }
  };

  const getPlanColor = (name) => {
    switch (name.toLowerCase()) {
      case 'starter': return 'emerald';
      case 'growth': return 'blue';
      case 'professional': return 'purple';
      default: return 'slate';
    }
  };

  const colorStyles = {
    emerald: { bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-50 text-blue-600', border: 'border-blue-100', text: 'text-blue-700' },
    purple: { bg: 'bg-purple-50 text-purple-600', border: 'border-purple-100', text: 'text-purple-700' },
    slate: { bg: 'bg-slate-50 text-slate-600', border: 'border-slate-100', text: 'text-slate-700' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-blue-600" />
            Pricing Package Manager
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Update SaaS prices, features, limits, and promo configurations dynamically.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
          <HelpCircle className="w-4 h-4" />
          Changes update order checkout dynamically
        </div>
      </div>

      {/* Plans Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {packages.map((pkg) => {
          const Icon = getPlanIcon(pkg.name);
          const colorKey = getPlanColor(pkg.name);
          const style = colorStyles[colorKey] || colorStyles.slate;

          return (
            <div key={pkg._id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6 hover:border-blue-100 transition-all flex flex-col group relative">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${style.bg} ${style.text} group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PLAN LEVEL</span>
                  <span className={`text-xs font-black uppercase tracking-wider ${style.text}`}>{pkg.name}</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">₹{pkg.price}</span>
                  <span className="text-slate-400 font-bold text-xs">/ month</span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-2">{pkg.description}</p>
                {pkg.trial && (
                  <span className="inline-block mt-3 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    {pkg.trial}
                  </span>
                )}
              </div>

              {/* Resource limits quick overview */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Monthly AI Scans</span>
                  <span className="font-extrabold text-slate-800">{pkg.monthlyScans || 10}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Prompts per Project</span>
                  <span className="font-extrabold text-slate-800">{pkg.promptsPerProject || 2}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-50 mt-auto">
                <button 
                  onClick={() => handleEditClick(pkg)}
                  className="w-full py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Configure Package Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Sidebar Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col p-8 space-y-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CONFIGURATION PANEL</span>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mt-1">
                  Edit Plan: {editingPlan.name}
                </h3>
              </div>
              <button 
                onClick={() => setEditingPlan(null)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-6 flex-1">
              
              {/* Price & Target audience */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input 
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Promo / Trial Tag</label>
                  <input 
                    type="text"
                    value={formData.trial}
                    onChange={(e) => setFormData({ ...formData, trial: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
                    placeholder="e.g. 7-Day Free Trial (or leave empty)"
                  />
                </div>
              </div>

              {/* Uptime Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly AI Scans Limit</label>
                  <input 
                    type="number"
                    value={formData.monthlyScans}
                    onChange={(e) => setFormData({ ...formData, monthlyScans: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prompts per Project Limit</label>
                  <input 
                    type="number"
                    value={formData.promptsPerProject}
                    onChange={(e) => setFormData({ ...formData, promptsPerProject: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Best For</label>
                <input 
                  type="text"
                  value={formData.bestFor}
                  onChange={(e) => setFormData({ ...formData, bestFor: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 resize-none"
                  required
                />
              </div>

              {/* Feature Limits / Text Configs */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Feature Text & Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Engines Included</label>
                    <input 
                      type="text"
                      value={formData.features['AI Engines Included'] || ''}
                      onChange={(e) => handleFeatureChange('AI Engines Included', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regions Included</label>
                    <input 
                      type="text"
                      value={formData.features['Regions Included'] || ''}
                      onChange={(e) => handleFeatureChange('Regions Included', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Analytics Dashboards</label>
                    <input 
                      type="text"
                      value={formData.features['Analytics Dashboards'] || ''}
                      onChange={(e) => handleFeatureChange('Analytics Dashboards', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Advanced Visibility Insights</label>
                    <input 
                      type="text"
                      value={formData.features['Advanced Visibility Insights'] || ''}
                      onChange={(e) => handleFeatureChange('Advanced Visibility Insights', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Benefits / Features Checklist */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Features Checklist Override</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600">Unlimited Users</span>
                    <input 
                      type="checkbox"
                      checked={!!formData.features['Unlimited Users']}
                      onChange={(e) => handleFeatureChange('Unlimited Users', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600">AI Visibility Audit Tool</span>
                    <input 
                      type="checkbox"
                      checked={!!formData.features['AI Visibility Audit Tool']}
                      onChange={(e) => handleFeatureChange('AI Visibility Audit Tool', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600">AI Domain Analyzer</span>
                    <input 
                      type="checkbox"
                      checked={!!formData.features['AI Domain Analyzer']}
                      onChange={(e) => handleFeatureChange('AI Domain Analyzer', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600">Brand Authority Score</span>
                    <input 
                      type="checkbox"
                      checked={!!formData.features['Brand Authority Score']}
                      onChange={(e) => handleFeatureChange('Brand Authority Score', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600">Check LLM Entity Visibility</span>
                    <input 
                      type="checkbox"
                      checked={!!formData.features['Check LLM Entity Visibility']}
                      onChange={(e) => handleFeatureChange('Check LLM Entity Visibility', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600">Check LLM Live Visibility</span>
                    <input 
                      type="checkbox"
                      checked={!!formData.features['Check LLM Live Visibility']}
                      onChange={(e) => handleFeatureChange('Check LLM Live Visibility', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Deck */}
              <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-auto">
                <button 
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Plan Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPackages;
