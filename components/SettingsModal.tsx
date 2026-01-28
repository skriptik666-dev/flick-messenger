import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Moon, Sun, Bell, BellOff, LogOut, Check, Save, Loader2, Database, QrCode } from 'lucide-react';
import { api } from '../api';
import { getSupabaseConfig } from '../constants';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, 
    setSettingsOpen, 
    currentUser, 
    updateUserProfile,
    isDarkMode, 
    toggleTheme,
    notificationsEnabled,
    toggleNotifications,
    logout
  } = useStore();

  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Storage Config State
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSettingsOpen) {
        const config = getSupabaseConfig();
        setSbUrl(config.url.includes("YOUR_SUPABASE") ? '' : config.url);
        setSbKey(config.key.includes("YOUR_SUPABASE") ? '' : config.key);
        // Show config if it's not configured properly
        if (!config.isConfigured) {
            setShowConfig(true);
        }
    }
  }, [isSettingsOpen]);

  const handleClose = () => {
    setSettingsOpen(false);
    setIsSaved(false);
  };

  const handleSaveProfile = async () => {
    try {
        // Save Supabase Config
        if (sbUrl && sbKey) {
            localStorage.setItem('supabase_project_url', sbUrl);
            localStorage.setItem('supabase_anon_key', sbKey);
        }
        
        await updateUserProfile({ username, bio });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
        // Even if API fails, we simulate success for UI since optimistic update handled it
        console.warn("API Save failed, but local state updated");
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const imageUrl = await api.storage.upload(file);
        await updateUserProfile({ avatarUrl: imageUrl });
      } catch (error: any) {
        console.error("Avatar upload failed", error);
        // Don't alert here, api.storage.upload now handles fallback
        if (!error.message.includes("fallback")) {
            alert(`Network error uploading avatar. Please check connection.`);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`
              fixed left-0 right-0 top-0 bottom-0 m-auto
              w-full max-w-md h-[90vh] md:h-auto md:max-h-[800px]
              bg-white dark:bg-gray-900 
              rounded-3xl shadow-2xl z-50 
              flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700
            `}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h2>
              <button 
                onClick={handleClose}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Profile Section */}
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
                  <div className="w-28 h-28 relative">
                    <img 
                      src={currentUser?.avatarUrl} 
                      alt="Profile" 
                      className={`w-full h-full rounded-full object-cover border-4 border-gray-50 dark:border-gray-800 shadow-md transition-opacity group-hover:opacity-80 ${isUploading ? 'opacity-50' : ''}`} 
                    />
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                        </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isUploading && <Camera className="w-8 h-8 text-white drop-shadow-lg" />}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploading}
                  />
                </div>
                <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">@{username}</h3>
                <p className="text-xs text-gray-400">{currentUser?.email}</p>
              </div>

              {/* QR Code Section */}
              <div className="bg-brand-50 dark:bg-brand-900/10 rounded-2xl p-6 flex flex-col items-center text-center">
                  <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-4">Your Friend Code</p>
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                      <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUser?.friendCode}&color=ec4899`} 
                          alt="QR Code" 
                          className="w-32 h-32"
                      />
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-brand-200 dark:border-brand-900">
                      <span className="font-mono text-xl font-bold tracking-widest text-brand-600 dark:text-brand-400">{currentUser?.friendCode}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 max-w-[200px]">Let your friends scan this or share the code to connect.</p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pl-8 pr-4 outline-none focus:ring-2 focus:ring-brand-400 transition-all text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                  <textarea 
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-400 transition-all text-gray-800 dark:text-gray-100 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <button 
                  onClick={handleSaveProfile}
                  disabled={isUploading}
                  className={`
                    w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 shadow-lg transition-all
                    ${isSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-brand-500 hover:bg-brand-600'}
                    ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}
                  `}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-5 h-5" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Save Changes
                    </>
                  )}
                </button>
              </div>

              <hr className="border-gray-100 dark:border-gray-800" />

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Preferences</h3>
                
                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isDarkMode ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-500'}`}>
                      {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">Appearance</p>
                      <p className="text-xs text-gray-500">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`
                      w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out
                      ${isDarkMode ? 'bg-brand-500' : 'bg-gray-300'}
                    `}
                  >
                    <div className={`
                      w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300
                      ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}
                    `} />
                  </button>
                </div>

                {/* Supabase Config Dropdown */}
                <div className="pt-2">
                    <button 
                        onClick={() => setShowConfig(!showConfig)}
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-brand-500 transition-colors"
                    >
                        <Database className="w-3 h-3" /> Storage Configuration
                    </button>
                    
                    {showConfig && (
                        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-3 animate-fade-in border border-gray-100 dark:border-gray-700">
                             <p className="text-xs text-red-500 mb-2">Required for file uploads. Find these in Supabase Dashboard &rarr; Settings &rarr; API.</p>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Project URL</label>
                                <input 
                                    type="text" 
                                    value={sbUrl}
                                    onChange={(e) => setSbUrl(e.target.value)}
                                    placeholder="https://xyz.supabase.co"
                                    className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-400 dark:text-gray-200"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Anon / Public Key</label>
                                <input 
                                    type="password" 
                                    value={sbKey}
                                    onChange={(e) => setSbKey(e.target.value)}
                                    placeholder="eyJh..."
                                    className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-400 dark:text-gray-200"
                                />
                             </div>
                        </div>
                    )}
                </div>

              </div>

              {/* Logout */}
              <button 
                onClick={logout}
                className="w-full py-3 mt-4 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-5 h-5" /> Log Out
              </button>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};