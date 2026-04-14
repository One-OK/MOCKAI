import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Group, Rect, Text, Line, Circle } from 'react-konva';
import useImage from 'use-image';
import { GarmentImage, LogoImage, Language } from '../types';
import { Ruler, Move, Maximize2, Download, Layers, Trash2, Check, MousePointer2, ChevronRight } from 'lucide-react';
import { translations } from '../i18n';

interface MockupCanvasProps {
  garment: GarmentImage;
  logos: LogoImage[];
  lang: Language;
  onExport: (data: {withRulers: string, withoutRulers: string}) => void;
}

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
            {logo.labelProps?.stitchLeftRight && (
              <>
                <Line
                  points={[15, 15, 15, logo.height - 15]}
                  stroke={logo.labelProps?.borderColor || '#000000'}
                  strokeWidth={1}
                  dash={[4, 4]}
                  strokeScaleEnabled={false}
                />
                <Line
                  points={[logo.width - 15, 15, logo.width - 15, logo.height - 15]}
                  stroke={logo.labelProps?.borderColor || '#000000'}
                  strokeWidth={1}
                  dash={[4, 4]}
                  strokeScaleEnabled={false}
                />
              </>
            )}
            {logo.labelProps?.stitchTopBottom && (
              <>
                <Line
                  points={[15, 15, logo.width - 15, 15]}
                  stroke={logo.labelProps?.borderColor || '#000000'}
                  strokeWidth={1}
                  dash={[4, 4]}
                  strokeScaleEnabled={false}
                />
                <Line
                  points={[15, logo.height - 15, logo.width - 15, logo.height - 15]}
                  stroke={logo.labelProps?.borderColor || '#000000'}
                  strokeWidth={1}
                  dash={[4, 4]}
                  strokeScaleEnabled={false}
                />
              </>
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

export const MockupCanvas: React.FC<MockupCanvasProps> = ({ garment, logos, lang, onExport }) => {
  const t = translations[lang].mockup;
  const common = translations[lang].common;

  const [garmentImg] = useImage(garment.url);
  
  const pixelsPerCm = garment.referenceScale || 1;

  // Initialize state for each logo
  const [logoStates, setLogoStates] = useState<LogoState[]>(() => {
    return logos.map((logo, index) => {
      // Default scale: if image is large, scale it down to fit nicely
      let initialScale = 1;
      if (logo.type === 'image') {
        // Default scale: make it fit nicely (e.g. 200px wide) instead of forcing 25cm
        const targetWidthPx = 200;
        initialScale = targetWidthPx / logo.width;
        
        // Limit scale if it's too huge or too small
        if (initialScale > 1) initialScale = 1;
      } else if (logo.type === 'label') {
        // logo.width is physicalWidthMm * 10
        // We want the rendered width to be physicalWidthMm * (pixelsPerCm / 10)
        // So initialScale = (pixelsPerCm / 10) / 10 = pixelsPerCm / 100
        initialScale = pixelsPerCm / 100;
      }
      
      return {
        id: logo.id,
        x: 400 - (logo.width * initialScale) / 2,
        y: 200 + index * 50,
        scaleX: initialScale,
        scaleY: initialScale,
        rotation: 0,
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const stageRef = useRef<any>(null);

  const [showRulers, setShowRulers] = useState(true);
  const [previewAllLogos, setPreviewAllLogos] = useState(false);
  const [watermark, setWatermark] = useState({
    text: 'ASSSOO STUDIO',
    fontSize: 36,
    color: '#ffffff',
    bgColor: '#c8c8c8',
    opacity: 0.2,
    x: 650,
    y: 650,
    rotation: -45,
    scaleX: 1,
    scaleY: 1
  });
  const [anchorPoints, setAnchorPoints] = useState<{
    topVertex: { x: number, y: number } | null;
    bottomLine: { x: number, y: number } | null;
    leftLine: { x: number, y: number } | null;
    rightLine: { x: number, y: number } | null;
    auxA: { x: number, y: number } | null;
    auxB: { x: number, y: number } | null;
  }>({
    topVertex: null,
    bottomLine: null,
    leftLine: null,
    rightLine: null,
    auxA: null,
    auxB: null
  });
  const [activeAnchorId, setActiveAnchorId] = useState<'topVertex' | 'bottomLine' | 'leftLine' | 'rightLine' | 'auxA' | 'auxB' | null>(null);
  const watermarkRef = useRef<any>(null);
  const watermarkTrRef = useRef<any>(null);

  useEffect(() => {
    if (selectedId === 'watermark' && isEditingLogo && watermarkTrRef.current && watermarkRef.current) {
      watermarkTrRef.current.nodes([watermarkRef.current]);
      watermarkTrRef.current.getLayer().batchDraw();
    }
  }, [selectedId, isEditingLogo]);

  const handleExport = () => {
    setSelectedId(null);
    
    // Generate without rulers
    setShowRulers(false);
    setTimeout(() => {
      const urlWithoutRulers = stageRef.current.toDataURL({ pixelRatio: 2 });
      
      // Generate with rulers
      setShowRulers(true);
      setTimeout(() => {
        const urlWithRulers = stageRef.current.toDataURL({ pixelRatio: 2 });
        
        onExport({
          withRulers: urlWithRulers,
          withoutRulers: urlWithoutRulers
        });
        
        setShowRulers(true); // Reset to default
      }, 100);
    }, 100);
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
    
    const logoLeftX = logoState.x;
    const logoRightX = logoState.x + (logo.width * logoState.scaleX);
    const logoTopY = logoState.y;
    const logoBottomY = logoState.y + (logo.height * logoState.scaleY);
    const logoCenterX = logoState.x + (logo.width * logoState.scaleX) / 2;
    const logoCenterY = logoState.y + (logo.height * logoState.scaleY) / 2;
    
    let distTop = null;
    let distBottom = null;
    let distLeft = null;
    let distRight = null;
    let distAuxA = null;
    let distAuxB = null;
    
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
    if (auxAPoint) {
      distAuxA = parseFloat((Math.sqrt(Math.pow(logoCenterX - auxAPoint.x, 2) + Math.pow(logoCenterY - auxAPoint.y, 2)) / pixelsPerCm).toFixed(1));
    }
    if (auxBPoint) {
      distAuxB = parseFloat((Math.sqrt(Math.pow(logoCenterX - auxBPoint.x, 2) + Math.pow(logoCenterY - auxBPoint.y, 2)) / pixelsPerCm).toFixed(1));
    }
    
    return { distTop, distBottom, distLeft, distRight, distAuxA, distAuxB, topPoint, bottomPoint, leftPoint, rightPoint, auxAPoint, auxBPoint };
  };

  const handleDistanceChange = (key: 'top' | 'bottom' | 'left' | 'right' | 'auxA' | 'auxB', val: number) => {
    if (!activeLogo || !activeLogoState || isNaN(val)) return;
    const dists = getDistancesForLogo(activeLogoState, activeLogo);
    const pixels = val * pixelsPerCm;

    let newX = activeLogoState.x;
    let newY = activeLogoState.y;

    if (key === 'top' && dists.topPoint) {
      newY = dists.topPoint.y + pixels;
    } else if (key === 'bottom' && dists.bottomPoint) {
      newY = dists.bottomPoint.y - pixels - (activeLogo.height * activeLogoState.scaleY);
    } else if (key === 'left' && dists.leftPoint) {
      newX = dists.leftPoint.x + pixels;
    } else if (key === 'right' && dists.rightPoint) {
      newX = dists.rightPoint.x - pixels - (activeLogo.width * activeLogoState.scaleX);
    }
    // For aux points, we don't handle direct distance input since it's a 2D distance

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
              if (!state.visible && !previewAllLogos) return null;
              if (!previewAllLogos && logo.id !== selectedId) return null;
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
                      const distArr = [
                        { key: 'top', val: dists.distTop },
                        { key: 'bottom', val: dists.distBottom },
                        { key: 'left', val: dists.distLeft },
                        { key: 'right', val: dists.distRight },
                        { key: 'auxA', val: dists.distAuxA },
                        { key: 'auxB', val: dists.distAuxB }
                      ].filter(d => d.val !== null) as { key: string, val: number }[];
                      
                      distArr.sort((a, b) => a.val - b.val);
                      
                      visibleLines = {
                        top: false, bottom: false, left: false, right: false, auxA: false, auxB: false
                      };
                      
                      if (logo.type === 'label') {
                        // Only one minimum distance for labels
                        if (distArr.length > 0) visibleLines[distArr[0].key as keyof typeof visibleLines] = true;
                      } else {
                        // Two minimum distances for logos
                        if (distArr.length > 0) visibleLines[distArr[0].key as keyof typeof visibleLines] = true;
                        if (distArr.length > 1) visibleLines[distArr[1].key as keyof typeof visibleLines] = true;
                      }
                    }
                    setLogoStates(prev => prev.map(s => s.id === logo.id ? { ...newAttrs, visibleLines } : s));
                  }}
                  pixelsPerCm={pixelsPerCm}
                />
              );
            })}
            
            {(showRulers && (previewAllLogos || selectedId)) && (
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
                  if (!logoState.visible && !previewAllLogos) return null;
                  if (!previewAllLogos && logoState.id !== selectedId) return null;
                  
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
                      {logoState.visibleLines.auxA && dists.distAuxA !== null && dists.auxAPoint && (
                        <Group>
                          <Line
                            points={[logoCenterX, logoCenterY, dists.auxAPoint.x, dists.auxAPoint.y]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={(logoCenterX + dists.auxAPoint.x) / 2} y={(logoCenterY + dists.auxAPoint.y) / 2 - 15}
                            text={`${dists.distAuxA} cm`}
                            fill={color} fontSize={12} fontStyle="bold"
                            shadowColor="white" shadowBlur={2} shadowOpacity={1}
                          />
                        </Group>
                      )}

                      {/* AuxB distance line */}
                      {logoState.visibleLines.auxB && dists.distAuxB !== null && dists.auxBPoint && (
                        <Group>
                          <Line
                            points={[logoCenterX, logoCenterY, dists.auxBPoint.x, dists.auxBPoint.y]}
                            stroke={color} strokeWidth={1} dash={[4, 4]}
                          />
                          <Text
                            x={(logoCenterX + dists.auxBPoint.x) / 2} y={(logoCenterY + dists.auxBPoint.y) / 2 - 15}
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
            {watermark.text && (
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
                    width={600}
                    height={watermark.fontSize * 2}
                    fill={watermark.bgColor}
                    opacity={watermark.opacity}
                    offsetX={300}
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
                    offsetX={300}
                    offsetY={watermark.fontSize / 2}
                    width={600}
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
            <button
              onClick={() => setPreviewAllLogos(!previewAllLogos)}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${previewAllLogos ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Layers size={18} />
              {previewAllLogos ? '隐藏所有LOGO' : '一键预览LOGO'}
            </button>
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
                          disabled={true}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm outline-none disabled:opacity-50"
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
                          disabled={true}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm outline-none disabled:opacity-50"
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
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              水印设置
            </h4>
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
            继续导出
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
