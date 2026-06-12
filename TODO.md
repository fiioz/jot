# Excalidraw 克隆项目功能对比与待办清单

本列表对比了当前项目与原版 Excalidraw 之间的功能差距，并记录了后续待开发的特性。

## 1. 基础图形与绘制工具
- [x] 选择工具 (Selection)
- [x] 拖拽画布 (Pan)
- [x] 矩形 (Rectangle)
- [x] 椭圆 (Ellipse)
- [x] 线条 (Line)
- [x] 箭头 (Arrow)
- [x] 自由绘制 (Free Draw)
- [x] 文本输入 (Text)
- [x] 菱形 (Diamond)
- [x] 插入图片 (Image)
- [x] 擦除工具 / 橡皮擦 (Eraser)

## 2. 画布交互与视角控制
- [x] 画布无极平移 (Pan / Scroll)
- [x] 鼠标/触控板滚动平移
- [x] 元素选中与单体拖拽移动
- [x] 画布缩放 (Zoom In / Zoom Out)
- [x] 元素大小调整 (Resize - 通过控制点缩放)
- [x] 元素旋转 (Rotate)
- [x] 框选多个元素 (Multi-selection)
- [x] 多元素组合 (Group / Ungroup)
- [x] 对齐与对齐参考线 (Snapping & Guides)
- [x] 锁定元素 (Lock element)

## 3. 元素样式与属性
- [x] 默认的 RoughJS 手绘风格渲染
- [x] 描边颜色 (Stroke color)
- [x] 填充颜色 (Background color)
- [x] 填充样式 (Hachure, Solid, Cross-hatch 等)
- [x] 描边宽度 (Stroke width)
- [ ] 描边样式 (Solid, Dashed, Dotted)
- [ ] 边角样式 (Sharp, Round)
- [ ] 透明度调整 (Opacity)
- [ ] 图层层级调整 (Bring forward, Send backward 等)

## 4. 历史记录与状态管理
- [x] 撤销 (Undo)
- [x] 重做 (Redo)
- [x] 本地持久化存储 (LocalStorage)
- [x] 清空画布 (Clear canvas)

## 5. 导入与导出
- [x] 导出为 PNG
- [x] 导出为 SVG
- [ ] 导出为剪贴板 (Copy to clipboard)
- [ ] 导出为 Excalidraw 专有格式 (.excalidraw)
- [ ] 从文件或剪贴板导入

## 6. 协作与高级特性
- [ ] 多人实时协作 (Live Collaboration)
- [ ] 只读模式 (View-only mode)
- [x] 暗黑模式切换 (Dark mode)
- [ ] 素材库 (Library / Templates)
- [ ] 快捷键支持 (Keyboard shortcuts)

## 7. 性能与底层优化
- [x] 窗口自适应调整 (Resize Listener)
- [x] 相对坐标与绝对坐标计算机制
- [ ] Canvas 渲染性能优化 (使用离屏 Canvas 或只重绘可视区域)
- [ ] Hit-test 算法优化 (更精确的曲线与多边形碰撞检测)
