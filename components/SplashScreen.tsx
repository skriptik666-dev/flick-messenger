import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const setIntroPlayed = useStore((state) => state.setIntroPlayed);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canSkip, setCanSkip] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setCanSkip(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnd = () => {
    setIsVisible(false);
    setTimeout(() => setIntroPlayed(true), 600); // Wait for exit animation
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <video
            ref={videoRef}
            src="main_video.mp4" 
            autoPlay
            muted
            playsInline
            onEnded={handleEnd}
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-transparent to-transparent pointer-events-none" />

          {canSkip && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleEnd}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/20 backdrop-blur-md border border-white/40 rounded-full text-white font-bold text-lg flex items-center gap-2 hover:bg-white/30 hover:scale-105 active:scale-95 transition-all group pointer-events-auto shadow-2xl shadow-brand-500/20"
            >
              Start Flick
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};