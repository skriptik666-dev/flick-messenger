import React, { useEffect } from 'react';
import { useStore } from './store';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  const { introPlayed, currentUser, isMobileMenuOpen, setMobileMenuOpen, isDarkMode } = useStore();

  // Handle Resize for mobile menu
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileMenuOpen]);

  // View: Splash Screen
  if (!introPlayed) {
    return <SplashScreen />;
  }

  // View: Auth
  if (!currentUser) {
    return <AuthScreen />;
  }

  // View: Main Messenger Dashboard
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-black transition-colors duration-300">
        <SettingsModal />
        
        {/* Sidebar (Chat List) */}
        <aside 
          className={`
            absolute inset-y-0 left-0 z-20 w-full sm:w-80 md:w-96 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
            ${isMobileMenuOpen || (!isMobileMenuOpen && !useStore.getState().activeChatId) ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${useStore.getState().activeChatId ? 'hidden md:block' : 'block'}
          `}
        >
          <ChatList />
        </aside>

        {/* Main Content (Chat Window) */}
        <main className="flex-1 w-full h-full relative z-10">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
};

export default App;