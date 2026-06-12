import React from 'react';
import type { ElementStyle } from '../types';

interface StylePanelProps {
  currentStyle: ElementStyle;
  onChange: (newStyle: Partial<ElementStyle>) => void;
  selectionCount?: number;
  onGroup?: () => void;
  onUngroup?: () => void;
  onToggleLock?: () => void;
}

export const StylePanel: React.FC<StylePanelProps> = ({ currentStyle, onChange, selectionCount = 0, onGroup, onUngroup, onToggleLock }) => {
  const colors = [
    '#000000', // Black
    '#e03131', // Red
    '#2f9e44', // Green
    '#1971c2', // Blue
    '#f08c00', // Orange
    '#9c36b5', // Purple
  ];

  const bgColors = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#eebefa'];

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '20px',
      backgroundColor: 'var(--panel-bg)',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: 'var(--shadow-color) 0 4px 6px',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 10,
      width: '200px',
    }}>
      {selectionCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>选中操作</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onToggleLock?.()}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              锁定/解锁
            </button>
            <button
              onClick={() => onUngroup?.()}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              取消组合
            </button>
          </div>
          <button
            onClick={() => onGroup?.()}
            disabled={selectionCount < 2}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: selectionCount < 2 ? 'transparent' : 'var(--active-bg)',
              color: selectionCount < 2 ? 'var(--text-secondary)' : 'var(--active-color)',
              cursor: selectionCount < 2 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: selectionCount < 2 ? 0.6 : 1,
            }}
          >
            组合 (Ctrl+G)
          </button>
        </div>
      )}

      {/* 描边颜色 */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>描边颜色</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {colors.map(color => (
            <button
              key={color}
              onClick={() => onChange({ strokeColor: color })}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: color,
                border: currentStyle.strokeColor === color ? '2px solid var(--active-color)' : '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>

      {/* 填充颜色 */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>背景颜色</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {bgColors.map(color => (
            <button
              key={color}
              onClick={() => onChange({ backgroundColor: color })}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: color === 'transparent' ? 'var(--hover-bg)' : color,
                border: currentStyle.backgroundColor === color ? '2px solid var(--active-color)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {color === 'transparent' && (
                <div style={{
                  position: 'absolute',
                  width: '141%',
                  height: '1px',
                  backgroundColor: '#ef4444',
                  transform: 'rotate(45deg)',
                  top: '10px',
                  left: '-4px'
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 粗细 */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>粗细</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 3, 5].map(width => (
            <button
              key={width}
              onClick={() => onChange({ strokeWidth: width })}
              style={{
                flex: 1,
                height: '32px',
                borderRadius: '4px',
                border: currentStyle.strokeWidth === width ? '2px solid var(--active-color)' : '1px solid var(--border-color)',
                backgroundColor: currentStyle.strokeWidth === width ? 'var(--active-bg)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ width: '60%', height: `${width}px`, backgroundColor: 'var(--text-primary)', borderRadius: '2px' }} />
            </button>
          ))}
        </div>
      </div>

      {/* 填充样式 */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>填充样式</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['hachure', 'solid', 'cross-hatch'].map(style => (
            <button
              key={style}
              onClick={() => onChange({ fillStyle: style as ElementStyle['fillStyle'] })}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: '12px',
                borderRadius: '4px',
                border: currentStyle.fillStyle === style ? '2px solid var(--active-color)' : '1px solid var(--border-color)',
                backgroundColor: currentStyle.fillStyle === style ? 'var(--active-bg)' : 'transparent',
                color: currentStyle.fillStyle === style ? 'var(--active-color)' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {style === 'hachure' ? '线条' : style === 'solid' ? '实心' : '网格'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
