import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard } from 'lucide-react';

export interface ModulePlaceholderProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** 该模块计划实现的能力清单 */
  planned: string[];
  stage: string;
}

/**
 * 尚未实现的模块页占位。
 * 刻意写清「已实现什么、还差什么」，而不是放一张 "Coming soon" 的图——
 * 主页面上的卡片已经能完成这些模块的核心操作，这里只是缺一个完整的管理界面。
 */
export function ModulePlaceholder({
  icon,
  title,
  description,
  planned,
  stage,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-8">
      <div className="card p-6 lg:p-8">
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text [&>svg]:size-5">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-ink">{title}</h1>
              <span className="chip">{stage}</span>
            </div>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{description}</p>
          </div>
        </div>

        <div className="divider my-5" />

        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
          该模块计划包含
        </h2>
        <ul className="mt-2.5 space-y-1.5">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[0.8125rem] text-ink-muted">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl bg-surface-2 p-3.5">
          <p className="text-[0.8125rem] text-ink-muted">
            目前这些操作已经可以在<strong className="font-medium text-ink">总览页</strong>
            的对应卡片上完成，数据是同一份。
          </p>
          <Link to="/" className="btn btn-primary mt-3">
            <LayoutDashboard className="size-3.5" />
            回到总览
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
