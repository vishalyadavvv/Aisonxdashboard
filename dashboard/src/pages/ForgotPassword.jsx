import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Sparkles, ArrowLeft, ArrowRight, Key, ShieldCheck, CheckCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
      toast.error('Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-cyan-500/10 rounded-full blur-[100px]" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='rgba(59,130,246,0.3)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
        />
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center z-10">
        {/* Left Side - Brand & Security Info */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 space-y-6"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-white/90 tracking-wide">GEO ENGINE · PASSWORD RESET</span>
            <ShieldCheck className="w-3 h-3 text-blue-400" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Reset Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Password
              </span>
            </h1>
            <p className="text-gray-300 text-base max-w-md">
              Don't worry! We'll send you a secure link to reset your password and regain access to your GEO dashboard.
            </p>
          </div>

          {/* Security Features
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span>256-bit encrypted reset link</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Key className="w-4 h-4 text-blue-400" />
              </div>
              <span>Secure one-time use token</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <span>Link expires in 1 hour</span>
            </div>
          </div> */}

          {/* Help Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative group hidden lg:block"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">Need immediate help?</h3>
                 <p className="text-gray-400 text-xs">
  Contact our support team at{" "}
  <a
    href="mailto:contact@dgtlmart.com"
    className="text-blue-400 underline"
  >
    contact@dgtlmart.com
  </a>
</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Side - Reset Form Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex-1 w-full max-w-md"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-2xl blur-xl opacity-75" />
            
            <div className="relative bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6 md:p-8">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 transition-all ${
                  isSent 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25'
                }`}>
                  {isSent ? (
                    <CheckCircle className="w-7 h-7 text-white" />
                  ) : (
                    <Key className="w-7 h-7 text-white" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isSent ? 'Check Your Email' : 'Reset Password'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isSent 
                    ? `We've sent a reset link to ${email}` 
                    : 'Enter your email to receive a reset link'}
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-5 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {!isSent ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <input
                          type="email"
                          required
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Sending Link...</span>
                        </div>
                      ) : (
                        <>
                          Send Reset Link
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                      <p className="text-emerald-400 text-sm font-medium">
                        Password reset link sent successfully!
                      </p>
                      <p className="text-gray-400 text-xs mt-2">
                        Please check your inbox and spam folder.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsSent(false);
                        setEmail('');
                        setError('');
                      }}
                      className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold py-3.5 rounded-xl transition-all border border-gray-600 flex items-center justify-center gap-2 group"
                    >
                      <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Try another email address
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <Link 
                  to="/login" 
                  className="inline-flex items-center justify-center gap-2 text-gray-400 text-sm font-medium hover:text-blue-400 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to login
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="mt-5 flex justify-center items-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Secure Reset</span>
                </div>
                <div>•</div>
                <div>24/7 Support</div>
                <div>•</div>
                <div>Instant Delivery</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;