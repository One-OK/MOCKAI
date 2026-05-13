import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Maximize2, Target, ChevronRight, RefreshCw, Eraser, Layers, Ruler, Info, MousePointer2, Check, Scissors } from 'lucide-react';
import { Stage, Layer, Image as KonvaImage, Transformer, Circle, Line as KonvaLine, Rect } from 'react-konva';
import useImage from 'use-image';
import { GoogleGenAI } from "@google/genai";
import { GarmentImage, MeasurementPoint, Language, MeasurementSettings } from '../types';
import { translations } from '../i18n';

interface GarmentStepProps {
  onComplete: (garments: GarmentImage[]) => void;
  lang: Language;
  measurementSettings: MeasurementSettings;
}

// Internal type for relative points
interface RelativePoint {
  id: string;
  label: string;
  relX: number; // 0 to 1
  relY: number; // 0 to 1
}

export const GarmentStep: React.FC<GarmentStepProps> = ({ onComplete, lang, measurementSettings }) => {
  const t = translations[lang].garment;
  
  const [garments, setGarments] = useState<GarmentImage[]>([]);
  const [activeGarmentId, setActiveGarmentId] = useState<string | null>(null);

  const [garmentUrl, setGarmentUrl] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>('#f8fafc'); // Default light slate
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSelectingLabel, setIsSelectingLabel] = useState(false);
  const [labelRect, setLabelRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  
  // Canvas state
  const [garmentPos, setGarmentPos] = useState({ x: 0, y: 0, width: 800, height: 800 });
  
  // Elegant light colors
  const elegantColors = [
    { name: 'Default', value: '#f8fafc' },
    { name: 'Cream', value: '#fffbeb' },
    { name: 'Sage', value: '#f0fdf4' },
    { name: 'Sky', value: '#f0f9ff' },
    { name: 'Lavender', value: '#f5f3ff' },
    { name: 'Rose', value: '#fff1f2' },
    { name: 'Mist', value: '#f1f5f9' },
  ];

  // Measurement state
  const [points, setPoints] = useState<RelativePoint[]>([]);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<{ [key: string]: number }>({
    length: 70,
    shoulder: 45,
    chest: 52,
    sleeve: 60
  });

  const getPixelDist = (id1: string, id2: string) => {
    const p1 = points.find(p => p.id === id1);
    const p2 = points.find(p => p.id === id2);
    if (!p1 || !p2) return 0;
    
    const x1 = garmentPos.x + p1.relX * garmentPos.width;
    const y1 = garmentPos.y + p1.relY * garmentPos.height;
    const x2 = garmentPos.x + p2.relX * garmentPos.width;
    const y2 = garmentPos.y + p2.relY * garmentPos.height;
    
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  };

  // Real-time measurement updates from points
  useEffect(() => {
    if (points.length >= 2 && measurements.length > 0) {
      const lenDist = getPixelDist('len_top', 'len_bottom');
      if (lenDist > 0) {
        const pixelsPerCm = lenDist / measurements.length;
        
        const nextMeasurements = { ...measurements };
        let hasChanged = false;

        const keysToUpdate = isPants ? ['waist', 'hip'] : ['shoulder', 'chest'];
        keysToUpdate.forEach(key => {
          const id1 = (key === 'shoulder' || key === 'waist') ? 'sh_left' : 'ch_left';
          const id2 = (key === 'shoulder' || key === 'waist') ? 'sh_right' : 'ch_right';
          const dist = getPixelDist(id1, id2);
          if (dist > 0) {
            const newVal = parseFloat((dist / pixelsPerCm).toFixed(1));
            if (newVal !== measurements[key]) {
              nextMeasurements[key] = newVal;
              hasChanged = true;
            }
          }
        });

        if (hasChanged) {
          setMeasurements(nextMeasurements);
        }
      }
    }
  }, [points, garmentPos, measurements.length]);

  const stageRef = useRef<any>(null);
  const garmentRef = useRef<any>(null);
  
  const [garmentImg] = useImage(garmentUrl || '');

  const isPants = measurementSettings.method === 'pants';

  const pointConfigs = isPants ? [
    { id: 'len_top', label: '裤长 (Top)' },
    { id: 'len_bottom', label: '裤长 (Bottom)' },
    { id: 'sh_left', label: '腰围 (Left)' },
    { id: 'sh_right', label: '腰围 (Right)' },
    { id: 'ch_left', label: '臀围 (Left)' },
    { id: 'ch_right', label: '臀围 (Right)' },
  ] : [
    { id: 'len_top', label: t.length + ' (Top)' },
    { id: 'len_bottom', label: t.length + ' (Bottom)' },
    { id: 'sh_left', label: t.shoulder + ' (Left)' },
    { id: 'sh_right', label: t.shoulder + ' (Right)' },
    { id: 'ch_left', label: t.chest + ' (Left)' },
    { id: 'ch_right', label: t.chest + ' (Right)' },
  ];

  const autoDetect = () => {
    let defaultPoints: RelativePoint[] = [];
    if (measurementSettings.method === 'tshirt') {
      defaultPoints = [
        { id: 'len_top', label: t.length + ' (Top)', relX: 0.6, relY: 0.15 }, // 右侧领口肩缝
        { id: 'len_bottom', label: t.length + ' (Bottom)', relX: 0.6, relY: 0.9 }, // 底部下摆
        { id: 'sh_left', label: t.shoulder + ' (Left)', relX: 0.25, relY: 0.2 }, // 左肩袖缝
        { id: 'sh_right', label: t.shoulder + ' (Right)', relX: 0.75, relY: 0.2 }, // 右肩袖缝
        { id: 'ch_left', label: t.chest + ' (Left)', relX: 0.2, relY: 0.45 }, // 左腋下侧缝
        { id: 'ch_right', label: t.chest + ' (Right)', relX: 0.8, relY: 0.45 }, // 右腋下侧缝
      ];
    } else if (measurementSettings.method === 'hoodie') {
      defaultPoints = [
        { id: 'len_top', label: t.length + ' (Top)', relX: 0.5, relY: 0.25 }, // 帽根
        { id: 'len_bottom', label: t.length + ' (Bottom)', relX: 0.5, relY: 0.9 }, // 底部下摆
        { id: 'sh_left', label: t.shoulder + ' (Left)', relX: 0.25, relY: 0.3 }, // 左肩袖缝
        { id: 'sh_right', label: t.shoulder + ' (Right)', relX: 0.75, relY: 0.3 }, // 右肩袖缝
        { id: 'ch_left', label: t.chest + ' (Left)', relX: 0.2, relY: 0.5 }, // 左腋下侧缝
        { id: 'ch_right', label: t.chest + ' (Right)', relX: 0.8, relY: 0.5 }, // 右腋下侧缝
      ];
    } else if (measurementSettings.method === 'pants') {
      defaultPoints = [
        { id: 'len_top', label: '裤长 (Top)', relX: 0.5, relY: 0.1 }, // 腰头
        { id: 'len_bottom', label: '裤长 (Bottom)', relX: 0.5, relY: 0.95 }, // 裤脚
        { id: 'sh_left', label: '腰围 (Left)', relX: 0.35, relY: 0.1 }, // 左腰头
        { id: 'sh_right', label: '腰围 (Right)', relX: 0.65, relY: 0.1 }, // 右腰头
        { id: 'ch_left', label: '臀围 (Left)', relX: 0.3, relY: 0.3 }, // 左臀围
        { id: 'ch_right', label: '臀围 (Right)', relX: 0.7, relY: 0.3 }, // 右臀围
      ];
    } else {
      defaultPoints = [
        { id: 'len_top', label: t.length + ' (Top)', relX: 0.5, relY: 0.1 },
        { id: 'len_bottom', label: t.length + ' (Bottom)', relX: 0.5, relY: 0.9 },
        { id: 'sh_left', label: t.shoulder + ' (Left)', relX: 0.3, relY: 0.15 },
        { id: 'sh_right', label: t.shoulder + ' (Right)', relX: 0.7, relY: 0.15 },
        { id: 'ch_left', label: t.chest + ' (Left)', relX: 0.25, relY: 0.4 },
        { id: 'ch_right', label: t.chest + ' (Right)', relX: 0.75, relY: 0.4 },
      ];
    }
    setPoints(defaultPoints);
  };

  const removeCollarLabel = () => {
    if (!garmentUrl || !labelRect) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Convert labelRect from stage coordinates to image coordinates
        const scaleX = img.width / garmentPos.width;
        const scaleY = img.height / garmentPos.height;
        
        const normX = labelRect.width < 0 ? labelRect.x + labelRect.width : labelRect.x;
        const normY = labelRect.height < 0 ? labelRect.y + labelRect.height : labelRect.y;
        const normWidth = Math.abs(labelRect.width);
        const normHeight = Math.abs(labelRect.height);

        const rectX = (normX - garmentPos.x) * scaleX;
        const rectY = (normY - garmentPos.y) * scaleY;
        const rectWidth = normWidth * scaleX;
        const rectHeight = normHeight * scaleY;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(rectX, rectY, rectWidth, rectHeight);
        ctx.clip();
        
        // Copy a patch from just below the label to preserve fabric texture
        const patchY = Math.min(img.height - rectHeight, rectY + rectHeight + 10);
        ctx.drawImage(img, rectX, patchY, rectWidth, rectHeight, rectX, rectY, rectWidth, rectHeight);
        
        // Apply a blur to blend the patch with the surroundings
        ctx.filter = 'blur(8px)';
        ctx.drawImage(canvas, rectX, rectY, rectWidth, rectHeight, rectX, rectY, rectWidth, rectHeight);
        ctx.restore();
        
        setGarmentUrl(canvas.toDataURL('image/png'));
        setIsProcessing(false);
        setIsSelectingLabel(false);
        setLabelRect(null);
      };
      img.onerror = () => setIsProcessing(false);
      img.src = garmentUrl;
    }, 100);
  };

  const removeBackground = async (urlToProcess?: string) => {
    const targetUrl = urlToProcess || garmentUrl;
    if (!targetUrl) return;
    setIsProcessing(true);
    
    try {
      const newUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return resolve(targetUrl);

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Sample background color from the 4 corners
          const corners = [
            0, // top-left
            (canvas.width - 1) * 4, // top-right
            (canvas.height - 1) * canvas.width * 4, // bottom-left
            ((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 // bottom-right
          ];
          
          let bgR = 0, bgG = 0, bgB = 0;
          corners.forEach(idx => {
            bgR += data[idx];
            bgG += data[idx + 1];
            bgB += data[idx + 2];
          });
          bgR /= 4; bgG /= 4; bgB /= 4;

          const tolerance = 40; // 0-255

          const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
            return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
          };

          // Flood fill using a pre-allocated queue for speed
          const q = new Int32Array(canvas.width * canvas.height * 2);
          let head = 0;
          let tail = 0;
          const visited = new Uint8Array(canvas.width * canvas.height);

          // Add borders to queue
          for (let x = 0; x < canvas.width; x++) {
            q[tail++] = x; q[tail++] = 0;
            q[tail++] = x; q[tail++] = canvas.height - 1;
          }
          for (let y = 0; y < canvas.height; y++) {
            q[tail++] = 0; q[tail++] = y;
            q[tail++] = canvas.width - 1; q[tail++] = y;
          }

          while (head < tail) {
            const x = q[head++];
            const y = q[head++];
            const idx = y * canvas.width + x;

            if (visited[idx]) continue;
            visited[idx] = 1;

            const pIdx = idx * 4;
            const r = data[pIdx];
            const g = data[pIdx + 1];
            const b = data[pIdx + 2];

            if (colorDistance(r, g, b, bgR, bgG, bgB) < tolerance) {
              data[pIdx + 3] = 0; // Make transparent

              // Add neighbors
              if (x > 0) { q[tail++] = x - 1; q[tail++] = y; }
              if (x < canvas.width - 1) { q[tail++] = x + 1; q[tail++] = y; }
              if (y > 0) { q[tail++] = x; q[tail++] = y - 1; }
              if (y < canvas.height - 1) { q[tail++] = x; q[tail++] = y + 1; }
            }
          }

          // Find Bounding Box
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

          if (minX > maxX || minY > maxY) {
            // Empty image, fallback
            return resolve(targetUrl);
          }

          const cropWidth = maxX - minX + 1;
          const cropHeight = maxY - minY + 1;

          // Create cropped canvas
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropWidth;
          cropCanvas.height = cropHeight;
          const cropCtx = cropCanvas.getContext('2d');
          
          // Put the modified image data back to the original canvas first
          ctx.putImageData(imageData, 0, 0);
          
          // Draw the cropped region to the new canvas
          cropCtx?.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

          resolve(cropCanvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = targetUrl;
      });
      
      setGarmentUrl(newUrl);

      // Auto-center and fit with 50px padding
      const img = new Image();
      img.onload = () => {
        const stageWidth = 800;
        const stageHeight = 800;
        const padding = 50;
        const maxWidth = stageWidth - padding * 2;
        const maxHeight = stageHeight - padding * 2;

        const imgRatio = img.width / img.height;
        const stageRatio = maxWidth / maxHeight;

        let targetWidth, targetHeight;

        if (imgRatio > stageRatio) {
          targetWidth = maxWidth;
          targetHeight = targetWidth / imgRatio;
        } else {
          targetHeight = maxHeight;
          targetWidth = targetHeight * imgRatio;
        }

        setGarmentPos({
          x: (stageWidth - targetWidth) / 2,
          y: (stageHeight - targetHeight) / 2,
          width: targetWidth,
          height: targetHeight
        });
        setIsProcessing(false);
      };
      img.src = newUrl;

    } catch (error) {
      console.error("Background removal failed:", error);
      setIsProcessing(false);
    }
  };

  const saveCurrentGarment = () => {
    if (!activeGarmentId || !garmentUrl) return;
    
    setGarments(prev => prev.map(g => {
      if (g.id === activeGarmentId) {
        // We need to convert relative points to absolute points for storage
        const absolutePoints: MeasurementPoint[] = points.map(p => ({
          id: p.id,
          label: p.label,
          x: garmentPos.x + p.relX * garmentPos.width,
          y: garmentPos.y + p.relY * garmentPos.height
        }));

        let referenceScale = 1;
        const pTop = points.find(p => p.id === 'len_top');
        const pBottom = points.find(p => p.id === 'len_bottom');
        if (pTop && pBottom) {
          const y1 = garmentPos.y + pTop.relY * garmentPos.height;
          const y2 = garmentPos.y + pBottom.relY * garmentPos.height;
          const x1 = garmentPos.x + pTop.relX * garmentPos.width;
          const x2 = garmentPos.x + pBottom.relX * garmentPos.width;
          const dist = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
          referenceScale = dist / measurements.length;
        }

        return {
          ...g,
          url: garmentUrl,
          backgroundColor,
          measurements,
          points: absolutePoints,
          referenceScale,
          // Store internal state as well to restore later
          _internal: { garmentPos, points }
        };
      }
      return g;
    }));
  };

  const loadGarment = (id: string) => {
    saveCurrentGarment();
    const g = garments.find(x => x.id === id);
    if (g) {
      setActiveGarmentId(id);
      setGarmentUrl(g.url);
      setBackgroundColor(g.backgroundColor || '#f8fafc');
      if ((g as any)._internal) {
        setGarmentPos((g as any)._internal.garmentPos);
        setPoints((g as any)._internal.points);
      }
      if (g.measurements) {
        setMeasurements(g.measurements);
      }
    }
  };

  const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      saveCurrentGarment();
      
      files.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const stageWidth = 800;
          const stageHeight = 800;
          const padding = 10;
          const maxWidth = stageWidth - padding * 2;
          const maxHeight = stageHeight - padding * 2;
          
          const imgRatio = img.width / img.height;
          const stageRatio = maxWidth / maxHeight;
          
          let targetWidth, targetHeight;
          
          if (imgRatio > stageRatio) {
            targetWidth = maxWidth;
            targetHeight = targetWidth / imgRatio;
          } else {
            targetHeight = maxHeight;
            targetWidth = targetHeight * imgRatio;
          }

          const newGarmentPos = { 
            x: (stageWidth - targetWidth) / 2, 
            y: (stageHeight - targetHeight) / 2, 
            width: targetWidth, 
            height: targetHeight 
          };

          const newId = Math.random().toString(36).substr(2, 9);
          const newName = garments.length === 0 && index === 0 ? '前幅' : `画面 ${garments.length + index + 1}`;
          
          let defaultPoints: RelativePoint[];
          let startingMeasurements: { [key: string]: number } = { length: 70, shoulder: 45, chest: 52, sleeve: 60 };

          if (garmentUrl || garments.length > 0) {
            defaultPoints = JSON.parse(JSON.stringify(points));
            startingMeasurements = { ...measurements };
          } else {
            defaultPoints = [
              { id: 'len_top', label: t.length + ' (Top)', relX: 0.5, relY: 0.1 },
              { id: 'len_bottom', label: t.length + ' (Bottom)', relX: 0.5, relY: 0.9 },
              { id: 'sh_left', label: t.shoulder + ' (Left)', relX: 0.3, relY: 0.15 },
              { id: 'sh_right', label: t.shoulder + ' (Right)', relX: 0.7, relY: 0.15 },
              { id: 'ch_left', label: t.chest + ' (Left)', relX: 0.25, relY: 0.4 },
              { id: 'ch_right', label: t.chest + ' (Right)', relX: 0.75, relY: 0.4 },
            ];
          }

          const newGarment: GarmentImage = {
            id: newId,
            name: newName,
            url: url,
            width: 800,
            height: 800,
            backgroundColor: '#f8fafc',
            measurements: startingMeasurements,
            _internal: { garmentPos: newGarmentPos, points: defaultPoints }
          } as any;

          setGarments(prev => [...prev, newGarment]);
          
          if (index === 0) {
            setActiveGarmentId(newId);
            setGarmentUrl(url);
            setGarmentPos(newGarmentPos);
            setPoints(defaultPoints);
            setMeasurements(startingMeasurements);
            setBackgroundColor('#f8fafc');
          }
        };
        img.src = url;
      });
    }
  };

  const fileToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
    });
  };

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (activePointId && pos) {
      // Calculate relative position to garment
      const relX = (pos.x - garmentPos.x) / garmentPos.width;
      const relY = (pos.y - garmentPos.y) / garmentPos.height;
      
      setPoints(prev => {
        const existing = prev.find(p => p.id === activePointId);
        if (existing) {
          return prev.map(p => p.id === activePointId ? { ...p, relX, relY } : p);
        } else {
          const cfg = pointConfigs.find(c => c.id === activePointId);
          return [...prev, { id: activePointId, label: cfg?.label || '', relX, relY }];
        }
      });
      setActivePointId(null);
      return;
    }

    if (isSelectingLabel && pos) {
      setIsDrawingRect(true);
      setLabelRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (e.target === stage || e.target.name() === 'canvas-bg') {
      // Do nothing
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawingRect || !isSelectingLabel || !labelRect) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (pos) {
      setLabelRect(prev => {
        if (!prev) return null;
        return {
          ...prev,
          width: pos.x - prev.x,
          height: pos.y - prev.y
        };
      });
    }
  };

  const handleMouseUp = () => {
    if (isDrawingRect) {
      setIsDrawingRect(false);
    }
  };

  const calculateSync = (changedKey: string, newVal: number) => {
    if (isNaN(newVal) || newVal <= 0) return;

    if (changedKey === 'length') {
      const lenDist = getPixelDist('len_top', 'len_bottom');
      if (lenDist === 0) {
        setMeasurements(prev => ({ ...prev, length: newVal }));
        return;
      }

      const pixelsPerCm = lenDist / newVal;
      const nextMeasurements = { ...measurements, length: newVal };

      const keysToUpdate = isPants ? ['waist', 'hip'] : ['shoulder', 'chest'];
      keysToUpdate.forEach(key => {
        const id1 = (key === 'shoulder' || key === 'waist') ? 'sh_left' : 'ch_left';
        const id2 = (key === 'shoulder' || key === 'waist') ? 'sh_right' : 'ch_right';
        const dist = getPixelDist(id1, id2);
        if (dist > 0) {
          nextMeasurements[key] = parseFloat((dist / pixelsPerCm).toFixed(1));
        }
      });

      setMeasurements(nextMeasurements);
      return;
    }

    // For other keys, we update the points symmetrically if they exist
    const lenDist = getPixelDist('len_top', 'len_bottom');
    if (lenDist > 0) {
      const pixelsPerCm = lenDist / measurements.length;
      const targetPixelDist = newVal * pixelsPerCm;

      const id1 = (changedKey === 'shoulder' || changedKey === 'waist') ? 'sh_left' : 'ch_left';
      const id2 = (changedKey === 'shoulder' || changedKey === 'waist') ? 'sh_right' : 'ch_right';
      const p1 = points.find(p => p.id === id1);
      const p2 = points.find(p => p.id === id2);

      if (p1 && p2) {
        const centerRelX = (p1.relX + p2.relX) / 2;
        const centerRelY = (p1.relY + p2.relY) / 2;
        
        // Target relative distance
        const targetRelDist = targetPixelDist / garmentPos.width; // Simplified assuming horizontal
        
        setPoints(prev => prev.map(p => {
          if (p.id === id1) return { ...p, relX: centerRelX - targetRelDist / 2, relY: centerRelY };
          if (p.id === id2) return { ...p, relX: centerRelX + targetRelDist / 2, relY: centerRelY };
          return p;
        }));
      }
    }

    setMeasurements(prev => ({ ...prev, [changedKey]: newVal }));
  };

  const handleContinue = () => {
    if (!stageRef.current || !activeGarmentId) return;
    
    setIsExporting(true);
    
    // Calculate absolute points BEFORE clearing points
    const pTop = points.find(p => p.id === 'len_top');
    const pBottom = points.find(p => p.id === 'len_bottom');
    let referenceScale = 1;
    
    if (pTop && pBottom) {
      const y1 = garmentPos.y + pTop.relY * garmentPos.height;
      const y2 = garmentPos.y + pBottom.relY * garmentPos.height;
      const x1 = garmentPos.x + pTop.relX * garmentPos.width;
      const x2 = garmentPos.x + pBottom.relX * garmentPos.width;
      const dist = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
      referenceScale = dist / measurements.length;
    }

    const absolutePoints: MeasurementPoint[] = points.map(p => ({
      id: p.id,
      label: p.label,
      x: garmentPos.x + p.relX * garmentPos.width,
      y: garmentPos.y + p.relY * garmentPos.height
    }));

    setActivePointId(null);
    
    const stage = stageRef.current;
    if (!stage) return;

    const bgRect = stage.findOne('.canvas-bg');
    if (bgRect) bgRect.visible(false);
    
    setTimeout(() => {
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      if (bgRect) bgRect.visible(true);
      setIsExporting(false);
      
      const updatedGarments = garments.map(g => {
        if (g.id === activeGarmentId) {
          return {
            ...g,
            url: dataUrl,
            width: stage.width(),
            height: stage.height(),
            backgroundColor,
            measurements,
            points: absolutePoints,
            referenceScale
          };
        }
        return g;
      });
      
      onComplete(updatedGarments);
    }, 50);
  };

  // Real-time measurement sync when points are moved
  useEffect(() => {
    const lenDist = getPixelDist('len_top', 'len_bottom');
    if (lenDist > 0) {
      const pixelsPerCm = lenDist / measurements.length;
      const nextMeasurements = { ...measurements };

      const keysToUpdate = isPants ? ['waist', 'hip'] : ['shoulder', 'chest'];
      keysToUpdate.forEach(key => {
        const id1 = (key === 'shoulder' || key === 'waist') ? 'sh_left' : 'ch_left';
        const id2 = (key === 'shoulder' || key === 'waist') ? 'sh_right' : 'ch_right';
        const dist = getPixelDist(id1, id2);
        if (dist > 0) {
          nextMeasurements[key as keyof typeof measurements] = parseFloat((dist / pixelsPerCm).toFixed(1));
        }
      });

      // Only update if changed to avoid loops
      let hasChanged = false;
      keysToUpdate.forEach(key => {
        if (nextMeasurements[key] !== measurements[key]) hasChanged = true;
      });
      
      if (hasChanged) {
        setMeasurements(nextMeasurements);
      }
    }
  }, [points]);

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const minDim = Math.min(width, height);
        setScale(minDim / 800);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-light text-slate-900">{t.title}</h2>
        <p className="text-slate-500">{t.desc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Canvas Area */}
        <div className="lg:col-span-8 space-y-4">
          {/* Garment Tabs */}
          {garments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {garments.map((g, idx) => (
                <button
                  key={g.id}
                  onClick={() => loadGarment(g.id)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all ${activeGarmentId === g.id ? 'border-slate-900 shadow-md' : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'}`}
                >
                  <img src={g.url} alt={g.name} className="w-full h-full object-contain bg-white" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-0.5 text-center truncate px-1 backdrop-blur-sm">
                    {g.name}
                  </div>
                </button>
              ))}
              <label className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-slate-600">
                <Upload size={20} className="mb-1" />
                <span className="text-[10px] font-medium">添加画面</span>
                <input type="file" className="hidden" onChange={handleGarmentUpload} accept="image/*" multiple />
              </label>
            </div>
          )}

          <div 
            ref={containerRef}
            className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner aspect-square w-full max-w-[800px] mx-auto flex items-center justify-center"
          >
            {!garmentUrl ? (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-50 transition-colors group">
                <div className="p-6 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">{t.upload}</p>
                <input type="file" className="hidden" onChange={handleGarmentUpload} accept="image/*" multiple />
              </label>
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{
                backgroundImage: `conic-gradient(#f0f0f0 90deg, #ffffff 90deg 180deg, #f0f0f0 180deg 270deg, #ffffff 270deg)`,
                backgroundSize: '20px 20px'
              }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: '800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stage 
                    width={800} 
                    height={800} 
                    ref={stageRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                  >
                  <Layer>
                    {/* Canvas Background */}
                    <Rect
                      name="canvas-bg"
                      width={800}
                      height={800}
                      fill={isExporting ? 'transparent' : backgroundColor}
                    />
                    
                    {/* Subtle Grid Overlay */}
                    {!isExporting && (
                      <Rect
                        width={800}
                        height={800}
                        fillPriority="pattern"
                        fillPatternImage={(() => {
                          const canvas = document.createElement('canvas');
                          canvas.width = 20;
                          canvas.height = 20;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.strokeStyle = 'rgba(0,0,0,0.05)';
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.lineTo(20, 0);
                            ctx.moveTo(0, 0);
                            ctx.lineTo(0, 20);
                            ctx.stroke();
                          }
                          return canvas;
                        })() as any}
                        listening={false}
                        opacity={0.5}
                      />
                    )}
                    
                    {garmentImg && (
                      <>
                        <KonvaImage
                          ref={garmentRef}
                          image={garmentImg}
                          x={garmentPos.x}
                          y={garmentPos.y}
                          width={garmentPos.width}
                          height={garmentPos.height}
                          draggable={false}
                        />
                      </>
                    )}
                    
                    {/* Label Selection Rect */}
                    {isSelectingLabel && labelRect && (
                      <Rect
                        x={labelRect.width < 0 ? labelRect.x + labelRect.width : labelRect.x}
                        y={labelRect.height < 0 ? labelRect.y + labelRect.height : labelRect.y}
                        width={Math.abs(labelRect.width)}
                        height={Math.abs(labelRect.height)}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dash={[4, 4]}
                        fill="rgba(59, 130, 246, 0.2)"
                      />
                    )}
                    
                    {/* Measurement Lines */}
                    {!isExporting && [
                      ['len_top', 'len_bottom'],
                      ['sh_left', 'sh_right'],
                      ['ch_left', 'ch_right']
                    ].map(([id1, id2]) => {
                      const p1 = points.find(p => p.id === id1);
                      const p2 = points.find(p => p.id === id2);
                      if (!p1 || !p2) return null;
                      return (
                        <KonvaLine 
                          key={`${id1}-${id2}`}
                          points={[
                            garmentPos.x + p1.relX * garmentPos.width, garmentPos.y + p1.relY * garmentPos.height,
                            garmentPos.x + p2.relX * garmentPos.width, garmentPos.y + p2.relY * garmentPos.height
                          ]}
                          stroke="#10b981" strokeWidth={1.5} dash={[4, 4]}
                        />
                      );
                    })}

                    {/* Measurement Points */}
                    {!isExporting && points.map((p) => (
                      <Circle
                        key={p.id}
                        x={garmentPos.x + p.relX * garmentPos.width}
                        y={garmentPos.y + p.relY * garmentPos.height}
                        radius={activePointId === p.id ? 8 : 6}
                        fill={activePointId === p.id ? '#f59e0b' : '#10b981'}
                        stroke="white"
                        strokeWidth={2}
                        shadowBlur={5}
                        draggable
                        onDragMove={(e) => {
                          const x = e.target.x();
                          const y = e.target.y();
                          const relX = (x - garmentPos.x) / garmentPos.width;
                          const relY = (y - garmentPos.y) / garmentPos.height;
                          setPoints(prev => prev.map(pt => pt.id === p.id ? { ...pt, relX, relY } : pt));
                        }}
                        onClick={(e) => { e.cancelBubble = true; setActivePointId(p.id); }}
                      />
                    ))}

                  </Layer>
                </Stage>
                </div>
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                <RefreshCw className="w-10 h-10 text-slate-900 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">{t.processing}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">
            <Info size={14} />
            <span>{t.pointsDesc}</span>
          </div>
        </div>

        {/* Controls Area */}
        <div className="lg:col-span-4 flex flex-col h-[700px]">
          <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 overflow-y-auto">
            {/* Garment Name */}
            {activeGarmentId && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">画面名称</label>
                <input
                  type="text"
                  value={garments.find(g => g.id === activeGarmentId)?.name || ''}
                  onChange={(e) => {
                    setGarments(prev => prev.map(g => g.id === activeGarmentId ? { ...g, name: e.target.value } : g));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  placeholder="例如：前幅、后幅"
                />
              </div>
            )}

            {/* AI & Canvas Tools */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Layers size={16} />
                {translations[lang].logo.actions}
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => garmentUrl && removeBackground(garmentUrl)}
                  disabled={!garmentUrl || isProcessing}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Eraser size={16} />
                  </div>
                  <span className="text-sm font-bold text-slate-900">智能去除底色</span>
                </button>

                <button
                  onClick={() => {
                    if (isSelectingLabel) {
                      if (labelRect && labelRect.width !== 0 && labelRect.height !== 0) {
                        removeCollarLabel();
                      } else {
                        setIsSelectingLabel(false);
                      }
                    } else {
                      setIsSelectingLabel(true);
                      setLabelRect(null);
                    }
                  }}
                  disabled={!garmentUrl || isProcessing}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all group disabled:opacity-50 ${isSelectingLabel ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${isSelectingLabel ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 group-hover:scale-110'}`}>
                    {isSelectingLabel ? <Check size={16} /> : <Scissors size={16} />}
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {isSelectingLabel ? '确认去除 (请在图上框选)' : '手动去除领口唛头'}
                  </span>
                </button>
              </div>

              {/* Background Color Selection */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.changeBg}</p>
                <div className="flex flex-wrap gap-2">
                  {elegantColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setBackgroundColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${backgroundColor === color.value ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Measurement Tools */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Ruler size={16} />
                  {t.measurements}
                </h3>
                <button 
                  onClick={autoDetect}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                >
                  {t.autoDetect}
                </button>
              </div>
              
              <div className="space-y-3">
                {isPants ? (
                  ['length', 'waist', 'hip'].map(key => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {key === 'length' ? '裤长' : key === 'waist' ? '腰围' : '臀围'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={measurements[key] || 0}
                          onChange={(e) => calculateSync(key, parseFloat(e.target.value))}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">CM</span>
                      </div>
                    </div>
                  ))
                ) : (
                  ['length', 'shoulder', 'chest'].map(key => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{(t as any)[key]}</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={measurements[key] || 0}
                          onChange={(e) => calculateSync(key, parseFloat(e.target.value))}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">CM</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.setPoints}</p>
                <div className="grid grid-cols-2 gap-2">
                  {pointConfigs.map(cfg => (
                    <button
                      key={cfg.id}
                      onClick={() => setActivePointId(cfg.id)}
                      className={`text-left px-3 py-2 rounded-lg border text-[10px] flex items-center justify-between transition-all ${activePointId === cfg.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      <span className="truncate">{cfg.label}</span>
                      {points.find(p => p.id === cfg.id) ? <Check size={10} /> : <MousePointer2 size={10} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleContinue}
                disabled={!garmentUrl || isProcessing}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
              >
                {t.continue}
                <ChevronRight size={18} />
              </button>
              <button 
                onClick={() => { setGarmentUrl(null); setBackgroundColor('#f8fafc'); setPoints([]); }}
                className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {t.reset}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
