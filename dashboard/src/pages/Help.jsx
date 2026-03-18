import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Book, MessageCircle, Mail, ChevronDown, Rocket, Shield, HelpCircle, Zap } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Help = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/faq');
        setFaqs(res.data.data.faqs);
      } catch (err) {
        toast.error('Failed to load help articles');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFAQs();
  }, []);

  const categories = [
    { name: 'Getting Started', icon: Zap, count: faqs.filter(f => f.category === 'Getting Started').length || 5 },
    { name: 'AI Optimization', icon: Book, count: faqs.filter(f => f.category === 'AI Optimization').length || 8 },
    { name: 'Security & Privacy', icon: Shield, count: faqs.filter(f => f.category === 'Security & Privacy').length || 4 },
    { name: 'Billing', icon: Mail, count: faqs.filter(f => f.category === 'Billing').length || 3 },
  ].filter(cat => {
    if (user?.role === 'admin' && cat.name === 'Billing') return false;
    return true;
  });

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-4">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-bold ring-1 ring-blue-100">
          <HelpCircle className="w-4 h-4" />
          Support Center
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">How can we help you?</h1>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search for articles, guides, or questions..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <motion.button
            key={i}
            whileHover={{ y: -4 }}
            className="p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <cat.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">{cat.name}</h3>
            <p className="text-[10px] font-medium text-slate-400">{cat.count} articles</p>
          </motion.button>
        ))}
      </div>

      {/* FAQs */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-slate-500 font-medium">Loading answers...</p>
            </div>
          ) : (
            filteredFaqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-50 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-slate-900 rounded-3xl p-10 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-600/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl font-bold text-white">Still have questions?</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">Can't find the answer you're looking for? Please chat with our friendly team.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <button 
            onClick={() => navigate('/dashboard/inquiries')}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Live Chat Support
          </button>
          <button 
            onClick={() => window.location.href = 'mailto:contact@dgtlmart.com'}
            className="w-full sm:w-auto px-8 py-3 bg-white/10 text-white rounded-xl text-sm font-bold backdrop-blur-md flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
          >
            <Mail className="w-5 h-5" />
            Email Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default Help;
