import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  Bell,
  CalendarClock,
  CircleAlert,
  Download,
  Inbox,
  Target,
} from 'lucide-react';
import type { MessageKind } from '@/lib/messageCenter';
import { MESSAGE_KIND_LABELS } from '@/lib/messageCenter';
import { useMessages } from '@/hooks/useMessages';
import { useMessageStore } from '@/app/store/messages';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/cn';

const KIND_ICON: Record<MessageKind, typeof Bell> = {
  'todo-overdue': CircleAlert,
  'todo-due-today': AlarmClock,
  'todo-reminder': AlarmClock,
  'event-upcoming': CalendarClock,
  'habit-pending': Target,
  'backup-stale': Download,
};

/** 高优先级消息的图标用警示色，普通用中性色 */
const KIND_TONE: Record<MessageKind, string> = {
  'todo-overdue': 'text-danger',
  'todo-due-today': 'text-warning',
  'todo-reminder': 'text-warning',
  'event-upcoming': 'text-primary-text',
  'habit-pending': 'text-ink-subtle',
  'backup-stale': 'text-ink-subtle',
};

export interface MessageBellProps {
  /** 展开态显示"消息"文字，收起态只留图标 */
  showLabel?: boolean;
}

export function MessageBell({ showLabel = false }: MessageBellProps) {
  const { messages, unreadCount, markRead, markAllRead } = useMessages();
  const readAt = useMessageStore((state) => state.readAt);
  const navigate = useNavigate();

  const unread = messages.filter((m) => !readAt[m.id]);

  return (
    <Dropdown
      align={showLabel ? 'start' : 'end'}
      triggerClassName="group w-full"
      className="w-[20rem] p-0"
      trigger={
        <span className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[0.8125rem] font-medium text-ink-muted transition-colors group-hover:text-ink">
          <span className="relative shrink-0">
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span
                className={cn(
                  'absolute -right-1.5 -top-1 min-w-[14px] rounded-full bg-danger px-1 text-center text-[0.5625rem] font-semibold leading-[14px] text-white',
                  unreadCount > 9 && 'pr-1',
                )}
                aria-hidden
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </span>
          {showLabel ? (
            <span className="truncate">
              {unreadCount > 0 ? `消息 ${unreadCount}` : '消息'}
            </span>
          ) : null}
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-[0.8125rem] font-semibold text-ink">
              消息中心
              {unreadCount > 0 ? (
                <span className="ml-1.5 text-[0.6875rem] font-normal text-ink-subtle">
                  {unreadCount} 条未读
                </span>
              ) : null}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[0.6875rem] text-primary-text transition-colors hover:text-primary"
              >
                全部已读
              </button>
            ) : null}
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <Inbox className="size-5 text-ink-subtle" />
              <p className="text-[0.8125rem] text-ink-muted">暂时没有需要处理的事</p>
              <p className="text-[0.6875rem] text-ink-subtle">
                逾期待办、临近日程、待打卡会出现在这里
              </p>
            </div>
          ) : (
            <>
              <ul className="max-h-[22rem] overflow-y-auto p-1">
                {messages.map((message) => {
                  const Icon = KIND_ICON[message.kind];
                  const isUnread = !readAt[message.id];
                  return (
                    <li key={message.id}>
                      <button
                        type="button"
                        onClick={() => {
                          markRead(message.id);
                          close();
                          navigate(message.link);
                        }}
                        className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <Icon
                          className={cn(
                            'mt-px size-4 shrink-0',
                            KIND_TONE[message.kind],
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-1.5">
                            <span
                              className={cn(
                                'min-w-0 flex-1 truncate text-[0.8125rem]',
                                isUnread ? 'font-medium text-ink' : 'text-ink-muted',
                              )}
                            >
                              {message.title}
                            </span>
                            <span className="shrink-0 text-[0.625rem] text-ink-subtle">
                              {MESSAGE_KIND_LABELS[message.kind]}
                            </span>
                          </span>
                          {message.detail ? (
                            <span className="mt-0.5 block truncate text-[0.6875rem] text-ink-subtle">
                              {message.detail}
                            </span>
                          ) : null}
                        </span>
                        {isUnread ? (
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {unread.length > 0 ? (
                <p className="border-t border-line px-3 py-1.5 text-[0.625rem] text-ink-subtle">
                  {unread.length} 条未读 · 30 天内不重复提醒
                </p>
              ) : null}
            </>
          )}
        </div>
      )}
    </Dropdown>
  );
}