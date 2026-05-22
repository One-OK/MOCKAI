import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Group, Rect, Text, Line, Circle } from 'react-konva';
import useImage from 'use-image';
import { GarmentImage, LogoImage, Language } from '../types';
import { Ruler, Move, Maximize2, Download, Layers, Trash2, Check, MousePointer2, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { translations } from '../i18n';

interface MockupCanvasProps {
  garments: GarmentImage[];
  logos: LogoImage[];
  lang: Language;
  onExport: (data: {effectWithWatermark: string, effectNoWatermark: string, engineering: string, name: string}[]) => void;
}

interface SingleMockupCanvasProps {
  garment: GarmentImage;
  logos: LogoImage[];
  lang: Language;
  watermark: WatermarkState;
  onWatermarkChange: (newWatermark: WatermarkState) => void;
  anchorPoints: AnchorPointsState;
  onAnchorPointsChange: (newAnchors: AnchorPointsState) => void;
  onExportSingle?: () => void;
}

export interface WatermarkState {
  text: string;
  fontSize: number;
  color: string;
  bgColor: string;
  opacity: number;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
}

export interface AnchorPointsState {
  topVertex: { x: number, y: number } | null;
  bottomLine: { x: number, y: number } | null;
  leftLine: { x: number, y: number } | null;
  rightLine: { x: number, y: number } | null;
  auxA: { x: number, y: number } | null;
  auxB: { x: number, y: number } | null;
}

const DEFAULT_WATERMARK: WatermarkState = {
  text: 'ASSSOO STUDIO',
  fontSize: 23,
  color: '#ffffff',
  bgColor: '#c8c8c8',
  opacity: 0.2,
  x: 600,
  y: 600,
  rotation: -45,
  scaleX: 1,
  scaleY: 1,
  visible: true
};

const DEFAULT_ANCHORS: AnchorPointsState = {
  topVertex: null,
  bottomLine: null,
  leftLine: null,
  rightLine: null,
  auxA: null,
  auxB: null
};

interface LogoState {
  id: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  blendMode: 'source-over' | 'multiply' | 'overlay';
  opacity: number;
  visible: boolean;
  visibleLines: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
    auxA: boolean;
    auxB: boolean;
  };
}

const LogoItem = ({ 
  logo, 
  state, 
  isSelected, 
  isEditing,
  onSelect, 
  onChange,
  pixelsPerCm
}: { 
  logo: LogoImage; 
  state: LogoState; 
  isSelected: boolean; 
  isEditing: boolean;
  onSelect: () => void; 
  onChange: (newAttrs: any) => void;
  pixelsPerCm: number;
}) => {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [img] = useImage(logo.processedUrl || logo.url);
  const [labelImg] = useImage(logo.labelProps?.imageUrl || '');

  useEffect(() => {
    if (isSelected && isEditing && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isEditing]);

  const isLabel = logo.type === 'label';

  return (
    <React.Fragment>
      <Group
        ref={shapeRef}
        x={state.x + (logo.width * state.scaleX) / 2}
        y={state.y + (logo.height * state.scaleY) / 2}
        offsetX={logo.width / 2}
        offsetY={logo.height / 2}
        scaleX={state.scaleX}
        scaleY={state.scaleY}
        rotation={state.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...state,
            x: e.target.x() - (logo.width * state.scaleX) / 2,
            y: e.target.y() - (logo.height * state.scaleY) / 2,
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...state,
            x: node.x() - (logo.width * state.scaleX * scaleX) / 2,
            y: node.y() - (logo.height * state.scaleY * scaleY) / 2,
            scaleX: state.scaleX * scaleX,
            scaleY: state.scaleY * scaleY,
            rotation: node.rotation(),
          });
        }}
        globalCompositeOperation={state.blendMode}
        opacity={state.opacity}
      >
        {isLabel ? (
          <Group>
            <Rect
              width={logo.width}
              height={logo.height}
              fill={logo.labelProps?.color || '#ffffff'}
              stroke={logo.labelProps?.borderColor || '#000000'}
              strokeWidth={logo.labelProps?.borderWidth ?? 1}
              dash={logo.labelProps?.borderStyle === 'dashed' ? [5, 5] : []}
              strokeScaleEnabled={false}
            />
            {/* Stitching Lines (1.5mm gap = 15 units since 1mm = 10 units in logo space) */}
            {(logo.labelProps?.stitchLeft ?? logo.labelProps?.stitchLeftRight ?? true) && (
              <Line
                points={[15, 15, 15, logo.height - 15]}
                stroke={logo.labelProps?.stitchColor || logo.labelProps?.borderColor || '#000000'}
                strokeWidth={1}
                dash={[4, 4]}
                strokeScaleEnabled={false}
              />
            )}
            {(logo.labelProps?.stitchRight ?? logo.labelProps?.stitchLeftRight ?? true) && (
              <Line
                points={[logo.width - 15, 15, logo.width - 15, logo.height - 15]}
                stroke={logo.labelProps?.stitchColor || logo.labelProps?.borderColor || '#000000'}
                strokeWidth={1}
                dash={[4, 4]}
                strokeScaleEnabled={false}
              />
            )}
            {(logo.labelProps?.stitchTop ?? logo.labelProps?.stitchTopBottom ?? false) && (
              <Line
                points={[15, 15, logo.width - 15, 15]}
                stroke={logo.labelProps?.stitchColor || logo.labelProps?.borderColor || '#000000'}
                strokeWidth={1}
                dash={[4, 4]}
                strokeScaleEnabled={false}
              />
            )}
            {(logo.labelProps?.stitchBottom ?? logo.labelProps?.stitchTopBottom ?? false) && (
              <Line
                points={[15, logo.height - 15, logo.width - 15, logo.height - 15]}
                stroke={logo.labelProps?.stitchColor || logo.labelProps?.borderColor || '#000000'}
                strokeWidth={1}
                dash={[4, 4]}
                strokeScaleEnabled={false}
              />
            )}
            {labelImg ? (
              <Group clipX={0} clipY={0} clipWidth={logo.width} clipHeight={logo.height}>
                <KonvaImage
                  image={labelImg}
                  x={logo.width / 2 + (logo.labelProps?.imageOffsetX || 0)}
                  y={logo.height / 2 + (logo.labelProps?.imageOffsetY || 0)}
                  offsetX={labelImg.width / 2}
                  offsetY={labelImg.height / 2}
                  scaleX={logo.labelProps?.imageScale || 1}
                  scaleY={logo.labelProps?.imageScale || 1}
                />
              </Group>
            ) : (
              <Text
                text={logo.labelProps?.text || ''}
                width={logo.width}
                height={logo.height}
                fill={logo.labelProps?.textColor || '#000000'}
                align="center"
                verticalAlign="middle"
                fontSize={logo.height * 0.4}
                fontFamily="Arial"
                fontStyle="bold"
              />
            )}
          </Group>
        ) : (
          img && (
            <KonvaImage
              image={img}
              width={logo.width}
              height={logo.height}
            />
          )
        )}
      </Group>
      {isSelected && isEditing && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          centeredScaling={true}
          keepRatio={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled={false}
        />
      )}
    </React.Fragment>
  );
};

const SingleMockupCanvas = React.forwardRef<any, SingleMockupCanvasProps>(({ garment, logos, lang, watermark, onWatermarkChange, anchorPoints, onAnchorPointsChange, onExportSingle }, ref) => {
  const t = translations[lang].mockup;
  const common = translations[lang].common;

  const [garmentImg] = useImage(garment.url);
  
  const pixelsPerCm = garment.referenceScale || 1;

  // Initialize state for each logo
  const [logoStates, setLogoStates] = useState<LogoState[]>(() => {
    return logos.map((logo, index) => {
      let initialScale = 1;
      if (logo.type === 'image') {
        const targetWidthPx = 200;
        initialScale = targetWidthPx / logo.width;
        if (initialScale > 1) initialScale = 1;
      } else if (logo.type === 'label') {
        initialScale = pixelsPerCm / 100;
      }
      
      return {
        id: logo.id,
        x: 400 - (logo.width * initialScale) / 2,
        y: 200 + index * 50,
        scaleX: initialScale,
        scaleY: initialScale,
        rotation: logo.labelProps?.rotation || 0,
        blendMode: 'source-over' as const,
        opacity: 1,
        visible: true,
        visibleLines: {
          top: true,
          bottom: false,
          left: true,
          right: false,
          auxA: false,
          auxB: false
        }
      };
    });
  });

  // Sync new logos
  useEffect(() => {
    setLogoStates(prev => {
      let newStates = prev.filter(state => logos.some(l => l.id === state.id));
      let hasChanges = newStates.length !== prev.length;
      
      logos.forEach((logo, index) => {
        if (!newStates.find(s => s.id === logo.id)) {
          let initialScale = 1;
          if (logo.type === 'image') {
            const targetWidthPx = 200;
            initialScale = targetWidthPx / logo.width;
            if (initialScale > 1) initialScale = 1;
          } else if (logo.type === 'label') {
            initialScale = pixelsPerCm / 100;
          }
          
          newStates.push({
            id: logo.id,
            x: 400 - (logo.width * initialScale) / 2,
            y: 200 + index * 50,
            scaleX: initialScale,
            scaleY: initialScale,
            rotation: logo.labelProps?.rotation || 0,
            blendMode: 'source-over' as const,
            opacity: 1,
            visible: true,
            visibleLines: {
              top: true,
              bottom: false,
              left: true,
              right: false,
              auxA: false,
              auxB: false
            }
          });
          hasChanges = true;
        }
      });
      
      return hasChanges ? newStates : prev;
    });
  }, [logos, pixelsPerCm]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const stageRef = useRef<any>(null);

  const [showRulers, setShowRulers] = useState(true);
  // Track latest props in refs so async callbacks (like exportMockup setTimeouts) see fresh values
  const watermarkRefVal = useRef(watermark);
  const anchorPointsRefVal = useRef(anchorPoints);
  useEffect(() => { watermarkRefVal.current = watermark; }, [watermark]);
  useEffect(() => { anchorPointsRefVal.current = anchorPoints; }, [anchorPoints]);
  // Wrappers that work like useState's setters but route through parent props (with cascade)
  const setWatermark = (updater: WatermarkState | ((prev: WatermarkState) => WatermarkState)) => {
    const next = typeof updater === 'function' ? (updater as (p: WatermarkState) => WatermarkState)(watermarkRefVal.current) : updater;
    watermarkRefVal.current = next;
    onWatermarkChange(next);
  };
  const setAnchorPoints = (updater: AnchorPointsState | ((prev: AnchorPointsState) => AnchorPointsState)) => {
    const next = typeof updater === 'function' ? (updater as (p: AnchorPointsState) => AnchorPointsState)(anchorPointsRefVal.current) : updater;
    anchorPointsRefVal.current = next;
    onAnchorPointsChange(next);
  };
  const [activeAnchorId, setActiveAnchorId] = useState<'topVertex' | 'bottomLine' | 'leftLine' | 'rightLine' | 'auxA' | 'auxB' | null>(null);
  const watermarkRef = useRef<any>(null);
  const watermarkTrRef = useRef<any>(null);

  useEffect(() => {
    if (selectedId === 'watermark' && isEditingLogo && watermarkTrRef.current && watermarkRef.current) {
      watermarkTrRef.current.nodes([watermarkRef.current]);
      watermarkTrRef.current.getLayer().batchDraw();
    }
  }, [selectedId, isEditingLogo]);

  useImperativeHandle(ref, () => ({
    exportMockup: () => new Promise<{effectWithWatermark: string, effectNoWatermark: string, engineering: string, name: string}>((resolve) => {
      setSelectedId(null);
      setShowRulers(false);
      const originalWatermarkVisible = watermark.visible;
      setWatermark(prev => ({...prev, visible: false}));
      setTimeout(() => {
        const effectNoWatermark = stageRef.current.toDataURL({ pixelRatio: 2 });
        setWatermark(prev => ({...prev, visible: true}));
        setTimeout(() => {
          const effectWithWatermark = stageRef.current.toDataURL({ pixelRatio: 2 });
          setShowRulers(true);
          setWatermark(prev => ({...prev, visible: false}));
          setTimeout(() => {
            const engineering = stageRef.current.toDataURL({ pixelRatio: 2 });
            resolve({
              effectWithWatermark,
              effectNoWatermark,
              engineering,
              name: garment.name || ''
            });
            setShowRulers(true);
            setWatermark(prev => ({...prev, visible: originalWatermarkVisible}));
          }, 100);
        }, 100);
      }, 100);
    })
  }));

  const handleExport = () => {
    if (onExportSingle) onExportSingle();
  };

  const checkDeselect = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (activeAnchorId && pos) {
      setAnchorPoints(prev => ({
        ...prev,
        [activeAnchorId]: { x: pos.x, y: pos.y }
      }));
      setActiveAnchorId(null);
      return;
    }

    const clickedOnEmpty = e.target === stage || e.target.name() === 'bg';
    if (clickedOnEmpty) {
      setSelectedId(null);
      setIsEditingLogo(false);
    }
  };

  const activeLogoState = logoStates.find(s => s.id === selectedId);
  const activeLogo = logos.find(l => l.id === selectedId);

  const updateActiveLogoState = (updates: Partial<LogoState>) => {
    if (!selectedId) return;
    setLogoStates(prev => prev.map(s => s.id === selectedId ? { ...s, ...updates } : s));
  };

  const handleSizeChange = (key: 'width' | 'height', val: number) => {
    if (!activeLogo || !activeLogoState || isNaN(val) || val <= 0) return;
    const pixels = val * pixelsPerCm;
    
    if (key === 'width') {
      const newScale = pixels / activeLogo.width;
      updateActiveLogoState({ scaleX: newScale, scaleY: newScale });
    } else {
      const newScale = pixels / activeLogo.height;
      updateActiveLogoState({ scaleX: newScale, scaleY: newScale });
    }
  };

  const getRealSize = () => {
    if (!activeLogo || !activeLogoState) return null;
    const currentWidthPx = activeLogo.width * activeLogoState.scaleX;
    const currentHeightPx = activeLogo.height * activeLogoState.scaleY;
    return {
      width: parseFloat((currentWidthPx / pixelsPerCm).toFixed(1)),
      height: parseFloat((currentHeightPx / pixelsPerCm).toFixed(1))
    };
  };

  const getDistancesForLogo = (logoState: LogoState, logo: LogoImage) => {
    const topPoint = anchorPoints.topVertex || garment.points?.find(p => p.id === 'len_top');
    const bottomPoint = anchorPoints.bottomLine || garment.points?.find(p => p.id === 'len_bottom');
    const leftPoint = anchorPoints.leftLine || garment.points?.find(p => p.id === 'sh_left');
    const rightPoint = anchorPoints.rightLine || garment.points?.find(p => p.id === 'sh_right');
    const auxAPoint = anchorPoints.auxA;
    const auxBPoint = anchorPoints.auxB;
    
    const rad = (logoState.rotation || 0) * Math.PI / 180;
    const w = logo.width * logoState.scaleX;
    const h = logo.height * logoState.scaleY;

    const rotatePoint = (px: number, py: number) => ({
      x: logoState.x + px * Math.cos(rad) - py * Math.sin(rad),
      y: logoState.y + px * Math.sin(rad) + py * Math.cos(rad)
    });

    const pts = [
      rotatePoint(0, 0),
      rotatePoint(w, 0),
      rotatePoint(0, h),
      rotatePoint(w, h)
    ];

    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);

    const logoLeftX = Math.min(...xs);
    const logoRightX = Math.max(...xs);
    const logoTopY = Math.min(...ys);
    const logoBottomY = Math.max(...ys);
    const logoCenterX = (logoLeftX + logoRightX) / 2;
    const logoCenterY = (logoTopY + logoBottomY) / 2;
    
    let distTop = null;
    let distBottom = null;
    let distLeft = null;
    let distRight = null;
    const getClosestPoint = (px: number, py: number, minX: number, minY: number, maxX: number, maxY: number) => {
      let cx = px;
      let cy = py;
      if (px < minX) cx = minX;
      else if (px > maxX) cx = maxX;
      
      if (py < minY) cy = minY;
      else if (py > maxY) cy = maxY;
      
      return { x: cx, y: cy };
    };

    let distAuxA = null;
    let distAuxB = null;
    let auxAProj: { axis: 'x'|'y', dir: 1|-1, p1: {x:number, y:number}, p2: {x:number, y:number}, dist: number } | null = null;
    let auxBProj: { axis: 'x'|'y', dir: 1|-1, p1: {x:number, y:number}, p2: {x:number, y:number}, dist: number } | null = null;

    if (topPoint) {
      distTop = parseFloat(((logoTopY - topPoint.y) / pixelsPerCm).toFixed(1));
    }
    if (bottomPoint) {
      distBottom = parseFloat(((bottomPoint.y - logoBottomY) / pixelsPerCm).toFixed(1));
    }
    if (leftPoint) {
      distLeft = parseFloat(((logoLeftX - leftPoint.x) / pixelsPerCm).toFixed(1));
    }
    if (rightPoint) {
      distRight = parseFloat(((rightPoint.x - logoRightX) / pixelsPerCm).toFixed(1));
    }

    const calcProj = (pt: {x:number, y:number}) => {
      const dx = pt.x - logoCenterX;
      const dy = pt.y - logoCenterY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          return { axis: 'x' as const, dir: -1 as const, p1: { x: pt.x, y: pt.y }, p2: { x: logoLeftX, y: pt.y }, dist: logoLeftX - pt.x };
        } else {
          return { axis: 'x' as const, dir: 1 as const, p1: { x: logoRightX, y: pt.y }, p2: { x: pt.x, y: pt.y }, dist: pt.x - logoRightX };
        }
      } else {
        if (dy < 0) {
          return { axis: 'y' as const, dir: -1 as const, p1: { x: pt.x, y: pt.y }, p2: { x: pt.x, y: logoTopY }, dist: logoTopY - pt.y };
        } else {
          return { axis: 'y' as const, dir: 1 as const, p1: { x: pt.x, y: logoBottomY }, p2: { x: pt.x, y: pt.y }, dist: pt.y - logoBottomY };
        }
      }
    };

    if (auxAPoint) {
      auxAProj = calcProj(auxAPoint);
      distAuxA = parseFloat((auxAProj.dist / pixelsPerCm).toFixed(1));
    }
    if (auxBPoint) {
      auxBProj = calcProj(auxBPoint);
      distAuxB = parseFloat((auxBProj.dist / pixelsPerCm).toFixed(1));
    }
    
    return { distTop, distBottom, distLeft, distRight, distAuxA, distAuxB, topPoint, bottomPoint, leftPoint, rightPoint, auxAPoint, auxBPoint, auxAProj, auxBProj };
  };

  const handleDistanceChange = (key: 'top' | 'bottom' | 'left' | 'right' | 'auxA' | 'auxB', val: number) => {
    if (!activeLogo || !activeLogoState || isNaN(val)) return;
    const dists = getDistancesForLogo(activeLogoState, activeLogo);
    const pixels = val * pixelsPerCm;

    const rad = (activeLogoState.rotation || 0) * Math.PI / 180;
    const w = activeLogo.width * activeLogoState.scaleX;
    const h = activeLogo.height * activeLogoState.scaleY;
    const pts = [
      { x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }
    ].map(p => ({
      x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
      y: p.x * Math.sin(rad) + p.y * Math.cos(rad)
    }));

    const aabbWidth = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x));
    const aabbHeight = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
    const yOffset = Math.min(...pts.map(p => p.y));
    const xOffset = Math.min(...pts.map(p => p.x));

    let newX = activeLogoState.x;
    let newY = activeLogoState.y;

    if (key === 'top' && dists.topPoint) {
      newY = dists.topPoint.y + pixels - yOffset;
    } else if (key === 'bottom' && dists.bottomPoint) {
      newY = dists.bottomPoint.y - pixels - aabbHeight - yOffset;
    } else if (key === 'left' && dists.leftPoint) {
      newX = dists.leftPoint.x + pixels - xOffset;
    } else if (key === 'right' && dists.rightPoint) {
      newX = dists.rightPoint.x - pixels - aabbWidth - xOffset;
    } else if (key === 'auxA' && dists.auxAPoint && dists.auxAProj) {
      if (dists.auxAProj.axis === 'x') {
        if (dists.auxAProj.dir === -1) {
          newX = dists.auxAPoint.x + pixels - xOffset;
        } else {
          newX = dists.auxAPoint.x - pixels - aabbWidth - xOffset;
        }
      } else {
        if (dists.auxAProj.dir === -1) {
          newY = dists.auxAPoint.y + pixels - yOffset;
        } else {
          newY = dists.auxAPoint.y - pixels - aabbHeight - yOffset;
        }
      }
    } else if (key === 'auxB' && dists.auxBPoint && dists.auxBProj) {
      if (dists.auxBProj.axis === 'x') {
        if (dists.auxBProj.dir === -1) {
          newX = dists.auxBPoint.x + pixels - xOffset;
        } else {
          newX = dists.auxBPoint.x - pixels - aabbWidth - xOffset;
        }
      } else {
        if (dists.auxBProj.dir === -1) {
          newY = dists.auxBPoint.y + pixels - yOffset;
        } else {
          newY = dists.auxBPoint.y - pixels - aabbHeight - yOffset;
        }
      }
    }

    updateActiveLogoState({ x: newX, y: newY });
  };

  const getDistances = () => {
    if (!activeLogo || !activeLogoState) return null;
    return getDistancesForLogo(activeLogoState, activeLogo);
  };

  const realSize = getRealSize();
  const distances = getDistances();

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use ResizeObserver to keep scale in sync with container size.
  // This fixes the issue where a hidden canvas (e.g. while user navigates back to logo/garment step,
  // or before its tab becomes active) measures 0x0 and stays invisible after becoming visible again.
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const minDim = Math.min(width, height);
      if (minDim > 0) {
        setScale(prev => {
          const next = minDim / 800;
          // Avoid unnecessary state updates that would cause Konva re-renders
          return Math.abs(prev - next) < 0.0001 ? prev : next;
        });
      }
    };
    updateScale();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div 
        ref={containerRef}
        className="w-full max-w-[800px] aspect-square bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex items-center justify-center"
      >
        <div className="w-full h-full flex items-center justify-center">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: '800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stage
              width={800}
              height={800}
              ref={stageRef}
              onMouseDown={checkDeselect}
              onTouchStart={checkDeselect}
            >
            <Layer>
              {/* Background color from garment step */}
              <Rect
                name="bg"
                width={800}
                height={800}
                fill={garment.backgroundColor || '#f8fafc'}
              />
            {garmentImg && (
              <KonvaImage
                name="bg"
                image={garmentImg}
                width={800}
                height={800}
                listening={true}
              />
            )}
            {logos.map((logo) => {
              const state = logoStates.find(s => s.id === logo.id);
              if (!state) return null;
              if (!state.visible) return null;
              return (
                <LogoItem
                  key={logo.id}
                  logo={logo}
                  state={state}
                  isSelected={logo.id === selectedId}
                  isEditing={isEditingLogo}
                  onSelect={() => {
                    if (selectedId === logo.id) {
                      setIsEditingLogo(!isEditingLogo);
                    } else {
                      setSelectedId(logo.id);
                      setIsEditingLogo(true);
                    }
                  }}
                  onChange={(newAttrs) => {
                    const dists = getDistancesForLogo(newAttrs, logo);
                    let visibleLines = { ...newAttrs.visibleLines };
                    if (dists) {
                      // Split candidates by axis: vertical (top/bottom + aux on y-axis) vs horizontal (left/right + aux on x-axis)
                      const verticalCandidates: { key: keyof typeof visibleLines, val: number }[] = [];
                      const horizontalCandidates: { key: keyof typeof visibleLines, val: number }[] = [];

                      if (dists.distTop !== null) verticalCandidates.push({ key: 'top', val: dists.distTop });
                      if (dists.distBottom !== null) verticalCandidates.push({ key: 'bottom', val: dists.distBottom });
                      if (dists.distLeft !== null) horizontalCandidates.push({ key: 'left', val: dists.distLeft });
                      if (dists.distRight !== null) horizontalCandidates.push({ key: 'right', val: dists.distRight });

                      // Aux points: classified by their projection axis (calcProj already sets 'x' or 'y')
                      if (dists.distAuxA !== null && dists.auxAProj) {
                        if (dists.auxAProj.axis === 'y') verticalCandidates.push({ key: 'auxA', val: dists.distAuxA });
                        else horizontalCandidates.push({ key: 'auxA', val: dists.distAuxA });
                      }
                      if (dists.distAuxB !== null && dists.auxBProj) {
                        if (dists.auxBProj.axis === 'y') verticalCandidates.push({ key: 'auxB', val: dists.distAuxB });
                        else horizontalCandidates.push({ key: 'auxB', val: dists.distAuxB });
                      }

                      // Pick the minimum (by absolute distance) from each axis
                      verticalCandidates.sort((a, b) => Math.abs(a.val) - Math.abs(b.val));
                      horizontalCandidates.sort((a, b) => Math.abs(a.val) - Math.abs(b.val));

                      visibleLines = {
                        top: false, bottom: false, left: false, right: false, auxA: false, auxB: false
                      };
                      if (verticalCandidates.length > 0) visibleLines[verticalCandidates[0].key] = true;
                      if (horizontalCandidates.length > 0) visibleLines[horizontalCandidates[0].key] = true;
                    }
                    setLogoStates(prev => prev.map(s => s.id === logo.id ? { ...newAttrs, visibleLines } : s));
                  }}
                  pixelsPerCm={pixelsPerCm}
                />
              );
            })}
            
            {showRulers && (
              <Group listening={false}>
                {/* Draw anchor points */}
                {(anchorPoints.topVertex || garment.points?.find(p => p.id === 'len_top')) && (
                  <Circle x={(anchorPoints.topVertex || garment.points?.find(p => p.id === 'len_top'))!.x} y={(anchorPoints.topVertex || garment.points?.find(p => p.id === 'len_top'))!.y} radius={4} fill="#ef4444" />
                )}
                {(anchorPoints.bottomLine || garment.points?.find(p => p.id === 'len_bottom')) && (
                  <Circle x={(anchorPoints.bottomLine || garment.points?.find(p => p.id === 'len_bottom'))!.x} y={(anchorPoints.bottomLine || garment.points?.find(p => p.id === 'len_bottom'))!.y} radius={4} fill="#ef4444" />
                )}
                {(anchorPoints.leftLine || garment.points?.find(p => p.id === 'sh_left')) && (
                  <Circle x={(anchorPoints.leftLine || garment.points?.find(p => p.id === 'sh_left'))!.x} y={(anchorPoints.leftLine || garment.points?.find(p => p.id === 'sh_left'))!.y} radius={4} fill="#ef4444" />
                )}
                {(anchorPoints.rightLine || garment.points?.find(p => p.id === 'sh_right')) && (
                  <Circle x={(anchorPoints.rightLine || garment.points?.find(p => p.id === 'sh_right'))!.x} y={(anchorPoints.rightLine || garment.points?.find(p => p.id === 'sh_right'))!.y} radius={4} fill="#ef4444" />
                )}
                {anchorPoints.auxA && (
                  <Circle x={anchorPoints.auxA.x} y={anchorPoints.auxA.y} radius={4} fill="#ef4444" />
                )}
                {anchorPoints.auxB && (
                  <Circle x={anchorPoints.auxB.x} y={anchorPoints.auxB.y} radius={4} fill="#ef4444" />
                )}

                {/* Draw ruler lines */}
                {logoStates.map((logoState, index) => {
                  if (!logoState.visible) return null;
                  
                  const logo = logos.find(l => l.id === logoState.id);
                  if (!logo) return null;
                  
                  const dists = getDistancesForLogo(logoState, logo);
                  if (!dists) return null;
                  
                  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                  const color = colors[index % colors.length];
                  
                  const logoW = logo.width * logoState.scaleX;
                  const logoH = logo.height * logoState.scaleY;
                  const logoCenterX = logoState.x + logoW / 2;
                  const logoCenterY = logoState.y + logoH / 2;

                  return (
                    <Group key={`ruler-${logoState.id}`}>
                      {/* Logo Size Rulers */}
                      <Group>
                        {/* Width Ruler */}
                        <Line points={[logoState.x, logoState.y - 10, logoState.x + logoW, logoState.y - 10]} stroke={color} strokeWidth={1} />
                        <Line points={[logoState.x, logoState.y - 15, logoState.x, logoState.y - 5]} stroke={color} strokeWidth={1} />
                        <Line points={[logoState.x + logoW, logoState.y - 15, logoState.x + logoW, logoState.y - 5]} stroke={color} strokeWidth={1} />
                        <Text
                          x={logoState.x + logoW / 2 - 20}
                          y={logoState.y - 25}
                          text={`${(logoW / pixelsPerCm).toFixed(1)}cm`}
                          fill={color}
                          fontSize={10}
                          fontStyle="bold"
                          shadowColor="white" shadowBlur={2} shadowOpacity={1}
                        />
                        {/* Height Ruler */}
                        <Line points={[logoState.x - 10, logoState.y, logoState.x - 10, logoState.y + logoH]} stroke={color} strokeWidth={1} />
                        <Line points={[logoState.x - 15, logoState.y, logoState.x - 5, logoState.y]} stroke={color} strokeWidth={1} />
                        <Line points={[logoState.x - 15, logoState.y + logoH, logoState.x - 5, logoState.y + logoH]} stroke={color} strokeWidth={1} />
                        <Text
                          x={logoState.x - 45}
                          y={logoState.y + logoH / 2 - 5}
                          text={`${(logoH / pixelsPerCm).toFixed(1)}cm`}
                          fill={color}
                          fontSize={10}
                          fontStyle="bold"
                          shadowColor="white" shadowBlur={2} shadowOpacity={1}
                        />
                      </Group>

                      {/* Top distance line */}
                      {logoState.visibleLines.top && dists.distTop !== null && dists.topPoint && (
                        <Group>
                          <Line
                            points={[logoCenterX, dists.topPoint.y, logoCenterX, logoState.y]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={logoCenterX + 5} y={(dists.topPoint.y + logoState.y) / 2}
                            text={`${dists.distTop} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}
                      
                      {/* Bottom distance line */}
                      {logoState.visibleLines.bottom && dists.distBottom !== null && dists.bottomPoint && (
                        <Group>
                          <Line
                            points={[logoCenterX, logoState.y + logoH, logoCenterX, dists.bottomPoint.y]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={logoCenterX + 5} y={(logoState.y + logoH + dists.bottomPoint.y) / 2}
                            text={`${dists.distBottom} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}

                      {/* Left distance line */}
                      {logoState.visibleLines.left && dists.distLeft !== null && dists.leftPoint && (
                        <Group>
                          <Line
                            points={[dists.leftPoint.x, logoCenterY, logoState.x, logoCenterY]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={(dists.leftPoint.x + logoState.x) / 2 - 15} y={logoCenterY - 15}
                            text={`${dists.distLeft} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}

                      {/* Right distance line */}
                      {logoState.visibleLines.right && dists.distRight !== null && dists.rightPoint && (
                        <Group>
                          <Line
                            points={[logoState.x + logoW, logoCenterY, dists.rightPoint.x, logoCenterY]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={(logoState.x + logoW + dists.rightPoint.x) / 2 - 15} y={logoCenterY - 15}
                            text={`${dists.distRight} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}

                      {/* AuxA distance line */}
                      {logoState.visibleLines.auxA && dists.distAuxA !== null && dists.auxAPoint && dists.auxAProj && (
                        <Group>
                          <Line
                            points={[dists.auxAProj.p1.x, dists.auxAProj.p1.y, dists.auxAProj.p2.x, dists.auxAProj.p2.y]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={(dists.auxAProj.p1.x + dists.auxAProj.p2.x) / 2} y={(dists.auxAProj.p1.y + dists.auxAProj.p2.y) / 2 - 15}
                            text={`${dists.distAuxA} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}

                      {/* AuxB distance line */}
                      {logoState.visibleLines.auxB && dists.distAuxB !== null && dists.auxBPoint && dists.auxBProj && (
                        <Group>
                          <Line
                            points={[dists.auxBProj.p1.x, dists.auxBProj.p1.y, dists.auxBProj.p2.x, dists.auxBProj.p2.y]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={(dists.auxBProj.p1.x + dists.auxBProj.p2.x) / 2} y={(dists.auxBProj.p1.y + dists.auxBProj.p2.y) / 2 - 15}
                            text={`${dists.distAuxB} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}
                    </Group>
                  );
                })}
              </Group>
            )}
            
            {/* Watermark */}
            {watermark.text && watermark.visible && (
              <React.Fragment>
                <Group
                  ref={watermarkRef}
                  x={watermark.x}
                  y={watermark.y}
                  rotation={watermark.rotation}
                  scaleX={watermark.scaleX}
                  scaleY={watermark.scaleY}
                  draggable
                  onClick={() => {
                    if (selectedId === 'watermark') {
                      setIsEditingLogo(!isEditingLogo);
                    } else {
                      setSelectedId('watermark');
                      setIsEditingLogo(true);
                    }
                  }}
                  onTap={() => {
                    if (selectedId === 'watermark') {
                      setIsEditingLogo(!isEditingLogo);
                    } else {
                      setSelectedId('watermark');
                      setIsEditingLogo(true);
                    }
                  }}
                  onDragEnd={(e) => {
                    setWatermark(prev => ({
                      ...prev,
                      x: e.target.x(),
                      y: e.target.y()
                    }));
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    setWatermark(prev => ({
                      ...prev,
                      x: node.x(),
                      y: node.y(),
                      rotation: node.rotation(),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY()
                    }));
                  }}
                >
                  <Rect
                    width={400}
                    height={watermark.fontSize * 2}
                    fill={watermark.bgColor}
                    opacity={watermark.opacity}
                    offsetX={200}
                    offsetY={watermark.fontSize}
                    cornerRadius={8}
                  />
                  <Text
                    text={watermark.text}
                    fontSize={watermark.fontSize}
                    fontFamily="Arial"
                    fontStyle="bold"
                    fill={watermark.color}
                    opacity={watermark.opacity}
                    align="center"
                    verticalAlign="middle"
                    offsetX={200}
                    offsetY={watermark.fontSize / 2}
                    width={400}
                  />
                </Group>
                {selectedId === 'watermark' && isEditingLogo && (
                  <Transformer
                    ref={watermarkTrRef}
                    boundBoxFunc={(oldBox, newBox) => newBox}
                  />
                )}
              </React.Fragment>
            )}
          </Layer>
        </Stage>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* 1. 一键标注尺寸 */}
          <div className="space-y-2">
            <button
              onClick={() => setShowRulers(!showRulers)}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${showRulers ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Ruler size={18} />
              {showRulers ? '隐藏尺寸标注' : '一键标注尺寸'}
            </button>
            {(() => {
              const allVisible = logoStates.length > 0 && logoStates.every(s => s.visible);
              return (
                <button
                  onClick={() => {
                    const newVisible = !allVisible;
                    setLogoStates(prev => prev.map(s => ({ ...s, visible: newVisible })));
                  }}
                  disabled={logoStates.length === 0}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${allVisible ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {allVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  {allVisible ? '隐藏全部图层' : '显示全部图层'}
                </button>
              );
            })()}
          </div>

          {/* 2. Layer Controls */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Layers size={16} />
              图层控制
            </h3>
            <div className="space-y-2">
              {logos.map((logo, index) => {
                const state = logoStates.find(s => s.id === logo.id);
                const isVisible = state?.visible ?? true;
                return (
                  <div key={logo.id} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedId(logo.id);
                        setIsEditingLogo(false);
                      }}
                      className={`flex-1 text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${selectedId === logo.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                    >
                      {logo.type === 'image' ? `Logo ${index + 1}` : `唛头 ${index + 1}`}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (state) {
                          setLogoStates(prev => prev.map(s => s.id === logo.id ? { ...s, visible: !s.visible } : s));
                        }
                      }}
                      className={`p-2 rounded-lg border transition-colors ${isVisible ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                      title={isVisible ? "隐藏图层" : "显示图层"}
                    >
                      {isVisible ? <Check size={16} /> : <div className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Anchor Points */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Move size={12} />
              设置相对位置基准点
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'topVertex', label: '顶点' },
                { id: 'bottomLine', label: '下边线' },
                { id: 'leftLine', label: '左边线' },
                { id: 'rightLine', label: '右边线' },
                { id: 'auxA', label: '辅助点A' },
                { id: 'auxB', label: '辅助点B' }
              ].map(cfg => (
                <button
                  key={cfg.id}
                  onClick={() => setActiveAnchorId(cfg.id as any)}
                  className={`py-2 rounded-lg border text-[10px] flex flex-col items-center justify-center gap-1 transition-all ${activeAnchorId === cfg.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  <span className="truncate">{cfg.label}</span>
                  {anchorPoints[cfg.id as keyof typeof anchorPoints] ? <Check size={10} /> : <MousePointer2 size={10} />}
                </button>
              ))}
            </div>
          </div>

          {activeLogo && activeLogoState && (
            <div className="space-y-6 pt-4 border-t border-slate-100">
              {/* 4. Blend Mode & Opacity */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t.blending}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {['source-over', 'multiply', 'overlay'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateActiveLogoState({ blendMode: mode as any })}
                      className={`py-1.5 text-[10px] font-bold uppercase rounded border transition-colors ${activeLogoState.blendMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Opacity</span>
                    <span>{Math.round(activeLogoState.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={activeLogoState.opacity}
                    onChange={(e) => updateActiveLogoState({ opacity: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>
              </div>

              {/* 5. Physical Dimensions */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Maximize2 size={12} />
                    {t.dimensions} (CM)
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Width</label>
                    <input
                      type="number"
                      value={realSize?.width || 0}
                      onChange={(e) => handleSizeChange('width', parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Height</label>
                    <input
                      type="number"
                      value={realSize?.height || 0}
                      onChange={(e) => handleSizeChange('height', parseFloat(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none"
                      step="0.1"
                    />
                  </div>
                </div>

                {distances && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Move size={12} />
                      相对距离 (CM)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 flex justify-between">
                          <span>距顶点 (Top)</span>
                          <input 
                            type="checkbox" 
                            checked={activeLogoState.visibleLines.top}
                            onChange={(e) => updateActiveLogoState({ visibleLines: { ...activeLogoState.visibleLines, top: e.target.checked } })}
                          />
                        </label>
                        <input
                          type="number"
                          value={distances.distTop !== null ? distances.distTop : ''}
                          onChange={(e) => handleDistanceChange('top', parseFloat(e.target.value))}
                          disabled={distances.distTop === null}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 flex justify-between">
                          <span>距下边线 (Bottom)</span>
                          <input 
                            type="checkbox" 
                            checked={activeLogoState.visibleLines.bottom}
                            onChange={(e) => updateActiveLogoState({ visibleLines: { ...activeLogoState.visibleLines, bottom: e.target.checked } })}
                          />
                        </label>
                        <input
                          type="number"
                          value={distances.distBottom !== null ? distances.distBottom : ''}
                          onChange={(e) => handleDistanceChange('bottom', parseFloat(e.target.value))}
                          disabled={distances.distBottom === null}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 flex justify-between">
                          <span>距左边线 (Left)</span>
                          <input 
                            type="checkbox" 
                            checked={activeLogoState.visibleLines.left}
                            onChange={(e) => updateActiveLogoState({ visibleLines: { ...activeLogoState.visibleLines, left: e.target.checked } })}
                          />
                        </label>
                        <input
                          type="number"
                          value={distances.distLeft !== null ? distances.distLeft : ''}
                          onChange={(e) => handleDistanceChange('left', parseFloat(e.target.value))}
                          disabled={distances.distLeft === null}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 flex justify-between">
                          <span>距右边线 (Right)</span>
                          <input 
                            type="checkbox" 
                            checked={activeLogoState.visibleLines.right}
                            onChange={(e) => updateActiveLogoState({ visibleLines: { ...activeLogoState.visibleLines, right: e.target.checked } })}
                          />
                        </label>
                        <input
                          type="number"
                          value={distances.distRight !== null ? distances.distRight : ''}
                          onChange={(e) => handleDistanceChange('right', parseFloat(e.target.value))}
                          disabled={distances.distRight === null}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 flex justify-between">
                          <span>距辅助点A (Aux A)</span>
                          <input 
                            type="checkbox" 
                            checked={activeLogoState.visibleLines.auxA}
                            onChange={(e) => updateActiveLogoState({ visibleLines: { ...activeLogoState.visibleLines, auxA: e.target.checked } })}
                          />
                        </label>
                        <input
                          type="number"
                          value={distances.distAuxA !== null ? distances.distAuxA : ''}
                          onChange={(e) => handleDistanceChange('auxA', parseFloat(e.target.value))}
                          disabled={distances.distAuxA === null}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 flex justify-between">
                          <span>距辅助点B (Aux B)</span>
                          <input 
                            type="checkbox" 
                            checked={activeLogoState.visibleLines.auxB}
                            onChange={(e) => updateActiveLogoState({ visibleLines: { ...activeLogoState.visibleLines, auxB: e.target.checked } })}
                          />
                        </label>
                        <input
                          type="number"
                          value={distances.distAuxB !== null ? distances.distAuxB : ''}
                          onChange={(e) => handleDistanceChange('auxB', parseFloat(e.target.value))}
                          disabled={distances.distAuxB === null}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-slate-900 outline-none disabled:opacity-50"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Watermark Control */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                水印设置
              </h4>
              <button
                onClick={() => setWatermark(prev => ({ ...prev, visible: !prev.visible }))}
                className="text-slate-400 hover:text-slate-900 transition-colors tooltip-wrapper relative"
              >
                {watermark.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            <input
              type="text"
              placeholder="ASSSOO STUDIO"
              value={watermark.text}
              onFocus={() => {
                if (!watermark.text) {
                  setWatermark(prev => ({ ...prev, text: 'ASSSOO STUDIO' }));
                }
                setSelectedId('watermark');
                setIsEditingLogo(true);
              }}
              onChange={(e) => setWatermark(prev => ({ ...prev, text: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
            {watermark.text && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>字体大小</span>
                    <span>{watermark.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={watermark.fontSize}
                    onChange={(e) => setWatermark(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>透明度</span>
                    <span>{Math.round(watermark.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={watermark.opacity}
                    onChange={(e) => setWatermark(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">文字颜色</label>
                    <input
                      type="color"
                      value={watermark.color}
                      onChange={(e) => setWatermark(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full h-8 cursor-pointer rounded border border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">底纹颜色</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={watermark.bgColor === 'transparent' ? '#ffffff' : watermark.bgColor}
                        onChange={(e) => setWatermark(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-full h-8 cursor-pointer rounded border border-slate-200"
                      />
                      <button
                        onClick={() => setWatermark(prev => ({ ...prev, bgColor: 'transparent' }))}
                        className={`px-2 py-1 text-[10px] rounded border ${watermark.bgColor === 'transparent' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        透明
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">提示：在画布上点击水印可进行移动、旋转和缩放。如需添加图片水印，请返回上一步添加为Logo。</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={handleExport}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
          >
            {onExportSingle ? '继续导出全部' : '继续导出'}
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
});

export const MockupCanvas: React.FC<MockupCanvasProps> = ({ garments, logos, lang, onExport }) => {
  const [activeGarmentId, setActiveGarmentId] = useState(garments[0]?.id);
  const refs = useRef<Record<string, any>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Per-garment watermark state lifted to parent for cascade synchronization.
  // Edits to G[i] cascade to G[i..N-1]. Edits to G[j] do NOT affect G[k<j].
  const [watermarks, setWatermarks] = useState<Record<string, WatermarkState>>(() => {
    const obj: Record<string, WatermarkState> = {};
    garments.forEach(g => { obj[g.id] = { ...DEFAULT_WATERMARK }; });
    return obj;
  });
  const [anchorPointsByGarment, setAnchorPointsByGarment] = useState<Record<string, AnchorPointsState>>(() => {
    const obj: Record<string, AnchorPointsState> = {};
    garments.forEach(g => { obj[g.id] = { ...DEFAULT_ANCHORS }; });
    return obj;
  });

  // Initialize new garments and prune removed ones; new garments inherit from prior sibling
  useEffect(() => {
    setWatermarks(prev => {
      const next: Record<string, WatermarkState> = {};
      garments.forEach((g, idx) => {
        if (prev[g.id]) {
          next[g.id] = prev[g.id];
        } else {
          // Inherit from previous sibling (cascade default), or DEFAULT_WATERMARK if first
          const prior = idx > 0 ? prev[garments[idx - 1].id] : null;
          next[g.id] = prior ? { ...prior } : { ...DEFAULT_WATERMARK };
        }
      });
      return next;
    });
    setAnchorPointsByGarment(prev => {
      const next: Record<string, AnchorPointsState> = {};
      garments.forEach((g, idx) => {
        if (prev[g.id]) {
          next[g.id] = prev[g.id];
        } else {
          const prior = idx > 0 ? prev[garments[idx - 1].id] : null;
          next[g.id] = prior ? { ...prior } : { ...DEFAULT_ANCHORS };
        }
      });
      return next;
    });
  }, [garments]);

  // Reset activeGarmentId if it no longer matches any garment
  useEffect(() => {
    if (!garments.find(g => g.id === activeGarmentId)) {
      setActiveGarmentId(garments[0]?.id);
    }
  }, [garments, activeGarmentId]);

  const handleWatermarkChange = (garmentId: string, newWatermark: WatermarkState) => {
    const idx = garments.findIndex(g => g.id === garmentId);
    if (idx === -1) return;
    setWatermarks(prev => {
      const next = { ...prev };
      // Cascade downstream: idx, idx+1, ..., N-1
      for (let i = idx; i < garments.length; i++) {
        next[garments[i].id] = newWatermark;
      }
      return next;
    });
  };

  const handleAnchorChange = (garmentId: string, newAnchors: AnchorPointsState) => {
    const idx = garments.findIndex(g => g.id === garmentId);
    if (idx === -1) return;
    setAnchorPointsByGarment(prev => {
      const next = { ...prev };
      for (let i = idx; i < garments.length; i++) {
        next[garments[i].id] = newAnchors;
      }
      return next;
    });
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    const results = [];
    for (const g of garments) {
      if (refs.current[g.id]) {
        const data = await refs.current[g.id].exportMockup();
        results.push(data);
      }
    }
    setIsExporting(false);
    onExport(results);
  };

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {garments.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex items-center gap-2 overflow-x-auto shrink-0 z-10">
          {garments.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGarmentId(g.id)}
              className={`flex-shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeGarmentId === g.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              {g.name || '未命名'}
            </button>
          ))}
          <div className="ml-auto pl-2">
            <button 
              onClick={handleExportAll} 
              disabled={isExporting} 
              className="px-6 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              {isExporting ? '生成中...' : '生成全部并导出'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 relative min-h-[700px]">
        {garments.map(g => (
          <div 
            key={g.id} 
            className="absolute inset-0 transition-opacity duration-300" 
            style={{ 
              zIndex: activeGarmentId === g.id ? 10 : 0, 
              opacity: activeGarmentId === g.id ? 1 : 0, 
              pointerEvents: activeGarmentId === g.id ? 'auto' : 'none' 
            }}
          >
            <SingleMockupCanvas 
              garment={g} 
              logos={logos} 
              lang={lang} 
              ref={(el) => refs.current[g.id] = el}
              onExportSingle={handleExportAll}
              watermark={watermarks[g.id] || DEFAULT_WATERMARK}
              onWatermarkChange={(wm) => handleWatermarkChange(g.id, wm)}
              anchorPoints={anchorPointsByGarment[g.id] || DEFAULT_ANCHORS}
              onAnchorPointsChange={(ap) => handleAnchorChange(g.id, ap)}
            />
          </div>
        ))}
      </div>

      {isExporting && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-900 font-bold tracking-wide">正在生成高清效果图...</p>
        </div>
      )}
    </div>
  );
};
