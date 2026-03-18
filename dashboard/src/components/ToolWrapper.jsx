import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToolWrapper = ({ title, description, icon: Icon, onAnalyze, children, placeholder = "Enter domain (e.g., apple.com)" }) => {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const isExpired = user?.subscription?.status === 'expired';

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!input) return;

    if (isExpired) {
      setError('Your free trial has expired. Please upgrade your plan to continue using this tool.');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    try {
      await onAnalyze(input);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tool Header */}
      <div className="mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-6 border border-blue-100/50">
          <Icon className="text-blue-600 w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight text-[#1E293B]">
          {title}
        </h1>
        <p className="text-gray-500 max-w-2xl text-base font-medium leading-relaxed">{description}</p>
      </div>

      {/* Search Section */}
      <motion.div 
        layout
        className="bg-white border border-gray-200/80 p-8 rounded-2xl shadow-sm mb-10"
      >
        <form onSubmit={handleAnalyze} className="relative max-w-3xl mx-auto">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-[#F8F9FB] border border-gray-200 rounded-2xl py-5 pl-14 pr-32 text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all text-lg placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={isAnalyzing || isExpired}
              className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing
                </>
              ) : isExpired ? 'Upgrade Required' : 'Analyze'}
            </button>
          </div>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm max-w-3xl mx-auto"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
      </motion.div>

      {/* Results Section */}
      <AnimatePresence>
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolWrapper;
