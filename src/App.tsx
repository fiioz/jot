import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { StylePanel } from './components/StylePanel';
import type { ElementType, ElementStyle, ExcalidrawElement, Theme } from './types';
import { useHistory } from './hooks/useHistory';
import { createElement, exportToPng, exportToSvg } from './utils/draw';
import './App.css';

const DEFAULT_STYLE: ElementStyle = {
  strokeColor: '#000000',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 1,
  roughness: 1
};

const clamp255 = (v: number) => Math.max(0, Math.min(255, v));

const invertHexColor = (hex: string) => {
  const normalized = hex.trim();
  if (!normalized.startsWith('#')) return null;
  const raw = normalized.slice(1);
  if (![3, 6, 8].includes(raw.length)) return null;

  const expand = (s: string) => (s.length === 1 ? s + s : s);
  const rHex = raw.length === 3 ? expand(raw[0]) : raw.slice(0, 2);
  const gHex = raw.length === 3 ? expand(raw[1]) : raw.slice(2, 4);
  const bHex = raw.length === 3 ? expand(raw[2]) : raw.slice(4, 6);
  const aHex = raw.length === 8 ? raw.slice(6, 8) : null;

  const r = Number.parseInt(rHex, 16);
  const g = Number.parseInt(gHex, 16);
  const b = Number.parseInt(bHex, 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;

  const toHex2 = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  const out = `#${toHex2(255 - r)}${toHex2(255 - g)}${toHex2(255 - b)}${aHex ? aHex : ''}`;
  return out;
};

const invertRgbColor = (color: string) => {
  const m = color.trim().match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*([0-9.]+)\s*)?\)$/i);
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = m[4] !== undefined ? Number(m[4]) : null;
  if ([r, g, b].some(v => Number.isNaN(v))) return null;
  if (a !== null && Number.isNaN(a)) return null;
  const rr = clamp255(255 - clamp255(r));
  const gg = clamp255(255 - clamp255(g));
  const bb = clamp255(255 - clamp255(b));
  if (a === null) return `rgb(${rr}, ${gg}, ${bb})`;
  return `rgba(${rr}, ${gg}, ${bb}, ${Math.max(0, Math.min(1, a))})`;
};

const invertColor = (color: unknown, fallback: string) => {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  if (trimmed === '') return fallback;
  if (trimmed.toLowerCase() === 'transparent') return 'transparent';
  const hex = invertHexColor(trimmed);
  if (hex) return hex;
  const rgb = invertRgbColor(trimmed);
  if (rgb) return rgb;
  return trimmed;
};

const invertStyleColors = (style: ElementStyle): ElementStyle => {
  const strokeColor = invertColor(style.strokeColor, DEFAULT_STYLE.strokeColor);
  const bg = typeof style.backgroundColor === 'string' ? style.backgroundColor : DEFAULT_STYLE.backgroundColor;
  const bgTrimmed = bg.trim();
  const backgroundColor = bgTrimmed.toLowerCase() === 'transparent'
    ? 'transparent'
    : invertColor(bgTrimmed, DEFAULT_STYLE.backgroundColor);
  return { ...style, strokeColor, backgroundColor };
};

function App() {
  const [tool, setTool] = useState<ElementType>('selection');
  const [currentStyle, setCurrentStyle] = useState<ElementStyle>(DEFAULT_STYLE);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedElement, setSelectedElement] = useState<ExcalidrawElement | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('excalidraw_theme');
    return (savedTheme as Theme) || 'light';
  });

  // 初始化 LocalStorage 数据
  const savedElements = localStorage.getItem('excalidraw_elements');
  const initialElements = savedElements ? JSON.parse(savedElements) : [];
  
  const { elements, setElements, undo, redo, clearHistory, canUndo, canRedo } = useHistory(initialElements);

  // 监听 elements 变化并保存到 LocalStorage
  useEffect(() => {
    localStorage.setItem('excalidraw_elements', JSON.stringify(elements));
  }, [elements]);

  const existingIds = useMemo(() => new Set(elements.map(el => el.id)), [elements]);
  const effectiveSelectedElementIds = useMemo(
    () => selectedElementIds.filter(id => existingIds.has(id)),
    [existingIds, selectedElementIds]
  );
  const effectiveSelectedElement = useMemo(() => {
    if (!selectedElement) return null;
    return elements.find(el => el.id === selectedElement.id) || null;
  }, [elements, selectedElement]);

  // 监听 theme 变化
  useEffect(() => {
    localStorage.setItem('excalidraw_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setElements(prev => prev.map(el => {
      const stroke = typeof el.strokeColor === 'string' ? el.strokeColor : DEFAULT_STYLE.strokeColor;
      const bg = typeof el.backgroundColor === 'string' ? el.backgroundColor : DEFAULT_STYLE.backgroundColor;
      const bgTrimmed = bg.trim();
      const updated: ExcalidrawElement = {
        ...el,
        strokeColor: invertColor(stroke, DEFAULT_STYLE.strokeColor),
        backgroundColor: bgTrimmed.toLowerCase() === 'transparent'
          ? 'transparent'
          : invertColor(bgTrimmed, DEFAULT_STYLE.backgroundColor),
      };
      if (updated.type === 'freedraw' || updated.type === 'text' || updated.type === 'image') return updated;
      return createElement(updated.id, updated.x1, updated.y1, updated.x2, updated.y2, updated.type, updated);
    }), false);
    setCurrentStyle(prev => invertStyleColors(prev));
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const groupSelected = useCallback(() => {
    if (effectiveSelectedElementIds.length < 2) return;
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setElements(prev => prev.map(el => effectiveSelectedElementIds.includes(el.id) ? { ...el, groupId } : el), false);
  }, [effectiveSelectedElementIds, setElements]);

  const ungroupSelected = useCallback(() => {
    const selectedGroups = new Set(
      elements
        .filter(el => effectiveSelectedElementIds.includes(el.id))
        .map(el => el.groupId)
        .filter((g): g is string => Boolean(g))
    );
    if (selectedGroups.size === 0) return;
    setElements(prev => prev.map(el => (el.groupId && selectedGroups.has(el.groupId)) ? { ...el, groupId: null } : el), false);
  }, [elements, effectiveSelectedElementIds, setElements]);

  const toggleLockSelected = useCallback(() => {
    if (effectiveSelectedElementIds.length === 0) return;
    const selected = elements.filter(el => effectiveSelectedElementIds.includes(el.id));
    if (selected.length === 0) return;
    const shouldLock = selected.some(el => !el.locked);
    setElements(prev => prev.map(el => effectiveSelectedElementIds.includes(el.id) ? { ...el, locked: shouldLock } : el), false);
  }, [elements, effectiveSelectedElementIds, setElements]);

  const applyStyleToSelected = useCallback((newStyle: Partial<ElementStyle>) => {
    if (effectiveSelectedElementIds.length === 0) return;
    setElements(prev => prev.map(el => {
      if (!effectiveSelectedElementIds.includes(el.id)) return el;
      if (el.locked) return el;
      const updated: ExcalidrawElement = { ...el, ...newStyle };
      if (updated.type === 'freedraw') return updated;
      return createElement(updated.id, updated.x1, updated.y1, updated.x2, updated.y2, updated.type, updated);
    }), false);
  }, [effectiveSelectedElementIds, setElements]);

  // 监听键盘快捷键 (撤销/重做/组合/锁定)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupSelected();
        } else {
          groupSelected();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        toggleLockSelected();
        return;
      }

      if (e.key === 'Escape') {
        setSelectedElement(null);
        setSelectedElementIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, toggleLockSelected, undo, ungroupSelected, groupSelected]);

  const panelStyle = tool === 'selection' && effectiveSelectedElement ? effectiveSelectedElement : currentStyle;
  const showPanel = (tool !== 'hand' && tool !== 'eraser') && (tool !== 'selection' || effectiveSelectedElementIds.length > 0);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Toolbar 
        tool={tool} 
        setTool={setTool} 
        undo={undo}
        redo={redo}
        clearCanvas={() => clearHistory([])}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportPng={() => exportToPng(canvasRef.current)}
        onExportSvg={() => exportToSvg(elements, window.innerWidth, window.innerHeight)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      {showPanel && (
        <StylePanel 
          currentStyle={panelStyle}
          onChange={(newStyle) => {
            if (tool === 'selection' && effectiveSelectedElementIds.length > 0) {
              applyStyleToSelected(newStyle);
            } else {
              setCurrentStyle(prev => ({ ...prev, ...newStyle }));
            }
          }}
          selectionCount={effectiveSelectedElementIds.length}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          onToggleLock={toggleLockSelected}
        />
      )}

      <Canvas 
        tool={tool} 
        elements={elements} 
        setElements={setElements} 
        currentStyle={currentStyle}
        selectedElement={effectiveSelectedElement}
        setSelectedElement={setSelectedElement}
        selectedElementIds={effectiveSelectedElementIds}
        setSelectedElementIds={setSelectedElementIds}
        ref={canvasRef}
      />
    </div>
  );
}

export default App;
