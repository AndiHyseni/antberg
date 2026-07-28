import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  FileText,
  HelpCircle,
  LayoutGrid,
  Search,
  Settings,
  Bookmark,
  ClipboardList,
  TrendingUp,
  GitBranch,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AntbergLogo } from '../ui/AntbergLogo';
import {
  DEFAULT_NOTIFICATIONS,
  NotificationsPanel,
  type NotificationItem,
} from './NotificationsPanel';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors',
    isActive
      ? 'border-l-[3px] border-lime bg-lime/8 text-lime -ml-px pl-[13px]'
      : 'border-l-[3px] border-transparent text-white/65 hover:text-white hover:bg-white/5',
  ].join(' ');

function NavBadge({ count, variant }: { count: number; variant: 'lime' | 'red' }) {
  return (
    <span
      className={[
        'ml-auto min-w-[28px] rounded-md px-2 py-0.5 text-center text-[11px] font-bold',
        variant === 'lime' ? 'bg-lime text-ink' : 'bg-[#e85d4a] text-white',
      ].join(' ')}
    >
      {count}
    </span>
  );
}

export function Sidebar() {
  const { catalogCount, selection } = useApp();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col bg-sidebar text-white">
      <div className="flex items-center justify-between px-5 pt-6 pb-6">
        <AntbergLogo />
        <button
          type="button"
          onClick={() => setNotificationsOpen((o) => !o)}
          className="relative rounded p-1 text-white/60 hover:text-white"
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
        >
          <Bell size={18} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        <div>
          <NavLink to="/" end className={navLinkClass}>
            <LayoutGrid size={16} strokeWidth={1.5} className={location.pathname === '/' ? 'text-lime' : ''} />
            Overview
          </NavLink>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
            Discovery
          </div>
          <div className="space-y-0.5">
            <NavLink to="/scouting-orders" className={navLinkClass}>
              <Search size={16} strokeWidth={1.5} />
              Scouting Orders
            </NavLink>
            <NavLink to="/catalogue" className={navLinkClass}>
              <ClipboardList size={16} strokeWidth={1.5} />
              Opportunity Catalogue
              <NavBadge count={catalogCount} variant="lime" />
            </NavLink>
            <NavLink to="/mandate" className={navLinkClass}>
              <Bookmark size={16} strokeWidth={1.5} />
              Selected
              {selection.length > 0 && <NavBadge count={selection.length} variant="lime" />}
            </NavLink>
          </div>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
            Acquisition
          </div>
          <div className="space-y-0.5">
            <NavLink to="/evaluation" className={navLinkClass}>
              <TrendingUp size={16} strokeWidth={1.5} />
              Evaluation & Offers
              <NavBadge count={12} variant="red" />
            </NavLink>
            <NavLink to="/pipeline" className={navLinkClass}>
              <GitBranch size={16} strokeWidth={1.5} />
              Pipeline
            </NavLink>
          </div>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
            Resources
          </div>
          <div className="space-y-0.5">
            <NavLink to="/documents" className={navLinkClass}>
              <FileText size={16} strokeWidth={1.5} />
              Documents
            </NavLink>
            <NavLink to="/saved" className={navLinkClass}>
              <Bookmark size={16} strokeWidth={1.5} />
              Saved Opportunities
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 space-y-0.5">
          <a
            href="#help"
            className="flex items-center gap-3 px-4 py-2 text-[13px] text-white/55 hover:text-white"
          >
            <HelpCircle size={16} strokeWidth={1.5} />
            Help & Support
          </a>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-4 py-2 text-[13px] transition-colors',
                isActive ? 'text-lime' : 'text-white/55 hover:text-white',
              ].join(' ')
            }
          >
            <Settings size={16} strokeWidth={1.5} />
            Settings
          </NavLink>
        </div>
        <div className="mx-1 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-lime text-[12px] font-bold text-ink">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">Alex Freeman</div>
            <div className="truncate text-[11px] text-white/45">Freeman Capital Partners</div>
          </div>
          <ChevronDown size={16} className="shrink-0 text-white/35" />
        </div>
      </div>
    </aside>

    <NotificationsPanel
      open={notificationsOpen}
      onClose={() => setNotificationsOpen(false)}
      notifications={notifications}
      onMarkAllRead={markAllRead}
    />
    </>
  );
}
