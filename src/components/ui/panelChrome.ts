import { createContext, type ReactNode } from 'react';

/**
 * Panel 头部最左侧的插槽。
 * 看板用它注入拖拽手柄，这样卡片组件本身完全不需要知道拖拽的存在。
 */
export const PanelGripContext = createContext<ReactNode>(null);
