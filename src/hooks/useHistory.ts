import { useState } from 'react';
import type { ExcalidrawElement } from '../types';

export const useHistory = (initialState: ExcalidrawElement[]) => {
  const [history, setHistory] = useState<ExcalidrawElement[][]>([initialState]);
  const [index, setIndex] = useState(0);

  const setState = (
    action: ExcalidrawElement[] | ((current: ExcalidrawElement[]) => ExcalidrawElement[]),
    overwrite = false
  ) => {
    const newState = typeof action === 'function' ? action(history[index]) : action;

    if (overwrite) {
      // 覆盖当前步骤（例如在拖拽过程中，不断更新当前这一步，而不是新增）
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      // 新增步骤（例如鼠标按下开始绘制新图形时，丢弃当前步骤之后的历史，追加新步骤）
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, newState]);
      setIndex(updatedState.length);
    }
  };

  const undo = () => {
    if (index > 0) {
      setIndex((prevState) => prevState - 1);
    }
  };

  const redo = () => {
    if (index < history.length - 1) {
      setIndex((prevState) => prevState + 1);
    }
  };

  const clearHistory = (emptyState: ExcalidrawElement[] = []) => {
    setHistory([emptyState]);
    setIndex(0);
  };

  return {
    elements: history[index],
    setElements: setState,
    undo,
    redo,
    clearHistory,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
};
