import React, { useEffect, useLayoutEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { ElementType, ExcalidrawElement, AppState, ElementStyle } from '../types';
import { drawElements, createElement, getElementBounds, getElementCenter, inverseRotatePoint, isPointInElement, isPointOnRotateHandle, rotatePoint, getResizeHandle } from '../utils/draw';

interface CanvasProps {
  tool: ElementType;
  elements: ExcalidrawElement[];
  setElements: (
    action: ExcalidrawElement[] | ((current: ExcalidrawElement[]) => ExcalidrawElement[]),
    overwrite?: boolean
  ) => void;
  currentStyle: ElementStyle;
  selectedElement: ExcalidrawElement | null;
  setSelectedElement: (element: ExcalidrawElement | null) => void;
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
}

export const Canvas = forwardRef<HTMLCanvasElement, CanvasProps>(({ tool, elements, setElements, currentStyle, selectedElement, setSelectedElement, selectedElementIds, setSelectedElementIds }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImagePos = useRef<{ x: number; y: number } | null>(null);
  
  // 暴露 canvas 实例给父组件
  useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);
  const [action, setAction] = useState<AppState['action']>('idle');
  const resizeHandle = useRef<string | null>(null);
  const dragOffset = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const selectStart = useRef<{ x: number; y: number } | null>(null);
  const selectAdditive = useRef(false);
  const moveStart = useRef<{ x: number; y: number } | null>(null);
  const moveOrigin = useRef<Map<string, ExcalidrawElement>>(new Map());
  const rotateStart = useRef<{ mouseAngle: number; baseCx: number; baseCy: number; targets: { id: string; cx: number; cy: number; angle: number }[] } | null>(null);
  const resizeOrigin = useRef<{ element: ExcalidrawElement; cx: number; cy: number; angle: number } | null>(null);
  const skipTextBlurCommit = useRef(false);
  const [textEditing, setTextEditing] = useState<{
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    value: string;
    fontSize: number;
    fontFamily: string;
    isNew: boolean;
  } | null>(null);

  // 渲染所有元素
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
      drawElements(canvas, elements, scroll.x, scroll.y, selectedElements, zoom, guides, selectionBox);
    }
  }, [elements, scroll, windowSize, selectedElementIds, zoom, guides, selectionBox]);

  // 处理窗口大小调整
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听触控板或鼠标滚轮事件
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // 缩放
        const zoomFactor = 0.05;
        const delta = e.deltaY < 0 ? zoomFactor : -zoomFactor;
        const newZoom = Math.min(Math.max(0.1, zoom + delta), 5);
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        setScroll(prev => ({
          x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
          y: mouseY - (mouseY - prev.y) * (newZoom / zoom)
        }));
        setZoom(newZoom);
      } else {
        // 平移
        setScroll(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoom]);

  // 生成唯一 ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { clientX: e.clientX, clientY: e.clientY };
    const rect = canvas.getBoundingClientRect();
    return {
      clientX: (e.clientX - rect.left - scroll.x) / zoom,
      clientY: (e.clientY - rect.top - scroll.y) / zoom
    };
  };

  const getTextMetrics = (text: string, fontSize: number, fontFamily: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (ctx) {
      ctx.save();
      ctx.font = `${fontSize}px ${fontFamily}`;
      const width = Math.max(1, ctx.measureText(text).width);
      ctx.restore();
      return { width, height: Math.max(1, fontSize * 1.2) };
    }
    return { width: Math.max(1, text.length * fontSize * 0.6), height: Math.max(1, fontSize * 1.2) };
  };

  const startNewText = (x: number, y: number) => {
    const id = generateId();
    const fontSize = 24;
    const fontFamily = 'Arial';
    const metrics = getTextMetrics('', fontSize, fontFamily);
    setTextEditing({
      id,
      x1: x,
      y1: y,
      x2: x + Math.max(metrics.width, 120),
      y2: y + metrics.height,
      value: '',
      fontSize,
      fontFamily,
      isNew: true,
    });
    setSelectedElement(null);
    setSelectedElementIds([]);
    setAction('idle');
  };

  const startEditText = (element: ExcalidrawElement) => {
    const fontSize = element.fontSize ?? 24;
    const fontFamily = element.fontFamily ?? 'Arial';
    setTextEditing({
      id: element.id,
      x1: element.x1,
      y1: element.y1,
      x2: element.x2,
      y2: element.y2,
      value: element.text ?? '',
      fontSize,
      fontFamily,
      isNew: false,
    });
    setSelectedElement(element);
    setSelectedElementIds([element.id]);
    setAction('idle');
  };

  const commitText = () => {
    if (!textEditing) return;
    const text = textEditing.value;
    const trimmed = text.replace(/\s+$/g, '');
    if (textEditing.isNew && trimmed.length === 0) {
      setTextEditing(null);
      return;
    }

    const { width, height } = getTextMetrics(trimmed, textEditing.fontSize, textEditing.fontFamily);
    const x1 = textEditing.x1;
    const y1 = textEditing.y1;
    const x2 = x1 + Math.max(width, 1);
    const y2 = y1 + Math.max(height, 1);

    if (textEditing.isNew) {
      const element = createElement(textEditing.id, x1, y1, x2, y2, 'text', {
        ...currentStyle,
        text: trimmed,
        fontSize: textEditing.fontSize,
        fontFamily: textEditing.fontFamily,
      });
      setElements(prev => [...prev, element], false);
      setSelectedElement(element);
      setSelectedElementIds([element.id]);
      setTextEditing(null);
      return;
    }

    let updatedElement: ExcalidrawElement | null = null;
    setElements(prev => prev.map(el => {
      if (el.id !== textEditing.id) return el;
      if (el.locked) return el;
      updatedElement = createElement(el.id, x1, y1, x2, y2, 'text', {
        ...el,
        text: trimmed,
        fontSize: textEditing.fontSize,
        fontFamily: textEditing.fontFamily,
        x1,
        y1,
        x2,
        y2,
      });
      return updatedElement;
    }), false);
    setSelectedElement(updatedElement);
    setSelectedElementIds([textEditing.id]);
    setTextEditing(null);
  };

  const cancelText = () => {
    skipTextBlurCommit.current = true;
    setTextEditing(null);
  };

  const handleImagePick = (x: number, y: number) => {
    pendingImagePos.current = { x, y };
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      pendingImagePos.current = null;
      return;
    }
    const pos = pendingImagePos.current;
    pendingImagePos.current = null;
    if (!pos) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, img.naturalWidth * scale);
        const h = Math.max(1, img.naturalHeight * scale);
        const id = generateId();
        const element = createElement(id, pos.x, pos.y, pos.x + w, pos.y + h, 'image', {
          ...currentStyle,
          imageSrc: src,
        });
        setElements(prev => [...prev, element], false);
        setSelectedElement(element);
        setSelectedElementIds([id]);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getAabb = (element: ExcalidrawElement) => {
    const angle = element.angle ?? 0;
    const base = getElementBounds(element);
    if (angle === 0 || element.type === 'line' || element.type === 'arrow') return base;
    const { cx, cy } = getElementCenter(element);
    const corners = [
      rotatePoint(base.minX, base.minY, cx, cy, angle),
      rotatePoint(base.maxX, base.minY, cx, cy, angle),
      rotatePoint(base.maxX, base.maxY, cx, cy, angle),
      rotatePoint(base.minX, base.maxY, cx, cy, angle),
    ];
    return {
      minX: Math.min(...corners.map(p => p.x)),
      maxX: Math.max(...corners.map(p => p.x)),
      minY: Math.min(...corners.map(p => p.y)),
      maxY: Math.max(...corners.map(p => p.y)),
    };
  };

  const getSnapCandidates = (excludeIds: Set<string>) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const el of elements) {
      if (excludeIds.has(el.id)) continue;
      const b = getAabb(el);
      const midX = (b.minX + b.maxX) / 2;
      const midY = (b.minY + b.maxY) / 2;
      xs.push(b.minX, midX, b.maxX);
      ys.push(b.minY, midY, b.maxY);
    }
    return { xs, ys };
  };

  const snapPoint = (x: number, y: number, excludeIds: Set<string>, enabled: boolean) => {
    if (!enabled) return { x, y, guideX: null as number | null, guideY: null as number | null };
    const threshold = 8 / zoom;
    const { xs, ys } = getSnapCandidates(excludeIds);

    let bestX: { v: number; d: number } | null = null;
    for (const vx of xs) {
      const d = vx - x;
      if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { v: vx, d };
    }

    let bestY: { v: number; d: number } | null = null;
    for (const vy of ys) {
      const d = vy - y;
      if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { v: vy, d };
    }

    return {
      x: bestX ? bestX.v : x,
      y: bestY ? bestY.v : y,
      guideX: bestX ? bestX.v : null,
      guideY: bestY ? bestY.v : null,
    };
  };

  const snapMoveDelta = (aabb: { minX: number; maxX: number; minY: number; maxY: number }, excludeIds: Set<string>, enabled: boolean) => {
    if (!enabled) return { dx: 0, dy: 0, guideX: null as number | null, guideY: null as number | null };
    const threshold = 8 / zoom;
    const { xs, ys } = getSnapCandidates(excludeIds);
    const midX = (aabb.minX + aabb.maxX) / 2;
    const midY = (aabb.minY + aabb.maxY) / 2;

    const xTargets = [aabb.minX, midX, aabb.maxX];
    const yTargets = [aabb.minY, midY, aabb.maxY];

    let bestX: { d: number; v: number } | null = null;
    for (const candidate of xs) {
      for (const t of xTargets) {
        const d = candidate - t;
        if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, v: candidate };
      }
    }

    let bestY: { d: number; v: number } | null = null;
    for (const candidate of ys) {
      for (const t of yTargets) {
        const d = candidate - t;
        if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, v: candidate };
      }
    }

    return { dx: bestX ? bestX.d : 0, dy: bestY ? bestY.d : 0, guideX: bestX ? bestX.v : null, guideY: bestY ? bestY.v : null };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 鼠标中键或者当前选中了平移工具
    if (tool === 'hand' || e.button === 1) {
      setAction('panning');
      dragOffset.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (textEditing) return;

    const { clientX, clientY } = getCoordinates(e);
    setGuides({ x: null, y: null });

    if (tool === 'text') {
      startNewText(clientX, clientY);
      return;
    }

    if (tool === 'image') {
      handleImagePick(clientX, clientY);
      return;
    }
    
    if (tool === 'eraser') {
      setElements(prev => prev, false);
      setAction('erasing');
      const element = [...elements].reverse().find(el => !el.locked && isPointInElement(clientX, clientY, el));
      if (element) {
        setElements(elements.filter(el => el.id !== element.id), false);
      }
      return;
    }
    
    if (tool === 'selection') {
      const primary = selectedElement ? (elements.find(el => el.id === selectedElement.id) || selectedElement) : null;

      if (primary && isPointOnRotateHandle(clientX, clientY, primary, zoom)) {
        const base = getElementCenter(primary);
        const baseMouseAngle = Math.atan2(clientY - base.cy, clientX - base.cx);

        const baseIds = selectedElementIds.length > 0 ? selectedElementIds : [primary.id];
        const groupIds = new Set<string>();
        baseIds.forEach(id => {
          const el = elements.find(e => e.id === id);
          if (el?.groupId) groupIds.add(el.groupId);
        });

        const targetIds = new Set<string>(baseIds);
        if (groupIds.size > 0) {
          elements.forEach(el => {
            if (el.groupId && groupIds.has(el.groupId)) targetIds.add(el.id);
          });
        }

        const targets = [...targetIds]
          .map(id => elements.find(el => el.id === id))
          .filter((el): el is ExcalidrawElement => Boolean(el))
          .filter(el => !el.locked && el.type !== 'line' && el.type !== 'arrow')
          .map(el => {
            const c = getElementCenter(el);
            return { id: el.id, cx: c.cx, cy: c.cy, angle: el.angle ?? 0 };
          });

        if (targets.length > 0) {
          setElements(prev => prev, false);
          setAction('rotating');
          rotateStart.current = { mouseAngle: baseMouseAngle, baseCx: base.cx, baseCy: base.cy, targets };
          return;
        }
      }

      if (primary && !primary.locked) {
        const handle = getResizeHandle(clientX, clientY, primary, zoom);
        if (handle) {
          setElements(prev => prev, false);
          setAction('resizing');
          resizeHandle.current = handle;
          const c = getElementCenter(primary);
          resizeOrigin.current = { element: primary, cx: c.cx, cy: c.cy, angle: primary.angle ?? 0 };
          return;
        }
      }

      const element = [...elements].reverse().find(el => isPointInElement(clientX, clientY, el));
      if (element) {
        const isSelected = selectedElementIds.includes(element.id);
        if (e.shiftKey) {
          const nextIds = isSelected
            ? selectedElementIds.filter(id => id !== element.id)
            : [...selectedElementIds, element.id];
          setSelectedElementIds(nextIds);
          setSelectedElement(nextIds.length > 0 ? element : null);
          return;
        }

        const nextIds = isSelected && selectedElementIds.length > 0 ? selectedElementIds : [element.id];
        setSelectedElementIds(nextIds);
        setSelectedElement(element);

        if (!element.locked) {
          setElements(prev => prev, false);
          setAction('moving');
          moveStart.current = { x: clientX, y: clientY };

          const baseIds = nextIds;
          const groupIds = new Set<string>();
          baseIds.forEach(id => {
            const el = elements.find(e => e.id === id);
            if (el?.groupId) groupIds.add(el.groupId);
          });

          const moveIds = new Set<string>(baseIds);
          if (groupIds.size > 0) {
            elements.forEach(el => {
              if (el.groupId && groupIds.has(el.groupId)) moveIds.add(el.id);
            });
          }

          const finalMoveIds = [...moveIds].filter(id => {
            const el = elements.find(e => e.id === id);
            return Boolean(el) && !el!.locked;
          });

          moveOrigin.current = new Map(finalMoveIds.map(id => [id, elements.find(e => e.id === id)!]));
        }
      } else {
        if (!e.shiftKey) {
          setSelectedElement(null);
          setSelectedElementIds([]);
        }
        setAction('selecting');
        selectAdditive.current = e.shiftKey;
        selectStart.current = { x: clientX, y: clientY };
        setSelectionBox({ x1: clientX, y1: clientY, x2: clientX, y2: clientY });
      }
    } else {
      const id = generateId();
      const newElement = createElement(id, clientX, clientY, clientX, clientY, tool, currentStyle);
      // 新建元素时，不要 overwrite，产生一个新的历史记录节点
      setElements((prevState) => [...prevState, newElement], false);
      setSelectedElement(newElement);
      setSelectedElementIds([id]);
      setAction('drawing');
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (textEditing) return;
    if (e.button !== 0) return;
    if (tool !== 'text' && tool !== 'image') return;
    const { clientX, clientY } = getCoordinates(e);
    if (tool === 'text') {
      startNewText(clientX, clientY);
      return;
    }
    if (tool === 'image') {
      handleImagePick(clientX, clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (textEditing) return;
    if (action === 'panning') {
      const dx = e.clientX - dragOffset.current.x;
      const dy = e.clientY - dragOffset.current.y;
      setScroll(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      dragOffset.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const { clientX, clientY } = getCoordinates(e);

    if (action === 'erasing') {
      const element = [...elements].reverse().find(el => !el.locked && isPointInElement(clientX, clientY, el));
      if (element) {
        setElements(elements.filter(el => el.id !== element.id), true);
      }
      return;
    }

    if (action === 'selecting' && selectStart.current) {
      setSelectionBox({ x1: selectStart.current.x, y1: selectStart.current.y, x2: clientX, y2: clientY });
      return;
    }

    if (tool === 'selection' && action === 'moving' && moveStart.current && moveOrigin.current.size > 0) {
      let dx = clientX - moveStart.current.x;
      let dy = clientY - moveStart.current.y;

      const movedIds = new Set<string>([...moveOrigin.current.keys()]);
      const snapEnabled = !e.altKey;
      const primaryId = selectedElement?.id && moveOrigin.current.has(selectedElement.id) ? selectedElement.id : [...moveOrigin.current.keys()][0];
      const primaryOrigin = moveOrigin.current.get(primaryId);

      if (primaryOrigin) {
        const temp: ExcalidrawElement = {
          ...primaryOrigin,
          x1: primaryOrigin.x1 + dx,
          y1: primaryOrigin.y1 + dy,
          x2: primaryOrigin.x2 + dx,
          y2: primaryOrigin.y2 + dy,
          points: primaryOrigin.points ? primaryOrigin.points.map(p => ({ x: p.x + dx, y: p.y + dy })) : undefined,
        };
        const aabb = getAabb(temp);
        const snap = snapMoveDelta(aabb, movedIds, snapEnabled);
        dx += snap.dx;
        dy += snap.dy;
        setGuides({ x: snap.guideX, y: snap.guideY });
      }

      const elementsCopy = [...elements];
      for (let i = 0; i < elementsCopy.length; i++) {
        const el = elementsCopy[i];
        const origin = moveOrigin.current.get(el.id);
        if (!origin) continue;

        const updated: ExcalidrawElement = {
          ...origin,
          x1: origin.x1 + dx,
          y1: origin.y1 + dy,
          x2: origin.x2 + dx,
          y2: origin.y2 + dy,
        };
        if (origin.type === 'freedraw' && origin.points) {
          updated.points = origin.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          elementsCopy[i] = updated;
        } else {
          elementsCopy[i] = createElement(updated.id, updated.x1, updated.y1, updated.x2, updated.y2, updated.type, updated);
        }
      }
      setElements(elementsCopy, true);
      return;
    }

    if (action === 'rotating' && rotateStart.current) {
      const nowAngle = Math.atan2(clientY - rotateStart.current.baseCy, clientX - rotateStart.current.baseCx);
      let delta = nowAngle - rotateStart.current.mouseAngle;
      if (e.shiftKey) {
        const step = Math.PI / 12;
        delta = Math.round(delta / step) * step;
      }

      const targetIds = new Set(rotateStart.current.targets.map(t => t.id));
      const elementsCopy = [...elements];
      for (let i = 0; i < elementsCopy.length; i++) {
        const el = elementsCopy[i];
        if (!targetIds.has(el.id)) continue;
        const target = rotateStart.current.targets.find(t => t.id === el.id);
        if (!target) continue;

        const updated: ExcalidrawElement = { ...el, angle: target.angle + delta };
        if (updated.type === 'freedraw') {
          elementsCopy[i] = updated;
        } else {
          elementsCopy[i] = createElement(updated.id, updated.x1, updated.y1, updated.x2, updated.y2, updated.type, updated);
        }
      }
      setGuides({ x: null, y: null });
      setElements(elementsCopy, true);
      return;
    }

    if (action === 'resizing' && selectedElement && resizeOrigin.current && !resizeOrigin.current.element.locked) {
      const index = elements.findIndex(el => el.id === selectedElement.id);
      if (index === -1) return;
      const element = elements[index];

      const handle = resizeHandle.current;
      if (!handle) return;

      let x1 = resizeOrigin.current.element.x1;
      let y1 = resizeOrigin.current.element.y1;
      let x2 = resizeOrigin.current.element.x2;
      let y2 = resizeOrigin.current.element.y2;

      if (element.type === 'line' || element.type === 'arrow') {
        const snap = snapPoint(clientX, clientY, new Set([element.id]), !e.altKey);
        setGuides({ x: snap.guideX, y: snap.guideY });
        if (handle === 'start') { x1 = snap.x; y1 = snap.y; }
        if (handle === 'end') { x2 = snap.x; y2 = snap.y; }
      } else {
        const local = inverseRotatePoint(clientX, clientY, resizeOrigin.current.cx, resizeOrigin.current.cy, resizeOrigin.current.angle);
        const snap = snapPoint(local.x, local.y, new Set([element.id]), !e.altKey);
        setGuides({ x: snap.guideX, y: snap.guideY });
        if (handle === 'nw') { x1 = snap.x; y1 = snap.y; }
        if (handle === 'ne') { x2 = snap.x; y1 = snap.y; }
        if (handle === 'sw') { x1 = snap.x; y2 = snap.y; }
        if (handle === 'se') { x2 = snap.x; y2 = snap.y; }
      }

      const updatedElement = createElement(element.id, x1, y1, x2, y2, element.type, { ...element, x1, y1, x2, y2 });

      if (element.type === 'freedraw' && element.points && (handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se')) {
        const oldMinX = Math.min(...element.points.map(p => p.x));
        const oldMaxX = Math.max(...element.points.map(p => p.x));
        const oldMinY = Math.min(...element.points.map(p => p.y));
        const oldMaxY = Math.max(...element.points.map(p => p.y));

        const newMinX = Math.min(x1, x2);
        const newMaxX = Math.max(x1, x2);
        const newMinY = Math.min(y1, y2);
        const newMaxY = Math.max(y1, y2);

        const scaleX = (newMaxX - newMinX) / (oldMaxX - oldMinX || 1);
        const scaleY = (newMaxY - newMinY) / (oldMaxY - oldMinY || 1);
        updatedElement.points = element.points.map(p => ({
          x: newMinX + (p.x - oldMinX) * scaleX,
          y: newMinY + (p.y - oldMinY) * scaleY
        }));
      }

      const elementsCopy = [...elements];
      elementsCopy[index] = element.type === 'freedraw' ? { ...element, ...updatedElement, roughElement: undefined } : updatedElement;
      setElements(elementsCopy, true);
      setSelectedElement(elementsCopy[index]);
      return;
    }

    if (action === 'drawing') {
      const index = elements.length - 1;
      const element = elements[index];
      if (!element) return;

      const snap = snapPoint(clientX, clientY, new Set([element.id]), !e.altKey);
      setGuides({ x: snap.guideX, y: snap.guideY });

      if (tool === 'freedraw') {
        const newPoints = [...(element.points || []), { x: snap.x, y: snap.y }];
        const updatedElement = { ...element, points: newPoints };
        const elementsCopy = [...elements];
        elementsCopy[index] = updatedElement;
        setElements(elementsCopy, true);
      } else {
        if (tool === 'text' || tool === 'image') return;
        const updatedElement = createElement(
          element.id,
          element.x1,
          element.y1,
          snap.x,
          snap.y,
          tool,
          { ...currentStyle, angle: element.angle ?? 0, groupId: element.groupId ?? null, locked: element.locked ?? false }
        );
        const elementsCopy = [...elements];
        elementsCopy[index] = updatedElement;
        setElements(elementsCopy, true);
      }
    }
  };

  const handleMouseUp = () => {
    if (action === 'selecting' && selectionBox) {
      const minX = Math.min(selectionBox.x1, selectionBox.x2);
      const maxX = Math.max(selectionBox.x1, selectionBox.x2);
      const minY = Math.min(selectionBox.y1, selectionBox.y2);
      const maxY = Math.max(selectionBox.y1, selectionBox.y2);

      const hitIds = elements
        .filter(el => {
          const b = getAabb(el);
          return b.maxX >= minX && b.minX <= maxX && b.maxY >= minY && b.minY <= maxY;
        })
        .map(el => el.id);

      const nextIds = selectAdditive.current
        ? Array.from(new Set([...selectedElementIds, ...hitIds]))
        : hitIds;

      setSelectedElementIds(nextIds);
      const lastId = nextIds.length > 0 ? nextIds[nextIds.length - 1] : null;
      const last = lastId ? (elements.find(el => el.id === lastId) || null) : null;
      setSelectedElement(last);

      setSelectionBox(null);
      selectStart.current = null;
      selectAdditive.current = false;
      setGuides({ x: null, y: null });
      setAction('idle');
      return;
    }

    if (action === 'drawing' || action === 'resizing') {
      const targetId = action === 'resizing' && selectedElement ? selectedElement.id : elements[elements.length - 1]?.id;
      const targetIndex = elements.findIndex(el => el.id === targetId);

      if (targetIndex !== -1) {
        const element = elements[targetIndex];
        if (element.type === 'rectangle' || element.type === 'ellipse' || element.type === 'diamond') {
          const minX = Math.min(element.x1, element.x2);
          const maxX = Math.max(element.x1, element.x2);
          const minY = Math.min(element.y1, element.y2);
          const maxY = Math.max(element.y1, element.y2);

          const finalElement = createElement(element.id, minX, minY, maxX, maxY, element.type, { ...element, x1: minX, y1: minY, x2: maxX, y2: maxY });
          const elementsCopy = [...elements];
          elementsCopy[targetIndex] = finalElement;
          setElements(elementsCopy, true);
          if (selectedElement?.id === finalElement.id) {
            setSelectedElement(finalElement);
          }
        }
      }
    }

    if (action === 'panning' || action === 'erasing') {
      setAction('idle');
      setGuides({ x: null, y: null });
      return;
    }

    setGuides({ x: null, y: null });
    setAction('idle');
    resizeHandle.current = null;
    moveStart.current = null;
    moveOrigin.current = new Map();
    rotateStart.current = null;
    resizeOrigin.current = null;
    setSelectionBox(null);
    selectStart.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (textEditing) return;
    if (tool !== 'selection') return;
    const { clientX, clientY } = getCoordinates(e);
    const element = [...elements].reverse().find(el => isPointInElement(clientX, clientY, el));
    if (!element) return;
    if (element.type !== 'text') return;
    if (element.locked) return;
    startEditText(element);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        width={windowSize.w}
        height={windowSize.h}
        onMouseDown={handleMouseDown}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: tool === 'selection' ? 'default' : tool === 'hand' || action === 'panning' ? 'grab' : tool === 'eraser' ? 'crosshair' : 'crosshair', display: 'block' }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        style={{ display: 'none' }}
      />
      {textEditing && (() => {
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        if (!rect) return null;
        const left = rect.left + scroll.x + textEditing.x1 * zoom;
        const top = rect.top + scroll.y + textEditing.y1 * zoom;
        const width = Math.max(40, (textEditing.x2 - textEditing.x1) * zoom);
        const height = Math.max(24, (textEditing.y2 - textEditing.y1) * zoom);
        return (
          <textarea
            autoFocus
            value={textEditing.value}
            onChange={(ev) => setTextEditing(prev => prev ? { ...prev, value: ev.target.value } : prev)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' && !ev.shiftKey) {
                ev.preventDefault();
                skipTextBlurCommit.current = true;
                commitText();
              } else if (ev.key === 'Escape') {
                ev.preventDefault();
                cancelText();
              }
            }}
            onBlur={() => {
              if (skipTextBlurCommit.current) {
                skipTextBlurCommit.current = false;
                return;
              }
              commitText();
            }}
            style={{
              position: 'fixed',
              left,
              top,
              width,
              height,
              resize: 'none',
              outline: 'none',
              border: `1px solid var(--border-color)`,
              borderRadius: '6px',
              padding: '6px 8px',
              backgroundColor: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              fontSize: `${textEditing.fontSize * zoom}px`,
              fontFamily: textEditing.fontFamily,
              lineHeight: `${textEditing.fontSize * 1.2 * zoom}px`,
              boxShadow: 'var(--shadow-color) 0 4px 6px',
              zIndex: 20,
            }}
          />
        );
      })()}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--panel-bg)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-color) 0 4px 6px',
        border: '1px solid var(--border-color)',
        zIndex: 10,
      }}>
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>-</button>
        <span style={{ fontSize: '14px', width: '45px', textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>+</button>
      </div>
    </>
  );
});
