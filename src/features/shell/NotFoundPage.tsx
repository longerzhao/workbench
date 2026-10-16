import { Link } from 'react-router-dom';
import { LayoutDashboard, TriangleAlert } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="text-center">
        <TriangleAlert className="mx-auto size-8 text-ink-subtle" />
        <h1 className="mt-3 text-base font-semibold text-ink">页面不存在</h1>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">这个地址没有对应的模块。</p>
        <Link to="/" className="btn btn-primary mt-4">
          <LayoutDashboard className="size-3.5" />
          回到总览
        </Link>
      </div>
    </div>
  );
}
