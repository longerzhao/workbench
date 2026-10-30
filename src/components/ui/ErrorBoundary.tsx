import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 路由级错误边界。
 *
 * 懒加载的页面 chunk 拿不到时，React 会把异常抛到这里。没有边界的话整页只剩
 * 一句 "Unexpected Application Error!"，用户既看不懂也不知道该怎么办。
 *
 * 这里给出人话说明和一个「重新加载」按钮：绝大多数情况下只是版本过期了，
 * 刷新一下就能拿到新版本。
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[workbench] 页面渲染失败', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid h-full place-items-center p-6">
        <div className="card w-full max-w-md px-6 py-8 text-center">
          <h1 className="text-base font-semibold text-ink">这个页面没能加载出来</h1>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
            多半是刚刚发布了新版本，浏览器里还留着旧的文件。刷新一下就好，
            你的数据都保存在本地，不会因此丢失。
          </p>
          {error.message ? (
            <p className="mt-3 break-words rounded-lg bg-surface-2 px-3 py-2 text-left text-[0.6875rem] text-ink-subtle">
              {error.message}
            </p>
          ) : null}
          <div className="mt-5 flex justify-center">
            <Button variant="primary" onClick={this.handleReload}>
              <RotateCcw className="size-3.5" />
              重新加载
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
