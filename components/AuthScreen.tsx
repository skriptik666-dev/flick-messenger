import React, { useState } from 'react';
import { useStore } from '../store';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, User, Lock } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, signup } = useStore();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        if (!username) {
            setError("Username is required");
            setLoading(false);
            return;
        }
        await signup(email, username, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-brand-50 to-accent-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6 relative overflow-hidden transition-colors">
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-300 dark:bg-brand-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 dark:opacity-30 animate-blob"></div>
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent-200 dark:bg-accent-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 dark:opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-70 dark:opacity-30 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-brand-500/10 dark:shadow-none p-8 border border-white/50 dark:border-gray-700 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
            <img src="logotype.jpg" alt="Flick" className="h-20 w-auto rounded-xl shadow-lg mb-4 object-cover" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            {isLoginMode ? 'Welcome Back' : 'Join Flick'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">
            {isLoginMode ? 'Enter your credentials to continue' : 'Create an account to start messaging'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Username</label>
                <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="YourName"
                    className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-400 transition-all text-gray-800 dark:text-gray-200"
                    required={!isLoginMode}
                />
                </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-400 transition-all text-gray-800 dark:text-gray-200"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-brand-400 transition-all text-gray-800 dark:text-gray-200"
                required
              />
            </div>
          </div>

          {error && (
             <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-sm text-center">
                {error}
             </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLoginMode ? 'Login' : 'Create Account'} <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setError(null);
                }}
                className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:text-brand-800 dark:hover:text-brand-300 transition-colors"
            >
                {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
        </div>
      </motion.div>
    </div>
  );
};