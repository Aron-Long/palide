import React, { useEffect, useRef, useState } from 'react';
import { Camera as CameraIcon, RefreshCw, ZoomIn, Upload } from 'lucide-react';

interface CameraProps {
  onCapture: (dataUrl: string) => void;
  isProcessing: boolean;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [flash, setFlash] = useState(false);
  
  // Zoom state
  const [scale, setScale] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const startDistRef = useRef<number>(0);
  const startScaleRef = useRef<number>(1);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      const isIframe = window.self !== window.top;
      const errorName = (err as any)?.name;
      
      if (isIframe && (errorName === 'NotAllowedError' || errorName === 'SecurityError')) {
         setError('Camera blocked by host. Use Upload.');
      } else {
         setError('Could not access camera.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            // Verify it's an image
            const img = new Image();
            img.onload = () => {
                onCapture(reader.result as string);
            };
            img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset value
    if (e.target) e.target.value = '';
  };

  const takePicture = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Flip horizontally for mirror effect if using front camera
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onCapture(dataUrl);
    }
  };

  // Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (!isActive) return;
    e.stopPropagation();
    const delta = -e.deltaY * 0.002;
    setScale(s => Math.min(Math.max(0.5, s + delta), 2.5));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      startDistRef.current = dist;
      startScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.stopPropagation();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (startDistRef.current > 0) {
        const newScale = startScaleRef.current * (dist / startDistRef.current);
        setScale(Math.min(Math.max(0.5, newScale), 2.5));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPinching(false);
  };

  return (
    <div 
        className={`relative w-[320px] h-[340px] select-none transition-transform duration-100 ease-out origin-bottom-left ${isActive ? 'z-40' : ''}`}
        style={{ transform: `scale(${scale})` }}
        onWheel={handleWheel}
        onClick={() => setIsActive(!isActive)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        {/* Zoom UI Hint - Only show when hovered or active to reduce clutter, adjusted position */}
        {(isActive) && (
            <div className="absolute -top-12 left-0 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none z-50 whitespace-nowrap backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                <ZoomIn size={10} />
                <span>Zoom active</span>
            </div>
        )}
        
      {/* Ejection Slot (Behind the front face) */}
      <div className="absolute top-[-10px] left-1/2 transform -translate-x-1/2 w-[180px] h-[20px] bg-gray-900 rounded-full z-0"></div>

      {/* Camera Body - Retro Cream Color */}
      <div className="absolute inset-0 bg-[#f2ece1] rounded-[40px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border-b-8 border-[#e6ddd0] z-10 flex flex-col items-center overflow-hidden">
        
        {/* Texture overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>

        {/* Top Details */}
        <div className="w-full h-24 flex justify-between items-center px-6 pt-4 relative">
            
            {/* Flash Unit */}
            <div className="w-20 h-14 bg-gray-200 rounded-lg border-4 border-gray-300 shadow-inner relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(255,255,255,0.8)_50%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -translate-x-full group-hover:translate-x-full"></div>
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-4 bg-gray-800/20 rounded blur-sm"></div>
                </div>
            </div>

            {/* Viewfinder & Sensor */}
            <div className="flex gap-2 items-center">
                 <div className="w-3 h-3 bg-black rounded-full"></div>
                 <div className="w-12 h-12 bg-black rounded-full border-4 border-gray-400 overflow-hidden relative shadow-lg">
                    {/* Fake glass reflection */}
                    <div className="absolute top-1 left-2 w-3 h-3 bg-white rounded-full opacity-30 blur-[1px]"></div>
                 </div>
            </div>
        </div>

        {/* Lens Ring (The Big Circle) */}
        <div className="relative mt-2">
             {/* Outer Rose Gold / Copper Ring */}
             <div className="w-48 h-48 rounded-full bg-[#e8d0c0] flex items-center justify-center shadow-lg border-4 border-[#dfc4b2]">
                {/* Inner Chrome Rings */}
                <div className="w-40 h-40 rounded-full bg-gradient-to-b from-gray-300 to-gray-100 flex items-center justify-center shadow-inner border border-gray-400">
                     <div className="w-36 h-36 rounded-full bg-black border-[6px] border-[#333] overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                        
                        {/* The actual Webcam Video */}
                        {error ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs text-center p-4 bg-gray-900/90 z-50 absolute inset-0">
                                <p className="mb-3 text-red-300 font-semibold leading-tight">{error}</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button onClick={() => startCamera()} className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-1.5 transition-colors">
                                        <RefreshCw size={12}/> Retry
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-500 flex items-center gap-1.5 transition-colors shadow-lg">
                                        <Upload size={12}/> Upload
                                    </button>
                                </div>
                            </div>
                        ) : (
                             <video 
                                ref={videoRef}
                                autoPlay 
                                playsInline 
                                muted
                                className="w-full h-full object-cover transform scale-x-[-1]" 
                            />
                        )}

                        {/* Lens Reflection Overlay */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"></div>
                        <div className="absolute top-8 right-8 w-8 h-4 bg-white opacity-20 rounded-full blur-md rotate-45"></div>
                     </div>
                </div>
             </div>
        </div>

        {/* Shutter Button */}
        <div className="absolute bottom-10 left-8">
            <button 
                onClick={takePicture}
                disabled={isProcessing || !stream}
                className={`
                    w-16 h-16 rounded-full border-4 border-[#e8d0c0] shadow-lg
                    flex items-center justify-center transition-all duration-100 active:scale-95
                    ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#d68c85] hover:bg-[#c77b74] cursor-pointer active:bg-[#b56a63]'}
                `}
            >
                <div className="w-12 h-12 rounded-full border-2 border-black/10 bg-white/10"></div>
            </button>
             {/* Hand Icon Hint */}
             <div className="absolute -bottom-8 left-4 pointer-events-none animate-bounce opacity-50">
                <div className="bg-white px-2 py-1 rounded text-[10px] font-bold shadow text-gray-600">CLICK</div>
             </div>
        </div>

        {/* Branding */}
        <div className="absolute bottom-6 right-8">
            <span className="font-bold text-gray-400 text-sm tracking-widest font-mono opacity-60">INSTA-AI</span>
        </div>
      </div>

      {/* Flash Overlay (Whole Screen) */}
      {flash && (
        <div className="fixed inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none"></div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleFileUpload}
      />

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
