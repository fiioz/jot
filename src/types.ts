import type { Drawable } from 'roughjs/bin/core';

export type ElementType =
  | 'selection'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface ElementStyle {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'solid' | 'cross-hatch' | 'zigzag';
  strokeWidth: number;
  roughness: number;
}

export interface ExcalidrawElement extends ElementStyle {
  id: string;
  type: ElementType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle?: number;
  groupId?: string | null;
  locked?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  imageSrc?: string;
  points?: Point[]; // 用于自由绘制 (freedraw)
  roughElement?: Drawable; // 保存 roughjs 生成的 drawable 对象
}

export type Theme = 'light' | 'dark';

export interface AppState {
  elements: ExcalidrawElement[];
  action: 'idle' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'selecting' | 'panning' | 'erasing';
  selectedElement: ExcalidrawElement | null;
  theme: Theme;
}
