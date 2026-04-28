import React, { useState, useEffect, useRef } from 'react';
import { Upload, Scissors, Palette, Wand2, ChevronRight, Check, Crop, RotateCw, RefreshCw, X, Plus, Trash2, Tag, Image as ImageIcon } from 'lucide-react';
import { LogoImage, Language, GarmentImage } from '../types';
import { translations } from '../i18n';
import ReactCrop, { type Crop as ReactCropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface LogoStepProps {
  onComplete: (logos: LogoImage[]) => void;
  garments?: GarmentImage[];
  lang: Language;
}

const PRESET_COLORS = [
  { name: 'Original', value: null },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Navy', value: '#1e3a8a' },
  { name: 'Red', value: '#991b1b' },
  { name: 'Gold', value: '#854d0e' },
  { name: 'Silver', value: '#475569' },
];

export const LogoStep: React.FC<LogoStepProps> = ({ onComplete, garments, lang }) => {
  const t = translations[lang].logo;
  
  const [logos, setLogos] = useState<LogoImage[]>([]);
  const [activeLogoId, setActiveLogoId] = useState<string | null>(null);
  const [artboardSize, setArtboardSize] = useState({ width: 800, height: 800 });
  const artboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!artboardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setArtboardSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(artboardRef.current);
    return () => observer.disconnect();
  }, []);

  // Current active logo state
  const activeLogo = logos.find(l => l.id === activeLogoId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [invert, setInvert] = useState(false);
  const [colorOverlay, setColorOverlay] = useState<string | null>(null);
  const [autoTrim, setAutoTrim] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [tempRotation, setTempRotation] = useState(0);
  const [isManualCropping, setIsManualCropping] = useState(false);
  const [crop, setCrop] = useState<ReactCropType>();
  const [completedCrop, setCompletedCrop] = useState<ReactCropType | null>(null);

  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement>(null);

  // Reset local processing state when active logo changes
  useEffect(() => {
    setRemoveBackground(true);
    setInvert(false);
    setColorOverlay(null);
    setAutoTrim(true);
    setRotation(0);
    setTempRotation(0);
    setIsManualCropping(false);
    setCrop(undefined);
    setCompletedCrop(null);
  }, [activeLogoId]);

  const addImageLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const newLogo: LogoImage = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'image',
          url: url,
          originalUrl: url,
          processedUrl: url,
          width: img.width,
          height: img.height,
        };
        setLogos(prev => [...prev, newLogo]);
        setActiveLogoId(newLogo.id);
        e.target.value = ''; // Reset to allow same file selection
      };
      img.src = url;
    }
  };

  const addLabelLogo = () => {
    const newLogo: LogoImage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'label',
      url: '',
      originalUrl: '',
      width: 600, // 10px per mm for preview: 60mm * 10 = 600
      height: 200, // 20mm * 10 = 200
      labelProps: {
        text: 'BRAND NAME',
        color: '#ffffff',
        borderColor: '#000000',
        textColor: '#000000',
        borderStyle: 'solid',
        borderWidth: 1,
        stitchLeftRight: true,
        stitchTopBottom: false,
        stitchColor: '#000000',
        physicalWidthMm: 60,
        physicalHeightMm: 20,
        fontSize: 40
      }
    };
    setLogos(prev => [...prev, newLogo]);
    setActiveLogoId(newLogo.id);
  };

  const updateActiveLogo = (updates: Partial<LogoImage>) => {
    if (!activeLogoId) return;
    setLogos(prev => prev.map(l => l.id === activeLogoId ? { ...l, ...updates } : l));
  };

  const updateLabelProps = (updates: Partial<NonNullable<LogoImage['labelProps']>>) => {
    if (!activeLogoId || !activeLogo?.labelProps) return;
    
    const newProps = { ...activeLogo.labelProps, ...updates };
    const updatesToApply: Partial<LogoImage> = { labelProps: newProps };
    
    if (updates.physicalWidthMm !== undefined || updates.physicalHeightMm !== undefined) {
      // Keep 10px per mm for preview
      updatesToApply.width = newProps.physicalWidthMm * 10;
      updatesToApply.height = newProps.physicalHeightMm * 10;
    }
    
    updateActiveLogo(updatesToApply);
  };

  const deleteLogo = (id: string) => {
    setLogos(prev => prev.filter(l => l.id !== id));
    if (activeLogoId === id) {
      setActiveLogoId(null);
    }
  };

  const processImage = async () => {
    if (!activeLogo || activeLogo.type !== 'image' || !activeLogo.originalUrl) return;
    setIsProcessing(true);
    
    const img = new Image();
    img.src = activeLogo.originalUrl;
    await new Promise((resolve) => (img.onload = resolve));

    // 1. First, handle background removal on the original unrotated image
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = img.width;
    bgCanvas.height = img.height;
    const bgCtx = bgCanvas.getContext('2d');
    if (!bgCtx) return;
    
    bgCtx.drawImage(img, 0, 0);
    const bgImageData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
    const bgData = bgImageData.data;

    if (removeBackground) {
      const edgePixels = [];
      for (let x = 0; x < bgCanvas.width; x++) {
        edgePixels.push((0 * bgCanvas.width + x) * 4);
        edgePixels.push(((bgCanvas.height - 1) * bgCanvas.width + x) * 4);
      }
      for (let y = 0; y < bgCanvas.height; y++) {
        edgePixels.push((y * bgCanvas.width + 0) * 4);
        edgePixels.push((y * bgCanvas.width + bgCanvas.width - 1) * 4);
      }

      const colorCounts: Record<string, number> = {};
      let transparentCount = 0;

      edgePixels.forEach(idx => {
        if (bgData[idx + 3] < 50) {
          transparentCount++;
        } else {
          const r = Math.round(bgData[idx] / 15) * 15;
          const g = Math.round(bgData[idx + 1] / 15) * 15;
          const b = Math.round(bgData[idx + 2] / 15) * 15;
          const key = `${r},${g},${b}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
      });

      // Find top colors
      const sortedColors = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          return { r, g, b, count };
        });

      // If it's a PNG with a solid background (e.g. white), remove it.
      // If it has a fake checkerboard background, there will be two dominant colors (e.g. white and gray).
      const topColorsToRemove = [];
      if (sortedColors.length > 0 && sortedColors[0].count > edgePixels.length * 0.1) {
        topColorsToRemove.push(sortedColors[0]);
        // If the second color is also very common (e.g. checkerboard), remove it too
        if (sortedColors.length > 1 && sortedColors[1].count > edgePixels.length * 0.1) {
          topColorsToRemove.push(sortedColors[1]);
        }
      }

      if (topColorsToRemove.length > 0) {
        const threshold = 60;
        for (let i = 0; i < bgData.length; i += 4) {
          if (bgData[i + 3] > 0) {
            const r = bgData[i], g = bgData[i+1], b = bgData[i+2];
            
            let minDiff = Infinity;
            for (const color of topColorsToRemove) {
              const diff = Math.sqrt(Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2));
              if (diff < minDiff) minDiff = diff;
            }
            
            if (minDiff < threshold) {
              bgData[i + 3] = 0;
            }
          }
        }
      }
    }

    if (invert) {
      for (let i = 0; i < bgData.length; i += 4) {
        bgData[i] = 255 - bgData[i];
        bgData[i+1] = 255 - bgData[i+1];
        bgData[i+2] = 255 - bgData[i+2];
      }
    }

    if (colorOverlay) {
      const hex = colorOverlay.replace('#', '');
      const r_over = parseInt(hex.substring(0, 2), 16);
      const g_over = parseInt(hex.substring(2, 4), 16);
      const b_over = parseInt(hex.substring(4, 6), 16);

      for (let i = 0; i < bgData.length; i += 4) {
        if (bgData[i+3] > 10) {
          bgData[i] = r_over;
          bgData[i+1] = g_over;
          bgData[i+2] = b_over;
        }
      }
    }

    bgCtx.putImageData(bgImageData, 0, 0);

    // 2. Now handle rotation
    const canvas = document.createElement('canvas');
    const rads = (rotation * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rads));
    const absSin = Math.abs(Math.sin(rads));
    canvas.width = img.width * absCos + img.height * absSin;
    canvas.height = img.width * absSin + img.height * absCos;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rads);
    ctx.drawImage(bgCanvas, -img.width / 2, -img.height / 2);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let finalUrl = canvas.toDataURL();
    let trimRect = null;

    if (autoTrim) {
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX >= minX && maxY >= minY) {
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const trimCanvas = document.createElement('canvas');
        trimCanvas.width = width;
        trimCanvas.height = height;
        const trimCtx = trimCanvas.getContext('2d');
        trimCtx?.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
        finalUrl = trimCanvas.toDataURL();
        trimRect = { x: minX, y: minY, width, height };
      }
    }
    
    updateActiveLogo({ 
      processedUrl: finalUrl, 
      trimRect: trimRect || undefined,
      width: trimRect ? trimRect.width : canvas.width,
      height: trimRect ? trimRect.height : canvas.height
    });
    setIsProcessing(false);
  };

  useEffect(() => {
    if (activeLogo?.type === 'image') {
      processImage();
    }
  }, [removeBackground, colorOverlay, autoTrim, rotation, invert, activeLogo?.originalUrl]);

  const handleConfirmCrop = () => {
    if (!activeLogo || activeLogo.type !== 'image' || !activeLogo.processedUrl) return;
    if (isManualCropping && completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && imgRef.current) {
      const img = imgRef.current;
      const canvas = document.createElement('canvas');
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(
        img,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      const finalUrl = canvas.toDataURL();
      setRemoveBackground(false); // Disable auto-background removal after manual crop
      updateActiveLogo({ 
        processedUrl: finalUrl, 
        originalUrl: finalUrl,
        width: canvas.width,
        height: canvas.height
      }); // Update originalUrl so further edits apply to cropped image
      setIsManualCropping(false);
      setCrop(undefined);
      setCompletedCrop(null);
    }
  };

  const handleContinue = () => {
    if (logos.length === 0) return;
    onComplete(logos);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-light text-slate-900">{t.title}</h2>
        <p className="text-slate-500">{t.desc}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch h-[700px]">
        {/* Sidebar for multiple logos */}
        <div className="w-full lg:w-64 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-900">图层列表</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {logos.map((logo, index) => (
              <div 
                key={logo.id}
                onClick={() => setActiveLogoId(logo.id)}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${activeLogoId === logo.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2">
                  {logo.type === 'image' ? <ImageIcon size={16} className="text-slate-500" /> : <Tag size={16} className="text-slate-500" />}
                  <span className="text-xs font-medium text-slate-700">
                    {logo.type === 'image' ? `Logo ${index + 1}` : `唛头 ${index + 1}`}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteLogo(logo.id); }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {logos.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                暂无图层，请添加
              </div>
            )}
          </div>
          
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors cursor-pointer">
              <Plus size={14} />
              添加 Logo 图片
              <input type="file" className="hidden" onChange={addImageLogo} accept="image/*" />
            </label>
            <button 
              onClick={addLabelLogo}
              className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Plus size={14} />
              添加唛头 (标签)
            </button>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 bg-slate-100 rounded-2xl shadow-inner border border-slate-200 overflow-hidden relative flex items-center justify-center p-4 min-h-[500px]">
          {/* 1:1 Artboard Container that fits available space */}
          <div 
            ref={artboardRef}
            className="bg-white shadow-2xl relative overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '1 / 1',
              maxHeight: '100%',
              maxWidth: '100%',
              height: '800px', // Will be constrained by maxHeight/maxWidth
              backgroundImage: `conic-gradient(#f0f0f0 90deg, #ffffff 90deg 180deg, #f0f0f0 180deg 270deg, #ffffff 270deg)`,
              backgroundSize: '20px 20px'
            }}
          >
            {!activeLogo ? (
              <div className="text-slate-400 text-sm flex flex-col items-center gap-2">
                <ImageIcon size={48} className="opacity-20" />
                请在左侧添加或选择一个图层
              </div>
            ) : activeLogo.type === 'image' ? (
              isManualCropping ? (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-w-full max-h-full flex items-center justify-center"
                >
                  <img 
                    ref={imgRef}
                    src={activeLogo.processedUrl || activeLogo.url} 
                    alt="Logo Preview" 
                    className="max-w-full max-h-full select-none"
                    style={{ maxHeight: '800px' }}
                    draggable={false}
                  />
                </ReactCrop>
              ) : (
                <img 
                  ref={imgRef}
                  src={activeLogo.processedUrl || activeLogo.url} 
                  alt="Logo Preview" 
                  className={`max-w-full max-h-full object-contain transition-opacity select-none border border-dashed border-slate-400 ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
                  draggable={false}
                />
              )
            ) : (
              // Label Preview
              (() => {
                const padding = 40; // 20px padding on each side
                const maxContainerWidth = Math.max(100, artboardSize.width - padding);
                const maxContainerHeight = Math.max(100, artboardSize.height - padding);
                const scale = Math.min(1, maxContainerWidth / activeLogo.width, maxContainerHeight / activeLogo.height);
                const scaledWidth = activeLogo.width * scale;
                const scaledHeight = activeLogo.height * scale;

                return (
                  <div className="max-w-full max-h-full flex items-center justify-center p-4">
                    <div 
                      className="flex items-center justify-center"
                      style={{ width: scaledWidth, height: scaledHeight }}
                    >
                      <div 
                        className="flex items-center justify-center relative overflow-hidden shrink-0 shadow-lg"
                        style={{
                          width: activeLogo.width,
                          height: activeLogo.height,
                          backgroundColor: activeLogo.labelProps?.color,
                          border: `${activeLogo.labelProps?.borderWidth ?? 1}px ${activeLogo.labelProps?.borderStyle || 'solid'} ${activeLogo.labelProps?.borderColor}`,
                          color: activeLogo.labelProps?.textColor,
                          transformOrigin: 'center',
                          transform: `scale(${scale}) rotate(${activeLogo.labelProps?.rotation || 0}deg)`
                        }}
                      >
                    {/* Stitching Lines (15px from edge) */}
              {(activeLogo.labelProps?.stitchLeft ?? activeLogo.labelProps?.stitchLeftRight ?? true) && (
                <div className="absolute left-[15px] top-[15px] bottom-[15px] border-l border-dashed" style={{ borderColor: activeLogo.labelProps?.stitchColor || activeLogo.labelProps?.borderColor }} />
              )}
              {(activeLogo.labelProps?.stitchRight ?? activeLogo.labelProps?.stitchLeftRight ?? true) && (
                <div className="absolute right-[15px] top-[15px] bottom-[15px] border-r border-dashed" style={{ borderColor: activeLogo.labelProps?.stitchColor || activeLogo.labelProps?.borderColor }} />
              )}
              {(activeLogo.labelProps?.stitchTop ?? activeLogo.labelProps?.stitchTopBottom ?? false) && (
                <div className="absolute top-[15px] left-[15px] right-[15px] border-t border-dashed" style={{ borderColor: activeLogo.labelProps?.stitchColor || activeLogo.labelProps?.borderColor }} />
              )}
              {(activeLogo.labelProps?.stitchBottom ?? activeLogo.labelProps?.stitchTopBottom ?? false) && (
                <div className="absolute bottom-[15px] left-[15px] right-[15px] border-b border-dashed" style={{ borderColor: activeLogo.labelProps?.stitchColor || activeLogo.labelProps?.borderColor }} />
              )}
              {activeLogo.labelProps?.imageUrl ? (
                <img 
                  src={activeLogo.labelProps.imageUrl} 
                  alt="Label Image" 
                  className="absolute cursor-move select-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(calc(-50% + ${activeLogo.labelProps.imageOffsetX || 0}px), calc(-50% + ${activeLogo.labelProps.imageOffsetY || 0}px)) scale(${activeLogo.labelProps.imageScale || 1})`,
                    transformOrigin: 'center',
                    maxWidth: 'none',
                    maxHeight: 'none'
                  }}
                  draggable={false}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(true);
                    setDragStart({
                      x: e.clientX - (activeLogo.labelProps?.imageOffsetX || 0),
                      y: e.clientY - (activeLogo.labelProps?.imageOffsetY || 0)
                    });
                  }}
                  onPointerMove={(e) => {
                    if (!isDraggingImage) return;
                    updateLabelProps({
                      imageOffsetX: e.clientX - dragStart.x,
                      imageOffsetY: e.clientY - dragStart.y
                    });
                  }}
                  onPointerUp={() => setIsDraggingImage(false)}
                  onPointerLeave={() => setIsDraggingImage(false)}
                />
              ) : (
                    <span className="font-bold z-10" style={{ fontSize: `${activeLogo.labelProps?.fontSize || activeLogo.height * 0.4}px` }}>{activeLogo.labelProps?.text}</span>
                  )}
                </div>
              </div>
            </div>
            );
          })()
          )}
          
          {isManualCropping && (
            <div className="absolute top-4 left-4 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest z-10">
              Drag edges to crop
            </div>
          )}
          </div>
        </div>

        {/* Controls Area */}
        <div className="w-full lg:w-80 flex flex-col h-[700px]">
          <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-y-auto space-y-6">
            {!activeLogo ? (
              <div className="text-slate-400 text-sm text-center py-12">
                无选中图层
              </div>
            ) : activeLogo.type === 'image' ? (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Wand2 size={16} />
                  {t.actions}
                </h3>

                <div className="space-y-4">
                  {/* Background Removal */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">一键抠图</p>
                    <button
                      onClick={() => setRemoveBackground(!removeBackground)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${removeBackground ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      <Scissors size={16} />
                      <span className="text-xs font-medium">一键抠图</span>
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">快捷处理</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setInvert(!invert)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${invert ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      >
                        <RefreshCw size={16} />
                        <span className="text-[10px] font-medium">反转颜色</span>
                      </button>
                      <button
                        onClick={() => setIsManualCropping(!isManualCropping)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${isManualCropping ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      >
                        <Crop size={16} />
                        <span className="text-[10px] font-medium">自由裁剪</span>
                      </button>
                    </div>
                    {isManualCropping && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleConfirmCrop}
                          disabled={!completedCrop || completedCrop.width === 0 || completedCrop.height === 0}
                          className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          确认裁剪
                        </button>
                        <button
                          onClick={() => {
                            setIsManualCropping(false);
                            setCrop(undefined);
                            setCompletedCrop(null);
                          }}
                          className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Color Overlay */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.recolor}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => setColorOverlay(c.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${colorOverlay === c.value ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c.value || '#e2e8f0' }}
                          title={c.name}
                        >
                          {!c.value && <X size={12} className="text-slate-400" />}
                          {colorOverlay === c.value && <Check size={12} className={c.name === 'White' ? 'text-slate-900' : 'text-white'} />}
                        </button>
                      ))}
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-transparent hover:scale-105 transition-all">
                        <input 
                          type="color" 
                          value={colorOverlay || '#000000'} 
                          onChange={(e) => setColorOverlay(e.target.value)}
                          className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.rotation}</p>
                      <span className="text-[10px] font-bold text-slate-900">{tempRotation}°</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      value={tempRotation} 
                      onChange={(e) => setTempRotation(parseInt(e.target.value))}
                      onMouseUp={() => setRotation(tempRotation)}
                      onTouchEnd={() => setRotation(tempRotation)}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>

                  {/* Auto Trim */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">自动去白边/透明边</p>
                    <button
                      onClick={() => setAutoTrim(!autoTrim)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${autoTrim ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      <Crop size={16} />
                      <span className="text-xs font-medium">自动去白边/透明边</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Tag size={16} />
                  唛头设置
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">文字内容</label>
                    <input 
                      type="text" 
                      value={activeLogo.labelProps?.text || ''}
                      onChange={(e) => updateLabelProps({ text: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">文字大小</p>
                      <span className="text-[10px] font-bold text-slate-900">{activeLogo.labelProps?.fontSize || 40}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="200" 
                      value={activeLogo.labelProps?.fontSize || 40} 
                      onChange={(e) => updateLabelProps({ fontSize: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>
                  
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">宽度 (mm)</label>
                        <input 
                          type="number" 
                          value={activeLogo.labelProps?.physicalWidthMm || 60}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 60;
                            updateLabelProps({ physicalWidthMm: val });
                            updateActiveLogo({ width: val * 10 }); // Update preview pixel size
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">高度 (mm)</label>
                        <input 
                          type="number" 
                          value={activeLogo.labelProps?.physicalHeightMm || 20}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 20;
                            updateLabelProps({ physicalHeightMm: val });
                            updateActiveLogo({ height: val * 10 }); // Update preview pixel size
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                      </div>
                    </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">快捷颜色设置</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateLabelProps({ color: '#ffffff', textColor: '#000000', borderColor: '#000000', stitchColor: '#000000' })}
                          className="flex-1 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm text-center"
                        >
                          白底黑字
                        </button>
                        <button 
                          onClick={() => updateLabelProps({ color: '#000000', textColor: '#ffffff', borderColor: '#ffffff', stitchColor: '#ffffff' })}
                          className="flex-1 py-2 bg-slate-900 text-white border border-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm text-center"
                        >
                          黑底白字
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">旋转方向 (度)</label>
                    <select
                      value={activeLogo.labelProps?.rotation || 0}
                      onChange={(e) => updateLabelProps({ rotation: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    >
                      <option value="0">0° (水平)</option>
                      <option value="90">90° (垂直)</option>
                      <option value="180">180° (倒置)</option>
                      <option value="270">270°</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">背景颜色</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={activeLogo.labelProps?.color || '#ffffff'}
                        onChange={(e) => updateLabelProps({ color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="text-xs text-slate-600">{activeLogo.labelProps?.color}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">文字颜色</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={activeLogo.labelProps?.textColor || '#000000'}
                        onChange={(e) => updateLabelProps({ textColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="text-xs text-slate-600">{activeLogo.labelProps?.textColor}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">边框颜色</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={activeLogo.labelProps?.borderColor || '#000000'}
                        onChange={(e) => updateLabelProps({ borderColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="text-xs text-slate-600">{activeLogo.labelProps?.borderColor}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">边框样式</label>
                      <select
                        value={activeLogo.labelProps?.borderStyle || 'solid'}
                        onChange={(e) => updateLabelProps({ borderStyle: e.target.value as 'dashed' | 'solid' })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                      >
                        <option value="dashed">虚线 (Dashed)</option>
                        <option value="solid">实线 (Solid)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">边框粗细 (px)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="20"
                        value={activeLogo.labelProps?.borderWidth ?? 1}
                        onChange={(e) => updateLabelProps({ borderWidth: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">车线颜色</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={activeLogo.labelProps?.stitchColor || '#000000'}
                          onChange={(e) => updateLabelProps({ stitchColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                        />
                        <span className="text-sm text-slate-600 uppercase font-mono">{activeLogo.labelProps?.stitchColor || '#000000'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">车线位置</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={activeLogo.labelProps?.stitchLeft ?? activeLogo.labelProps?.stitchLeftRight ?? true}
                            onChange={(e) => updateLabelProps({ stitchLeft: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-sm text-slate-700">左侧</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={activeLogo.labelProps?.stitchRight ?? activeLogo.labelProps?.stitchLeftRight ?? true}
                            onChange={(e) => updateLabelProps({ stitchRight: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-sm text-slate-700">右侧</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={activeLogo.labelProps?.stitchTop ?? activeLogo.labelProps?.stitchTopBottom ?? false}
                            onChange={(e) => updateLabelProps({ stitchTop: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-sm text-slate-700">上部</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={activeLogo.labelProps?.stitchBottom ?? activeLogo.labelProps?.stitchTopBottom ?? false}
                            onChange={(e) => updateLabelProps({ stitchBottom: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-sm text-slate-700">下部</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">图片 (可选)</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const imgUrl = event.target?.result as string;
                              const img = new Image();
                              img.onload = () => {
                                const scale = Math.min(1, activeLogo.width / img.width, activeLogo.height / img.height);
                                updateLabelProps({ 
                                  imageUrl: imgUrl,
                                  imageScale: scale,
                                  imageOffsetX: 0,
                                  imageOffsetY: 0
                                });
                              };
                              img.src = imgUrl;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                      {activeLogo.labelProps?.imageUrl && (
                        <button
                          onClick={() => updateLabelProps({ imageUrl: undefined })}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="移除图片"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {activeLogo.labelProps?.imageUrl && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <button
                          onClick={async () => {
                            if (!activeLogo.labelProps?.imageUrl) return;
                            setIsProcessing(true);
                            const img = new Image();
                            img.src = activeLogo.labelProps.imageUrl;
                            await new Promise((resolve) => (img.onload = resolve));
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            ctx.drawImage(img, 0, 0);
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const data = imageData.data;
                            const edgePixels = [];
                            for (let x = 0; x < canvas.width; x++) {
                              edgePixels.push((0 * canvas.width + x) * 4);
                              edgePixels.push(((canvas.height - 1) * canvas.width + x) * 4);
                            }
                            for (let y = 0; y < canvas.height; y++) {
                              edgePixels.push((y * canvas.width + 0) * 4);
                              edgePixels.push((y * canvas.width + canvas.width - 1) * 4);
                            }
                            const colorCounts: Record<string, number> = {};
                            edgePixels.forEach(idx => {
                              if (data[idx + 3] >= 50) {
                                const r = Math.round(data[idx] / 15) * 15;
                                const g = Math.round(data[idx + 1] / 15) * 15;
                                const b = Math.round(data[idx + 2] / 15) * 15;
                                const key = `${r},${g},${b}`;
                                colorCounts[key] = (colorCounts[key] || 0) + 1;
                              }
                            });
                            
                            const sortedColors = Object.entries(colorCounts)
                              .sort((a, b) => b[1] - a[1])
                              .map(([key, count]) => {
                                const [r, g, b] = key.split(',').map(Number);
                                return { r, g, b, count };
                              });
                              
                            const topColorsToRemove = [];
                            if (sortedColors.length > 0 && sortedColors[0].count > edgePixels.length * 0.1) {
                              topColorsToRemove.push(sortedColors[0]);
                              if (sortedColors.length > 1 && sortedColors[1].count > edgePixels.length * 0.1) {
                                topColorsToRemove.push(sortedColors[1]);
                              }
                            }

                            if (topColorsToRemove.length > 0) {
                              const threshold = 60;
                              for (let i = 0; i < data.length; i += 4) {
                                if (data[i + 3] > 0) {
                                  const r = data[i], g = data[i+1], b = data[i+2];
                                  let minDiff = Infinity;
                                  for (const color of topColorsToRemove) {
                                    const diff = Math.sqrt(Math.pow(r - color.r, 2) + Math.pow(g - color.g, 2) + Math.pow(b - color.b, 2));
                                    if (diff < minDiff) minDiff = diff;
                                  }
                                  if (minDiff < threshold) {
                                    data[i + 3] = 0;
                                  }
                                }
                              }
                            }
                            ctx.putImageData(imageData, 0, 0);
                            updateLabelProps({ imageUrl: canvas.toDataURL('image/png') });
                            setIsProcessing(false);
                          }}
                          className="w-full p-2 rounded-lg border flex items-center justify-center gap-2 transition-all bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                        >
                          <Scissors size={14} />
                          <span className="text-xs font-medium">一键抠图 (图片)</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">图片缩放</p>
                          <span className="text-[10px] font-bold text-slate-900">{Math.round((activeLogo.labelProps?.imageScale || 1) * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="500" 
                          value={(activeLogo.labelProps?.imageScale || 1) * 100} 
                          onChange={(e) => updateLabelProps({ imageScale: parseInt(e.target.value) / 100 })}
                          className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                        />
                        <p className="text-[10px] text-slate-500">在预览图中拖动图片可调整位置</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 mt-auto">
              <button
                onClick={handleContinue}
                disabled={logos.length === 0}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
              >
                {t.continue}
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
