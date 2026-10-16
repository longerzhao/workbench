import Markdown from 'react-markdown';
import { cn } from '@/lib/cn';

export interface NotePreviewProps {
  content: string;
  className?: string;
}

/** 仅渲染 Markdown AST，不启用 rehype-raw，避免 raw HTML */
export function NotePreview({ content, className }: NotePreviewProps) {
  const body = content.trim() ? content : '*暂无内容*';

  return (
    <div
      className={cn(
        'note-md min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[0.875rem] leading-relaxed text-ink',
        className,
      )}
    >
      <Markdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline">
              {children}
            </a>
          ),
          code: ({ children, className: codeClass }) => {
            const inline = !codeClass;
            if (inline) {
              return (
                <code className="rounded bg-surface-2 px-1 py-0.5 text-[0.8125rem]">{children}</code>
              );
            }
            return (
              <code className={cn('block overflow-x-auto rounded-[10px] bg-surface-2 p-3 text-[0.8125rem]', codeClass)}>
                {children}
              </code>
            );
          },
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          h1: ({ children }) => <h1 className="mb-2 mt-3 text-xl font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-3 text-lg font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-2 text-base font-semibold">{children}</h3>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-line-strong pl-3 text-ink-muted">{children}</blockquote>
          ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
