export type Language = 'zh' | 'en';

export interface MeasurementPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  pairId?: string; // For distances like shoulder-to-shoulder
}

export interface GarmentImage {
  url: string;
  width: number;
  height: number;
  backgroundColor?: string;
  measurements?: {
    [key: string]: number; // in cm
  };
  points?: MeasurementPoint[];
  referenceScale?: number; // pixels per cm
}

export interface LogoImage {
  id: string;
  type: 'image' | 'label';
  url: string;
  originalUrl: string;
  width: number;
  height: number;
  processedUrl?: string;
  trimRect?: { x: number; y: number; width: number; height: number };
  labelProps?: {
    text: string;
    color: string;
    borderColor: string;
    textColor: string;
    borderStyle?: 'dashed' | 'solid';
    imageUrl?: string;
    borderWidth?: number;
    stitchLeftRight?: boolean;
    stitchTopBottom?: boolean;
    physicalWidthMm?: number;
    physicalHeightMm?: number;
    fontSize?: number;
    imageScale?: number;
    imageOffsetX?: number;
    imageOffsetY?: number;
  };
}

export type AppStep = 'garment' | 'logo' | 'mockup' | 'export';
