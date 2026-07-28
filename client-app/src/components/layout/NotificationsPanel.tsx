import { useEffect, useRef } from 'react';

export interface NotificationItem {
  id: string;
  category: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    category: 'MANDATE',
    message:
      'Antberg countersigned the buy-side mandate covering #A-058. The object moved to Ownership Research.',
    timestamp: 'Today · 09:12',
    read: false,
  },
  {
    id: '2',
    category: 'EVALUATION',
    message: 'Bank valuation received for #B-017 — €2.9M market value, confidence Medium.',
    timestamp: 'Today · 08:48',
    read: false,
  },
  {
    id: '3',
    category: 'SCOUTING',
    message: '4 new objects delivered on the Stuttgart Metro Value-Add order.',
    timestamp: 'Yesterday · 17:26',
    read: true,
  },
  {
    id: '4',
    category: 'DOCUMENTS',
    message: "Grundbuch extract for #A-041 is still outstanding with the owner's counsel.",
    timestamp: 'Yesterday · 11:03',
    read: true,
  },
  {
    id: '5',
    category: 'PIPELINE',
    message: 'Owner of #A-041 replied to outreach — meeting proposed for 31 July.',
    timestamp: '24 Jul · 15:48',
    read: true,
  },
];

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export function NotificationsPanel({
  open,
  onClose,
  notifications,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        className="fixed inset-0 z-50 bg-black/20"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="fixed top-5 left-[272px] z-[60] w-[400px] overflow-hidden rounded-[12px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-semibold text-ink">Notifications</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-[12px] font-semibold text-lime-muted underline underline-offset-2 hover:text-lime"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={[
                'border-b border-border px-5 py-4 last:border-0',
                !item.read ? 'bg-lime/10' : 'bg-white',
              ].join(' ')}
            >
              <div className="flex gap-3">
                <div className="mt-1 shrink-0">
                  {!item.read ? (
                    <span className="block h-2.5 w-2.5 rounded-full bg-lime" />
                  ) : (
                    <span className="block h-2.5 w-2.5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                    {item.category}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-ink">{item.message}</p>
                  <div className="mt-2 text-[11px] text-muted">{item.timestamp}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-gray-50/80 px-5 py-3">
          <p className="text-[11px] leading-snug text-muted">
            Every mandate, evaluation and document event is also recorded in Activity History.
          </p>
        </div>
      </div>
    </>
  );
}
