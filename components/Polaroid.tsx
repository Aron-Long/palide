import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PolaroidPhoto } from '../types';
import { Download, Loader2, X } from 'lucide-react';

interface PolaroidProps {
  photo: PolaroidPhoto;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

export const Polaroid: React.FC<PolaroidProps> = ({ photo, containerRef, onDragEnd, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const downloadImage = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration for high-res export
    const scale = 3; 
    const cardWidth = 240;
    // Estimated height based on layout: 
    // Top padding (12) + Image (270) + Bottom Area (roughly 58) = 340
    const cardHeight = 340; 
    
    canvas.width = cardWidth * scale;
    canvas.height = cardHeight * scale;
    ctx.scale(scale, scale);

    // 1. Draw White Card Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // 2. Draw Image Area Background
    const imgX = 12;
    const imgY = 12;
    const imgW = 216;
    const imgH = 270;

    ctx.fillStyle = '#111827'; // gray-900
    ctx.fillRect(imgX, imgY, imgW, imgH);

    // 3. Draw the Photo
    const img = new Image();
    img.src = photo.imageUrl;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Calculate aspect ratio for "cover" fit
    const srcRatio = img.width / img.height;
    const dstRatio = imgW / imgH;
    let sX = 0, sY = 0, sW = img.width, sH = img.height;

    if (srcRatio > dstRatio) {
      sW = img.height * dstRatio;
      sX = (img.width - sW) / 2;
    } else {
      sH = img.width / dstRatio;
      sY = (img.height - sH) / 2;
    }

    ctx.drawImage(img, sX, sY, sW, sH, imgX, imgY, imgW, imgH);

    // 4. Draw Inner Shadow/Glossy Overlay (Optional, subtle)
    const gradient = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
    gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(0.5, 'transparent');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    // 5. Draw Caption
    if (photo.caption) {
      // Wait for fonts to be ready ensures Caveat is available
      await document.fonts.ready;
      
      ctx.save();
      // Position: Below image, centered. 
      // Image ends at 12+270=282. Add some margin.
      const captionCenterY = 282 + 24; 
      ctx.translate(cardWidth / 2, captionCenterY);
      ctx.rotate(-1 * Math.PI / 180); // -1 deg rotation like CSS
      
      ctx.font = '24px "Caveat", cursive';
      ctx.fillStyle = '#374151'; // text-gray-700
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(photo.caption, 0, 0);
      ctx.restore();
    }

    // 6. Draw Date
    ctx.font = '10px monospace';
    ctx.fillStyle = '#9ca3af'; // text-gray-400
    ctx.textAlign = 'right';
    // Bottom right position
    ctx.fillText(new Date(photo.timestamp).toLocaleDateString(), cardWidth - 12, cardHeight - 10);

    // 7. Trigger Download
    const link = document.createElement('a');
    link.download = `polaroid-${photo.timestamp}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(photo.id);
  };

  return (
    <motion.div
      drag
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
        scale: 1, 
        opacity: 1,
        rotate: photo.rotation 
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
      className="absolute cursor-move touch-none select-none z-20 pointer-events-auto"
      style={{ width: '240px' }}
    >
      <div className="bg-white p-3 pb-8 shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl relative">
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