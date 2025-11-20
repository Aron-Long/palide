import React, { useState, useRef, useEffect } from 'react';
import { Camera } from './components/Camera';
import { Polaroid } from './components/Polaroid';
import { PolaroidPhoto } from './types';
import { generatePhotoCaption } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';

// Define Themes
const THEMES = [
  { id: 'retro', name: 'Retro Cream', bgClass: 'bg-[#f2ece1]', textClass: 'text-gray-800' },
  { id: 'minimal', name: 'Pure White', bgClass: 'bg-gray-50', textClass: 'text-gray-900' },
  { id: 'concrete', name: 'Concrete', bgClass: 'bg-stone-300', textClass: 'text-stone-900' },
  { id: 'linen', name: 'Linen', bgClass: 'bg-[#f7f5f0]', textClass: 'text-stone-800' },
  { id: 'moss', name: 'Sage Green', bgClass: 'bg-[#e4e8e1]', textClass: 'text-gray-800' },
  { id: 'sky', name: 'Airy Blue', bgClass: 'bg-[#f0f8ff]', textClass: 'text-slate-800' },
  { id: 'sand', name: 'Warm Sand', bgClass: 'bg-[#ebe5ce]', textClass: 'text-amber-900' },
  { id: 'blush', name: 'Soft Blush', bgClass: 'bg-[#fff0f5]', textClass: 'text-rose-900' },
  { id: 'dark', name: 'Darkroom', bgClass: 'bg-zinc-900', textClass: 'text-zinc-100' },
  { id: 'gradient', name: 'Aura', bgClass: 'bg-gradient-to-tr from-indigo-100 via-purple-100 to-pink-100', textClass: 'text-slate-800' },
];

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PolaroidPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  // Access Control State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for MuleRun iframe parameters or local dev environment
    const params = new URLSearchParams(window.location.search);
    const origin = params.get('origin');
    const inIframe = window.self !== window.top;
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Authorize if:
    // 1. It's in an iframe (MuleRun context)
    // 2. It's localhost (Dev context)
    if (inIframe || isDev) {
        setIsAuthorized(true);
    }

    if (origin?.includes('mulerun')) {
      console.log('MuleRun Environment Detected', {
        userId: params.get('userId'),
        agentId: params.get('agentId')
      });
    }
  }, []);

  const handleCapture = async (dataUrl: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // 1. Create the photo object immediately for the animation
    const newPhoto: PolaroidPhoto = {
      id: uuidv4(),
      imageUrl: dataUrl,
      timestamp: Date.now(),
      caption: "", // Empty initially
      x: 50, // Start near the camera ejection point relative to container
      y: window.innerHeight - 450, // Approximate top of camera
      rotation: (Math.random() - 0.5) * 10, // Random slight tilt
      isDeveloping: true,
    };

    // Add to state to trigger render
    setPhotos((prev) => [...prev, newPhoto]);

    // 2. Animate "Ejection" logic
    setTimeout(() => {
        setPhotos((prev) => prev.map(p => 
            p.id === newPhoto.id 
            ? { ...p, y: p.y - 200, x: p.x + (Math.random() * 50) } 
            : p
        ));
    }, 100);

    // 3. Stop "developing" visual effect after 5 seconds
    setTimeout(() => {
      setPhotos((prev) =>
        prev.map((p) => (p.id === newPhoto.id ? { ...p, isDeveloping: false } : p))
      );
      setIsProcessing(false);
    }, 3000);

    // 4. Fetch AI Caption in background
    try {
      const caption = await generatePhotoCaption(dataUrl);
      setPhotos((prev) =>
        prev.map((p) => (p.id === newPhoto.id ? { ...p, caption } : p))
      );
    } catch (e) {
      console.error("Failed to caption", e);
      setPhotos((prev) =>
        prev.map((p) => (p.id === newPhoto.id ? { ...p, caption: "Start of something new" } : p))
      );
    }
  };

  const handleDragEnd = (id: string, x: number, y: number) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y } : p))
    );
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  if (!isAuthorized) {
    return (
      <div className="w-full h-[100dvh] flex flex-col items-center justify-center bg-[#f2ece1] text-gray-800 font-mono p-8 text-center">
        <div className="bg-white p-8 rounded-lg shadow-xl border-4 border-gray-200 max-w-md transform rotate-1">
          <h1 className="text-2xl font-bold mb-4 tracking-widest">RESTRICTED AREA</h1>
          <div className="w-full h-0.5 bg-gray-300 mb-6"></div>
          <p className="mb-6 text-sm leading-relaxed">
            This retro polaroid experience is exclusively available within the MuleRun platform.
          </p>
          <div className="text-xs text-gray-400 uppercase tracking-widest">Access Denied</div>
        </div>
      </div>
    );
  }

  return (
    <div 
        ref={containerRef} 
        className={`relative w-full h-[100dvh] overflow-hidden flex flex-col justify-between transition-colors duration-700 ${currentTheme.bgClass} ${currentTheme.textClass || ''}`}
    >
      {/* Theme Toggle Button */}
      <div className="absolute top-6 left-6 z-50">
         <button 
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm border border-gray-200 hover:bg-white transition-all"
            title="Change Theme"
         >
            <Palette size={20} className="text-gray-600" />
         </button>

         {/* Theme Menu */}
         <AnimatePresence>
            {showThemeMenu && (
                <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="absolute top-12 left-0 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 p-3 w-48 grid grid-cols-1 gap-1 max-h-[60vh] overflow-y-auto"
                >
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Select Theme</h3>
                    {THEMES.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => { setCurrentTheme(theme); setShowThemeMenu(false); }}
                            className={`
                                flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                                ${currentTheme.id === theme.id ? 'bg-black/5 font-medium' : 'hover:bg-black/5'}
                            `}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border border-gray-300 ${theme.bgClass}`}></div>
                                <span>{theme.name}</span>
                            </div>
                            {currentTheme.id === theme.id && <Check size={14} />}
                        </button>
                    ))}
                </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Header / Instructions */}
      <div className="absolute top-6 right-6 z-10 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 rotate-2">
            <h1 className="text-xl font-bold handwritten text-gray-800">My Photo Wall</h1>
        </div>
      </div>

      {/* Photo Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <AnimatePresence>
          {photos.map((photo) => (
            <Polaroid
              key={photo.id}
              photo={photo}
              containerRef={containerRef}
              onDragEnd={handleDragEnd}
              onDelete={handleDeletePhoto}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Camera Layer (Fixed Bottom Left) */}
      <div className="absolute bottom-10 left-10 z-30">
        <Camera onCapture={handleCapture} isProcessing={isProcessing} />
      </div>

      {/* Footer / Credits */}
      <div className="absolute bottom-2 right-4 opacity-50 text-xs font-mono z-10">
        Powered by Gemini 2.5
      </div>
    </div>
  );
};

export default App;