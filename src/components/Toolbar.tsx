import React from 'react';
import { 
  MousePointer2, 
  Hand,
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  Pencil,
  Type,
  ImagePlus,
  Undo2,
  Redo2,
  Trash2,
  Image as ImageIcon,
  FileCode2,
  Diamond,
  Eraser,
  Moon,
  Sun
} from 'lucide-react';
import type { ElementType, Theme } from '../types';

interface ToolbarProps {
  tool: ElementType;
  setTool: (tool: ElementType) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPng: () => void;
  onExportSvg: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  tool, 
  setTool, 
  undo, 
  redo, 
  clearCanvas, 
  canUndo, 
  canRedo,
  onExportPng,
  onExportSvg,
  theme,
  toggleTheme
}) => {
  const tools: { id: ElementType; icon: React.ReactNode; label: string }[] = [
    { id: 'selection', icon: <MousePointer2 size={20} />, label: '选择 (Selection)' },
    { id: 'hand', icon: <Hand size={20} />, label: '拖拽画布 (Pan)' },
    { id: 'rectangle', icon: <Square size={20} />, label: '矩形 (Rectangle)' },
    { id: 'diamond', icon: <Diamond size={20} />, label: '菱形 (Diamond)' },
    { id: 'ellipse', icon: <Circle size={20} />, label: '椭圆 (Ellipse)' },
    { id: 'line', icon: <Minus size={20} />, label: '线条 (Line)' },
    { id: 'arrow', icon: <ArrowRight size={20} />, label: '箭头 (Arrow)' },
    { id: 'freedraw', icon: <Pencil size={20} />, label: '自由绘制 (Free Draw)' },
    { id: 'text', icon: <Type size={20} />, label: '文本 (Text)' },
    { id: 'image', icon: <ImagePlus size={20} />, label: '插入图片 (Image)' },
    { id: 'eraser', icon: <Eraser size={20} />, label: '橡皮擦 (Eraser)' },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '20px',
      zIndex: 10,
    }}>
      {/* 绘图工具组 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'var(--panel-bg)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-color) 0 4px 6px',
        border: '1px solid var(--border-color)',
      }}>
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: tool === t.id ? 'var(--active-bg)' : 'transparent',
              color: tool === t.id ? 'var(--active-color)' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* 历史操作组 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'var(--panel-bg)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-color) 0 4px 6px',
        border: '1px solid var(--border-color)',
      }}>
        <button
          onClick={undo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: canUndo ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            opacity: canUndo ? 1 : 0.5,
          }}
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="重做 (Ctrl+Shift+Z)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: canRedo ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            opacity: canRedo ? 1 : 0.5,
          }}
        >
          <Redo2 size={20} />
        </button>
        <button
          onClick={clearCanvas}
          title="清空画布"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#ef4444', // 红色图标警告
            cursor: 'pointer',
          }}
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* 导出工具与主题切换组 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'var(--panel-bg)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-color) 0 4px 6px',
        border: '1px solid var(--border-color)',
      }}>
        <button
          onClick={onExportPng}
          title="导出为 PNG"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <ImageIcon size={20} />
        </button>
        <button
          onClick={onExportSvg}
          title="导出为 SVG"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <FileCode2 size={20} />
        </button>
        <div style={{ width: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? '切换暗黑模式' : '切换日间模式'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </div>
  );
};
