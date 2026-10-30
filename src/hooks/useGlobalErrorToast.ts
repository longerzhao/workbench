import { useEffect } from 'react';
import { toast } from '@/app/store/toast';

/**
 * 全局错误兜底：把「渲染异常之外」的失败也变成一句人话。
 *
 * ErrorBoundary 只能接住 React 渲染期抛出的异常。事件处理器里的异步错误、
 * 被遗忘的 Promise 拒绝、第三方回调里的异常，都会直接进到 window 的错误事件里，
 * 悄无声息——用户只看到界面「没反应」，开发者也只能去翻控制台。
 *
 * 这里统一拦一层，给出提示并在控制台保留原始错误，方便定位。
 */
export function useGlobalErrorToast(): void {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error('[workbench] 未捕获错误', event.error ?? event.message);
      toast('出了点问题，操作没有生效，请重试', 'danger', 6);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      console.error('[workbench] 未处理的 Promise 拒绝', event.reason);
      toast('出了点问题，操作没有生效，请重试', 'danger', 6);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
}
