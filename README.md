# jot

一个轻量的 Excalidraw-like 白板应用（Canvas + Rough.js 风格），支持常见图形绘制、选择与编辑、暗黑模式、导出等能力。

仓库地址：https://github.com/fiioz/jot

## 功能特性

- 基础绘制：矩形 / 椭圆 / 直线 / 箭头 / 菱形 / 自由画笔
- 交互编辑：选择、拖拽移动、缩放、旋转
- 多选与框选：Shift 多选、框选选择区域
- 组合与锁定：Group / Ungroup、锁定元素防误触
- 画布视口：平移与缩放（无限画布体验）
- 文本与图片：文本输入、插入本地图片
- 辅助对齐：吸附与参考线（Alt 临时关闭）
- 历史记录：Undo / Redo
- 导出：PNG / SVG
- 主题：暗黑模式

## 本地开发

需要 Node.js（建议使用较新的 LTS 版本）。

```bash
npm install
npm run dev
```

构建与预览：

```bash
npm run build
npm run preview
```

代码检查：

```bash
npm run lint
```

## 常用快捷键

- Undo：Ctrl/Cmd + Z
- Redo：Ctrl/Cmd + Shift + Z
- Group：Ctrl/Cmd + G
- Ungroup：Ctrl/Cmd + Shift + G
- Lock/Unlock：Ctrl/Cmd + L
- 清空选择：Esc

## 技术栈

- React + TypeScript
- Vite
- HTML Canvas 2D
- roughjs（手绘风格渲染）

## License

MIT，详见 [LICENSE](./LICENSE)。

## 致谢

- 灵感来源：Excalidraw
- 渲染风格：roughjs
