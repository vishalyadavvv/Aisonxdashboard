import { useState } from 'react';
import { Check, X, Shield, Zap, Star, Rocket, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const PLAN_AMOUNTS = { Starter: 19, Growth: 49, Professional: 99 };

  const handleUpgrade = async (planName) => {
    try {
      setLoading(true);

      // Step 1: Create Razorpay Order on backend
      const res = await api.post('/payments/create-order', { planName });
      const { orderId, amount, currency, keyId } = res.data.data;

      // Step 2: Open Razorpay Checkout
      const options = {
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'AIsonx GEO',
        description: `${planName} Plan — Monthly`,
        image: '/logo.png',
        handler: async function (response) {
          try {
            // Step 3: Verify payment on backend and activate subscription
            const verifyRes = await api.post('/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planName
            });
            updateUser(verifyRes.data.data.user);
            toast.success(`🎉 ${planName} plan activated successfully!`);
            navigate('/dashboard');
          } catch (e) {
            toast.error('Payment received but verification failed. Contact support.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || ''
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => { setLoading(false); }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const handleStartTrial = async (tier) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/start-trial', { tier });
      updateUser(res.data.data.user);
      toast.success(`${tier} trial started successfully!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start trial');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanAction = (planName) => {
    if (user?.subscription?.trialUsed) {
      handleUpgrade(planName);
    } else {
      handleStartTrial(planName);
    }
  };

  const plans = [
    {
      name: 'Starter',
      icon: Rocket,
      color: 'emerald',
      price: 19,
      description: 'Individuals & Small Teams',
      trial: '7-Day Free Trial',
      features: {
        'AI Engines Included': 'ChatGPT & Google AI',
        'Regions Included': '1 Region',
        'Monthly AI Scans': '10 Scans',
        'Prompts per Project': '2 Prompts',
        'Unlimited Users': true,
        'Analytics Dashboards': 'Full Access',
        'AI Visibility Audit Tool': true,
        'AI Domain Analyzer': true,
        'Brand Authority Score': true,
        'Check LLM Entity Visibility': false,
        'Check LLM Live Visibility': false,
        'Advanced Visibility Insights': false,
      },
      bestFor: 'Individuals & Small Teams'
    },
    {
      name: 'Growth',
      icon: Zap,
      color: 'blue',
      price: 49,
      description: 'Growing Businesses',
      popular: true,
      trial: '7-Day Free Trial',
      features: {
        'AI Engines Included': 'ChatGPT, Gemini, Google AI',
        'Regions Included': '1 Region',
        'Monthly AI Scans': '15 Scans',
        'Prompts per Project': '10 Prompts',
        'Unlimited Users': true,
        'Analytics Dashboards': 'Full Access',
        'AI Visibility Audit Tool': true,
        'AI Domain Analyzer': true,
        'Brand Authority Score': true,
        'Check LLM Entity Visibility': true,
        'Check LLM Live Visibility': true,
        'Advanced Visibility Insights': 'Standard',
      },
      bestFor: 'Growing Businesses'
    },
    {
      name: 'Professional',
      icon: Star,
      color: 'purple',
      price: 99,
      description: 'Agencies & Advanced Teams',
      trial: '7-Day Free Trial',
      features: {
        'AI Engines Included': 'ChatGPT, Gemini, Perplexity, Claude & Google AI',
        'Regions Included': '1 Region',
        'Monthly AI Scans': '20 Scans',
        'Prompts per Project': '25 Prompts',
        'Unlimited Users': true,
        'Analytics Dashboards': 'Full Access',
        'AI Visibility Audit Tool': true,
        'AI Domain Analyzer': true,
        'Brand Authority Score': true,
        'Check LLM Entity Visibility': true,
        'Check LLM Live Visibility': true,
        'Advanced Visibility Insights': 'Advanced',
      },
      bestFor: 'Agencies & Advanced Teams'
    }
  ];

  const featureList = [
    'AI Engines Included',
    'Regions Included',
    'Monthly AI Scans',
    'Prompts per Project',
    'Unlimited Users',
    'Analytics Dashboards',
    'AI Visibility Audit Tool',
    'AI Domain Analyzer',
    'Brand Authority Score',
    'Check LLM Entity Visibility',
    'Check LLM Live Visibility',
    'Advanced Visibility Insights',
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 py-4 px-4">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Choose the plan that fits your business needs. Scale your AI visibility with precision.</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div 
            key={i} 
            className={`relative bg-white rounded-3xl border-2 transition-all p-8 flex flex-col ${
              plan.popular ? 'border-blue-600 shadow-2xl shadow-blue-500/10 scale-105 z-10' : 'border-slate-100 shadow-sm hover:border-slate-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ring-4 ring-white">
                Most Popular
              </div>
            )}

            <div className="space-y-6 flex-1">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl bg-${plan.color}-50 text-${plan.color}-600`}>
                  <plan.icon className="w-6 h-6" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest text-slate-400`}>{plan.name}</span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                  <span className="text-slate-400 font-bold text-sm">/ month</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-slate-500 font-medium">{plan.description}</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {plan.trial}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                {featureList.slice(0, 5).map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="mt-1">
                      {typeof plan.features[feature] === 'boolean' ? (
                        plan.features[feature] ? <div className={`w-4 h-4 rounded-full bg-${plan.color}-100 flex items-center justify-center`}><Check className={`w-3 h-3 text-${plan.color}-600`} /></div> : <X className="w-4 h-4 text-slate-300" />
                      ) : (
                        <Check className={`w-4 h-4 text-${plan.color}-600`} />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-600 leading-tight">
                      <span className="block font-bold text-slate-400 text-[10px] uppercase tracking-wider">{feature}</span>
                      {typeof plan.features[feature] === 'boolean' ? (plan.features[feature] ? 'Included' : 'Not Included') : plan.features[feature]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => handlePlanAction(plan.name)}
              disabled={loading || (
                user?.subscription?.tier === plan.name.toLowerCase() && 
                user?.subscription?.status !== 'expired' && 
                (user?.subscription?.promptsUsedThisMonth || 0) < (plan.name.toLowerCase() === 'professional' ? 20 : (plan.name.toLowerCase() === 'growth' ? 15 : 10))
              )}
              className={`w-full mt-10 py-4 rounded-2xl text-sm font-bold transition-all ${
                plan.popular 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                'Processing...'
              ) : user?.subscription?.tier === plan.name.toLowerCase() ? (
                user?.subscription?.status === 'expired' 
                  ? 'Renew Plan' 
                  : ((user?.subscription?.promptsUsedThisMonth || 0) >= (plan.name.toLowerCase() === 'professional' ? 20 : (plan.name.toLowerCase() === 'growth' ? 15 : 10)) 
                      ? 'Recharge Plan' 
                      : 'Current Plan')
              ) : user?.subscription?.trialUsed ? (
                `Upgrade to ${plan.name}`
              ) : (
                'Start 7-Day Free Trial'
              )}
            </button>
            {user?.subscription?.trialUsed && user?.subscription?.tier === 'none' && (
              <p className="text-[10px] text-center mt-2 text-slate-400 font-medium italic">
                Free trial already used for this account
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="mt-20 space-y-8 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
          <h2 className="text-xl font-bold text-slate-900">Feature Comparison</h2>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            <HelpCircle className="w-4 h-4" />
            Learn more about each feature
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-slate-400">Features</th>
                {plans.map((plan, i) => (
                  <th key={i} className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-extrabold text-slate-900">{plan.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">${plan.price}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {featureList.map((feature, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 text-xs font-bold text-slate-700">{feature}</td>
                  {plans.map((plan, j) => (
                    <td key={j} className="py-4 px-4 text-center">
                      <div className="flex justify-center items-center">
                        {typeof plan.features[feature] === 'boolean' ? (
                          plan.features[feature] ? (
                            <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )
                        ) : (
                          <span className="text-xs font-extrabold text-slate-900">{plan.features[feature]}</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-4 px-4 text-xs font-bold text-slate-700">Best For</td>
                {plans.map((plan, i) => (
                  <td key={i} className="py-4 px-4 text-center">
                    <span className="text-[10px] font-bold text-slate-500">{plan.bestFor}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ / Support footer */}
      <div className="bg-slate-900 rounded-3xl p-10 text-center space-y-6 relative overflow-hidden">
        <h2 className="text-2xl font-bold text-white relative z-10">Need a custom plan?</h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto relative z-10">We offer custom enterprise solutions with dedicated account management and advanced API access.</p>
        <button 
          onClick={() => window.location.href = 'mailto:contact@dgtlmart.com'}
          className="relative z-10 px-8 py-3 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
        >
          Contact Sales
        </button>
      </div>
    </div>
  );
};

export default Pricing;
