import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PolaroidPhoto } from '../types';
import { Download, Loader2, X, ZoomIn } from 'lucide-react';

interface PolaroidProps {
  photo: PolaroidPhoto;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, containerRef, onDragEnd, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [scale, setScale] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const startDistRef = useRef<number>(0);
  const startScaleRef = useRef<number>(1);

  const handleWheel = (e: React.WheelEvent) => {
    if (!isActive) return;
    e.stopPropagation();
    // Prevent page scroll when zooming
    // e.preventDefault() is not allowed in passive event, but we are in React handler
    // React's synthetic event doesn't support preventDefault for wheel in some cases if passive
    // But since we are stopping propagation, it might be fine.
    
    const delta = -e.deltaY * 0.002;
    setScale(s => Math.min(Math.max(0.5, s + delta), 3));
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
      e.stopPropagation(); // Try to prevent drag interference
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (startDistRef.current > 0) {
        const newScale = startScaleRef.current * (dist / startDistRef.current);
        setScale(Math.min(Math.max(0.5, newScale), 3));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPinching(false);
  };

  const toggleActive = () => {
    setIsActive(!isActive);
  };

  const downloadImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Create a canvas to combine the polaroid frame and text
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size (standard polaroid size roughly 3.5 x 4.2 inches)
      // Using high resolution 
      const width = 600;
      const height = 720;
      const padding = 30;
      const bottomPadding = 120;

      canvas.width = width;
      canvas.height = height;

      // Draw white background (paper)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Load the main image
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = photo.imageUrl;
      });

      // Draw image centered with proper aspect ratio
      const imgWidth = width - (padding * 2);
      const imgRatio = img.width / img.height;
      
      // Calculate dimensions to fill the square area (cover)
      // The target area is square: width - padding*2
      const targetSize = width - (padding * 2);
      
      let drawWidth = targetSize;
      let drawHeight = targetSize;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > 1) {
        // Landscape image
        drawHeight = targetSize;
        drawWidth = targetSize * imgRatio;
        offsetX = (targetSize - drawWidth) / 2;
      } else {
        // Portrait image
        drawWidth = targetSize;
        drawHeight = targetSize / imgRatio;
        offsetY = (targetSize - drawHeight) / 2;
      }

      // Save context for clipping
      ctx.save();
      // Define the square clipping region
      ctx.beginPath();
      ctx.rect(padding, padding, targetSize, targetSize * 1.25); // 4:5 ratio like CSS
      ctx.clip();
      
      // Draw image covering the area
      // We need to draw the image so it covers the 4:5 area
      const targetAreaWidth = targetSize;
      const targetAreaHeight = targetSize * 1.25; // 4:5 aspect ratio
      const targetRatio = targetAreaWidth / targetAreaHeight;

      if (imgRatio > targetRatio) {
         // Image is wider than target, fit height
         drawHeight = targetAreaHeight;
         drawWidth = targetAreaHeight * imgRatio;
         offsetX = padding + (targetAreaWidth - drawWidth) / 2;
         offsetY = padding;
      } else {
         // Image is taller than target, fit width
         drawWidth = targetAreaWidth;
         drawHeight = targetAreaWidth / imgRatio;
         offsetX = padding;
         offsetY = padding + (targetAreaHeight - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      // Draw overlay gradient (optional, for consistency with UI)
      const gradient = ctx.createLinearGradient(padding, padding + targetAreaHeight, padding + targetAreaWidth, padding);
      gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(padding, padding, targetAreaWidth, targetAreaHeight);

      // Draw Caption
      if (photo.caption) {
        ctx.fillStyle = '#374151'; // gray-700
        // We need a font that looks handwritten. Since canvas can't guarantee 'Caveat' is loaded 
        // same as CSS, we'll use a system fallback or try to use the loaded font
        ctx.font = '40px "Caveat", cursive, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Save context to rotate text slightly
        ctx.save();
        ctx.translate(width / 2, height - (bottomPadding / 2));
        ctx.rotate(-1 * Math.PI / 180); // -1 degree rotation
        ctx.fillText(photo.caption, 0, 0);
        ctx.restore();
      }

      // Draw Date
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '20px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(new Date(photo.timestamp).toLocaleDateString(), width - padding, height - 15);

      // Download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `polaroid-${photo.timestamp}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Failed to generate polaroid image", err);
      // Fallback to downloading just the raw image if composition fails
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.download = `raw-${photo.timestamp}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(photo.id);
  };

  return (
    <motion.div
      drag={!isPinching}
      dragConstraints={containerRef}
      dragMomentum={false}
      initial={{ 
        x: photo.x, 
        y: photo.y, 
        scale: 0.5, 
        opacity: 0, 
        rotate: 0 
      }}
      animate={{ 
        x: photo.x, 
        y: photo.y, 
        scale: scale, 
        opacity: 1,
        rotate: photo.rotation,
        zIndex: isActive ? 50 : 20
      }}
      exit={{ 
        scale: 0.8, 
        opacity: 0, 
        transition: { duration: 0.2 } 
      }}
      onDragEnd={(e, info) => {
        // Calculate position relative to parent to save state
        // In a real app, we might use getBoundingClientRect, 
        // but here we trust framer's offset for simplicity in visual placement
        onDragEnd(photo.id, photo.x + info.offset.x, photo.y + info.offset.y);
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onWheel={handleWheel}
      onClick={toggleActive}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`absolute cursor-move touch-none select-none pointer-events-auto ${isActive ? 'ring-2 ring-blue-400 ring-offset-4 rounded-sm' : ''}`}
      style={{ width: '240px' }}
    >
      {/* Zoom UI Hint */}
      {(isActive || isHovered) && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none z-50 whitespace-nowrap backdrop-blur-sm">
            <ZoomIn size={10} />
            <span className="hidden sm:inline">Scroll / Pinch to Zoom</span>
            <span className="sm:hidden">Pinch to Zoom</span>
        </div>
      )}
      
      <div className="bg-white p-3 pb-8 shadow-xl transition-shadow duration-300 hover:shadow-2xl relative">
        {/* Photo Area */}
        <div className="bg-gray-900 aspect-[4/5] w-full overflow-hidden relative mb-3">
          <img
            src={photo.imageUrl}
            alt="Memory"
            className={`w-full h-full object-cover ${photo.isDeveloping ? 'developing-photo' : ''}`}
            draggable={false}
          />
          
          {/* Glossy Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </div>

        {/* Caption Area */}
        <div className="h-8 flex items-center justify-center text-center">
          {photo.caption ? (
            <p className="handwritten text-gray-700 text-xl transform -rotate-1">
              {photo.caption}
            </p>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Timestamp (Tiny) */}
        <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-mono">
          {new Date(photo.timestamp).toLocaleDateString()}
        </div>

        {/* Hover Controls */}
        {isHovered && (
          <>
            {/* Delete Button (Top Left) */}
            <button
              onClick={handleDelete}
              className="absolute -top-3 -left-3 bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition-transform hover:scale-110 z-30"
              title="Delete photo"
            >
              <X size={14} />
            </button>

            {/* Download Button (Top Right) */}
            <button
              onClick={downloadImage}
              className="absolute -top-3 -right-3 bg-gray-800 text-white p-2 rounded-full shadow-md hover:bg-gray-700 transition-transform hover:scale-110 z-30"
              title="Download raw image"
            >
              <Download size={14} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};