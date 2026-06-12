import rough from 'roughjs';
import type { ExcalidrawElement, ElementType, ElementStyle } from '../types';

// 初始化 rough generator
const generator = rough.generator();

const imageCache = new Map<string, HTMLImageElement>();

const getCssVarColor = (name: string) => {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || null;
  } catch {
    return null;
  }
};

const getAutoTextColor = (preferred: string) => {
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark' && preferred.toLowerCase() === '#000000') {
    return getCssVarColor('--text-primary') || '#e5e7eb';
  }
  return preferred;
};

export const getElementBounds = (element: ExcalidrawElement) => {
  let minX = Math.min(element.x1, element.x2);
  let maxX = Math.max(element.x1, element.x2);
  let minY = Math.min(element.y1, element.y2);
  let maxY = Math.max(element.y1, element.y2);

  if (element.type === 'freedraw' && element.points && element.points.length > 0) {
    minX = Math.min(...element.points.map(p => p.x));
    maxX = Math.max(...element.points.map(p => p.x));
    minY = Math.min(...element.points.map(p => p.y));
    maxY = Math.max(...element.points.map(p => p.y));
  }

  return { minX, maxX, minY, maxY };
};

export const getElementCenter = (element: ExcalidrawElement) => {
  const { minX, maxX, minY, maxY } = getElementBounds(element);
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};

export const rotatePoint = (x: number, y: number, cx: number, cy: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
};

export const inverseRotatePoint = (x: number, y: number, cx: number, cy: number, angle: number) => {
  return rotatePoint(x, y, cx, cy, -angle);
};

// 生成粗糙样式的元素
export const createElement = (
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: ElementType,
  style: (ElementStyle & Partial<ExcalidrawElement>) = {
    strokeColor: '#000000',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    roughness: 1
  }
): ExcalidrawElement => {
  let roughElement;
  const { roughElement: roughElementIgnored, ...styleWithoutRoughElement } = (style ?? {}) as (ElementStyle & Partial<ExcalidrawElement> & { roughElement?: unknown });
  void roughElementIgnored;
  const options = {
    stroke: styleWithoutRoughElement.strokeColor,
    fill: styleWithoutRoughElement.backgroundColor === 'transparent' ? undefined : styleWithoutRoughElement.backgroundColor,
    fillStyle: styleWithoutRoughElement.fillStyle,
    strokeWidth: styleWithoutRoughElement.strokeWidth,
    roughness: styleWithoutRoughElement.roughness
  };

  switch (type) {
    case 'line':
      roughElement = generator.line(x1, y1, x2, y2, options);
      break;
    case 'arrow': {
      // 计算箭头两边的坐标
      const arrowLength = 20; // 箭头长度
      const arrowAngle = Math.PI / 6; // 箭头展开的角度 (30度)
      const angle = Math.atan2(y2 - y1, x2 - x1); // 主线的角度
      
      // 箭头的左边线条终点
      const leftX = x2 - arrowLength * Math.cos(angle - arrowAngle);
      const leftY = y2 - arrowLength * Math.sin(angle - arrowAngle);
      
      // 箭头的右边线条终点
      const rightX = x2 - arrowLength * Math.cos(angle + arrowAngle);
      const rightY = y2 - arrowLength * Math.sin(angle + arrowAngle);

      // 箭头由三条线组成：主线、左侧短线、右侧短线
      // 我们通过一个线性路径组 (linearPath) 将它们连接起来以形成连贯的手绘效果
      roughElement = generator.linearPath([
        [x1, y1], // 起点
        [x2, y2], // 终点
        [leftX, leftY], // 左箭头
        [x2, y2], // 回到终点
        [rightX, rightY] // 右箭头
      ], options);
      break;
    }
    case 'rectangle':
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1, options);
      break;
    case 'diamond': {
      const midX = x1 + (x2 - x1) / 2;
      const midY = y1 + (y2 - y1) / 2;
      roughElement = generator.polygon([
        [midX, y1],
        [x2, midY],
        [midX, y2],
        [x1, midY]
      ], options);
      break;
    }
    case 'ellipse': {
      // roughjs 的 ellipse 需要中心点和宽高
      const centerX = x1 + (x2 - x1) / 2;
      const centerY = y1 + (y2 - y1) / 2;
      roughElement = generator.ellipse(centerX, centerY, x2 - x1, y2 - y1, options);
      break;
    }
    case 'freedraw':
      // 自由绘制不在这里直接生成 roughElement，而是通过 points 绘制
      return {
        id,
        type,
        x1,
        y1,
        x2,
        y2,
        points: [{ x: x1, y: y1 }],
        angle: styleWithoutRoughElement.angle ?? 0,
        groupId: styleWithoutRoughElement.groupId ?? null,
        locked: styleWithoutRoughElement.locked ?? false,
        ...styleWithoutRoughElement,
      };
    case 'text': {
      const text = styleWithoutRoughElement.text ?? '';
      const fontSize = styleWithoutRoughElement.fontSize ?? 24;
      const fontFamily = styleWithoutRoughElement.fontFamily ?? 'Arial';
      const width = Math.max(1, x2 - x1);
      const height = Math.max(1, y2 - y1);
      return {
        id,
        type,
        x1,
        y1,
        x2: x1 + width,
        y2: y1 + height,
        text,
        fontSize,
        fontFamily,
        angle: styleWithoutRoughElement.angle ?? 0,
        groupId: styleWithoutRoughElement.groupId ?? null,
        locked: styleWithoutRoughElement.locked ?? false,
        ...styleWithoutRoughElement,
      };
    }
    case 'image': {
      const imageSrc = styleWithoutRoughElement.imageSrc ?? '';
      const width = Math.max(1, x2 - x1);
      const height = Math.max(1, y2 - y1);
      return {
        id,
        type,
        x1,
        y1,
        x2: x1 + width,
        y2: y1 + height,
        imageSrc,
        angle: styleWithoutRoughElement.angle ?? 0,
        groupId: styleWithoutRoughElement.groupId ?? null,
        locked: styleWithoutRoughElement.locked ?? false,
        ...styleWithoutRoughElement,
      };
    }
    default:
      // selection 等其他类型，不需要绘制
      break;
  }
  return {
    ...styleWithoutRoughElement,
    id,
    type,
    x1,
    y1,
    x2,
    y2,
    roughElement,
    angle: styleWithoutRoughElement.angle ?? 0,
    groupId: styleWithoutRoughElement.groupId ?? null,
    locked: styleWithoutRoughElement.locked ?? false,
  };
};

// 在画布上绘制所有元素
export const drawElements = (
  canvas: HTMLCanvasElement,
  elements: ExcalidrawElement[],
  scrollX: number = 0,
  scrollY: number = 0,
  selected: ExcalidrawElement | ExcalidrawElement[] | null = null,
  zoom: number = 1,
  guides: { x: number | null; y: number | null } | null = null,
  selectionBox: { x1: number; y1: number; x2: number; y2: number } | null = null
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const selectedElements = Array.isArray(selected) ? selected : selected ? [selected] : [];

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 保存当前状态并平移画布
  ctx.save();
  ctx.translate(scrollX, scrollY);
  ctx.scale(zoom, zoom);

  const rc = rough.canvas(canvas);

  elements.forEach((element) => {
    const angle = element.angle ?? 0;
    ctx.save();
    if (angle !== 0 && element.type !== 'line' && element.type !== 'arrow') {
      const { cx, cy } = getElementCenter(element);
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
    }

    if (element.type === 'freedraw' && element.points) {
      // 绘制自由线条
      ctx.beginPath();
      ctx.moveTo(element.points[0].x, element.points[0].y);
      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x, element.points[i].y);
      }
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.stroke();
    } else if (element.type === 'text') {
      const fontSize = element.fontSize ?? 24;
      const fontFamily = element.fontFamily ?? 'Arial';
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = getAutoTextColor(element.strokeColor);
      ctx.fillText(element.text ?? '', element.x1, element.y1);
    } else if (element.type === 'image' && element.imageSrc) {
      const src = element.imageSrc;
      let img = imageCache.get(src);
      if (!img) {
        img = new Image();
        img.src = src;
        imageCache.set(src, img);
        img.onload = () => {
          requestAnimationFrame(() => {
            drawElements(canvas, elements, scrollX, scrollY, selected, zoom, guides, selectionBox);
          });
        };
      }
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1);
      }
    } else if (element.roughElement) {
      // 绘制带手绘风格的几何图形
      rc.draw(element.roughElement);
    }
    ctx.restore();
  });

  if (guides && (guides.x !== null || guides.y !== null)) {
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    if (guides.x !== null) {
      ctx.beginPath();
      ctx.moveTo(guides.x, -100000);
      ctx.lineTo(guides.x, 100000);
      ctx.stroke();
    }
    if (guides.y !== null) {
      ctx.beginPath();
      ctx.moveTo(-100000, guides.y);
      ctx.lineTo(100000, guides.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (selectionBox) {
    const minX = Math.min(selectionBox.x1, selectionBox.x2);
    const maxX = Math.max(selectionBox.x1, selectionBox.x2);
    const minY = Math.min(selectionBox.y1, selectionBox.y2);
    const maxY = Math.max(selectionBox.y1, selectionBox.y2);
    ctx.save();
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.restore();
  }

  if (selectedElements.length > 0) {
    selectedElements.forEach((el) => drawSelectionBox(ctx, el, zoom));
  }

  // 恢复画布状态
  ctx.restore();
};

export const drawSelectionBox = (
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  zoom: number = 1
) => {
  const { type } = element;
  const { minX: rawMinX, maxX: rawMaxX, minY: rawMinY, maxY: rawMaxY } = getElementBounds(element);
  const margin = 8;
  const minX = rawMinX - margin;
  const maxX = rawMaxX + margin;
  const minY = rawMinY - margin;
  const maxY = rawMaxY + margin;
  const angle = element.angle ?? 0;
  const { cx, cy } = getElementCenter(element);

  ctx.save();
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  if (angle !== 0 && type !== 'line' && type !== 'arrow') {
    const corners = [
      rotatePoint(minX, minY, cx, cy, angle),
      rotatePoint(maxX, minY, cx, cy, angle),
      rotatePoint(maxX, maxY, cx, cy, angle),
      rotatePoint(minX, maxY, cx, cy, angle),
    ];
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  }

  // 绘制控制点 (Handles)
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  const handleSize = 8 / zoom;
  const handles: { x: number; y: number; id: string }[] = (type === 'line' || type === 'arrow')
    ? [
      { x: element.x1, y: element.y1, id: 'start' },
      { x: element.x2, y: element.y2, id: 'end' },
    ]
    : (() => {
      const base = [
        { x: minX, y: minY, id: 'nw' },
        { x: maxX, y: minY, id: 'ne' },
        { x: minX, y: maxY, id: 'sw' },
        { x: maxX, y: maxY, id: 'se' },
      ];
      return angle !== 0
        ? base.map(h => ({ ...rotatePoint(h.x, h.y, cx, cy, angle), id: h.id }))
        : base;
    })();

  handles.forEach(handle => {
    ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
  });

  if (!element.locked && type !== 'line' && type !== 'arrow') {
    const rotateHandleDistance = 28 / zoom;
    const topMiddle = { x: (minX + maxX) / 2, y: minY };
    const topMiddleWorld = angle !== 0 ? rotatePoint(topMiddle.x, topMiddle.y, cx, cy, angle) : topMiddle;
    const rotateHandleBase = { x: (minX + maxX) / 2, y: minY - rotateHandleDistance };
    const rotateHandleWorld = angle !== 0 ? rotatePoint(rotateHandleBase.x, rotateHandleBase.y, cx, cy, angle) : rotateHandleBase;
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(topMiddleWorld.x, topMiddleWorld.y);
    ctx.lineTo(rotateHandleWorld.x, rotateHandleWorld.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(rotateHandleWorld.x, rotateHandleWorld.y, 6 / zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};

export const getResizeHandle = (x: number, y: number, element: ExcalidrawElement, zoom: number = 1): string | null => {
  const { type } = element;
  const { minX: rawMinX, maxX: rawMaxX, minY: rawMinY, maxY: rawMaxY } = getElementBounds(element);
  const margin = 8;
  const minX = rawMinX - margin;
  const maxX = rawMaxX + margin;
  const minY = rawMinY - margin;
  const maxY = rawMaxY + margin;
  const angle = element.angle ?? 0;
  const { cx, cy } = getElementCenter(element);

  const handleSize = 8 / zoom;
  const isInside = (hx: number, hy: number) => {
    return Math.abs(x - hx) <= handleSize && Math.abs(y - hy) <= handleSize;
  };

  if (type === 'line' || type === 'arrow') {
    if (isInside(element.x1, element.y1)) return 'start';
    if (isInside(element.x2, element.y2)) return 'end';
  } else {
    const base = [
      { x: minX, y: minY, id: 'nw' },
      { x: maxX, y: minY, id: 'ne' },
      { x: minX, y: maxY, id: 'sw' },
      { x: maxX, y: maxY, id: 'se' },
    ];
    const handles = angle !== 0
      ? base.map(h => ({ ...rotatePoint(h.x, h.y, cx, cy, angle), id: h.id }))
      : base;
    for (const h of handles) {
      if (isInside(h.x, h.y)) return h.id;
    }
  }
  return null;
};

export const isPointOnRotateHandle = (x: number, y: number, element: ExcalidrawElement, zoom: number = 1): boolean => {
  if (element.locked) return false;
  if (element.type === 'line' || element.type === 'arrow') return false;
  const { minX: rawMinX, maxX: rawMaxX, minY: rawMinY } = getElementBounds(element);
  const margin = 8;
  const minX = rawMinX - margin;
  const maxX = rawMaxX + margin;
  const minY = rawMinY - margin;
  const angle = element.angle ?? 0;
  const { cx, cy } = getElementCenter(element);
  const rotateHandleDistance = 28 / zoom;
  const base = { x: (minX + maxX) / 2, y: minY - rotateHandleDistance };
  const pos = angle !== 0 ? rotatePoint(base.x, base.y, cx, cy, angle) : base;
  const r = 8 / zoom;
  const dx = x - pos.x;
  const dy = y - pos.y;
  return dx * dx + dy * dy <= r * r;
};

// 导出为 PNG
export const exportToPng = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  
  // 简单导出整个画布视口
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `excalidraw-export-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};

// 导出为 SVG
export const exportToSvg = (elements: ExcalidrawElement[], width: number, height: number) => {
  // 创建一个隐藏的 SVG 节点
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  // 加上白色背景
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#fdfdfd');
  svg.appendChild(bg);

  const rs = rough.svg(svg);

  elements.forEach(element => {
    if (element.type === 'freedraw' && element.points && element.points.length > 0) {
      // 自由绘制线条转化为 SVG path
      let d = `M ${element.points[0].x} ${element.points[0].y} `;
      for (let i = 1; i < element.points.length; i++) {
        d += `L ${element.points[i].x} ${element.points[i].y} `;
      }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', element.strokeColor);
      path.setAttribute('stroke-width', element.strokeWidth.toString());
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
    } else if (element.type === 'text') {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const fontSize = element.fontSize ?? 24;
      const fontFamily = element.fontFamily ?? 'Arial';
      text.setAttribute('x', element.x1.toString());
      text.setAttribute('y', element.y1.toString());
      text.setAttribute('fill', element.strokeColor);
      text.setAttribute('font-size', fontSize.toString());
      text.setAttribute('font-family', fontFamily);
      text.setAttribute('dominant-baseline', 'hanging');
      text.textContent = element.text ?? '';
      const angle = element.angle ?? 0;
      if (angle !== 0) {
        const { cx, cy } = getElementCenter(element);
        text.setAttribute('transform', `rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`);
      }
      svg.appendChild(text);
    } else if (element.type === 'image' && element.imageSrc) {
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('x', element.x1.toString());
      img.setAttribute('y', element.y1.toString());
      img.setAttribute('width', (element.x2 - element.x1).toString());
      img.setAttribute('height', (element.y2 - element.y1).toString());
      img.setAttribute('href', element.imageSrc);
      const angle = element.angle ?? 0;
      if (angle !== 0) {
        const { cx, cy } = getElementCenter(element);
        img.setAttribute('transform', `rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`);
      }
      svg.appendChild(img);
    } else if (element.roughElement) {
      const svgNode = rs.draw(element.roughElement);
      svg.appendChild(svgNode);
    }
  });

  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `excalidraw-export-${Date.now()}.svg`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

// 判断点是否在图形内（简化版，用于选中图形）
export const isPointInElement = (x: number, y: number, element: ExcalidrawElement): boolean => {
  const angle = element.angle ?? 0;
  const { cx, cy } = getElementCenter(element);
  const p = angle !== 0 && element.type !== 'line' && element.type !== 'arrow'
    ? inverseRotatePoint(x, y, cx, cy, angle)
    : { x, y };

  const { minX, maxX, minY, maxY } = getElementBounds(element);
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
};
