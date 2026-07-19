import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  FileText,
  Info,
  LayoutGrid,
  Search,
  Settings,
  Bookmark,
  ClipboardList,
  TrendingUp,
  GitBranch,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors rounded-r-md',
    isActive
      ? 'bg-lime/10 text-lime border-l-2 border-lime -ml-px'
      : 'text-white/70 hover:text-white hover:bg-white/5',
  ].join(' ');

function NavBadge({ count, variant }: { count: number; variant: 'lime' | 'red' }) {
  return (
    <span
      className={[
        'ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold',
        variant === 'lime' ? 'bg-lime text-ink' : 'bg-red-500 text-white',
      ].join(' ')}
    >
      {count}
    </span>
  );
}

export function Sidebar() {
  const { catalogCount, selection } = useApp();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col bg-sidebar text-white">
      <div className="flex items-center justify-between px-5 pt-6 pb-8">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-white/90">
          ANTBERG PROGRAM
        </div>
        <button
          type="button"
          className="relative rounded p-1 text-white/60 hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        <div>
          <NavLink to="/" end className={navLinkClass}>
            <LayoutGrid size={16} className={location.pathname === '/' ? 'text-lime' : ''} />
            Overview
          </NavLink>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/40">
            DISCOVERY
          </div>
          <div className="space-y-0.5">
            <NavLink to="/scouting-orders" className={navLinkClass}>
              <Search size={16} />
              Scouting Orders
            </NavLink>
            <NavLink to="/catalogue" className={navLinkClass}>
              <ClipboardList size={16} />
              Opportunity Catalogue
              <NavBadge count={catalogCount} variant="lime" />
            </NavLink>
            <NavLink to="/mandate" className={navLinkClass}>
              <Bookmark size={16} />
              Selected & Mandate
              {selection.length > 0 && (
                <span className="ml-auto text-[11px] text-white/50">{selection.length}</span>
              )}
            </NavLink>
          </div>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/40">
            ACQUISITION
          </div>
          <div className="space-y-0.5">
            <NavLink to="/evaluation" className={navLinkClass}>
              <TrendingUp size={16} />
              Evaluation & Offers
              <NavBadge count={12} variant="red" />
            </NavLink>
            <NavLink to="/pipeline" className={navLinkClass}>
              <GitBranch size={16} />
              Pipeline
            </NavLink>
          </div>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/40">
            RESOURCES
          </div>
          <div className="space-y-0.5">
            <NavLink to="/documents" className={navLinkClass}>
              <FileText size={16} />
              Documents
            </NavLink>
            <NavLink to="/saved" className={navLinkClass}>
              <Bookmark size={16} />
              Saved Opportunities
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 space-y-0.5">
          <a href="#info" className="flex items-center gap-3 px-4 py-2 text-[13px] text-white/60 hover:text-white">
            <Info size={16} />
            Info
          </a>
          <a href="#settings" className="flex items-center gap-3 px-4 py-2 text-[13px] text-white/60 hover:text-white">
            <Settings size={16} />
            Settings
          </a>
        </div>
        <div className="mx-1 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-hover text-[12px] font-semibold">
            AF
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">Alex Freeman</div>
            <div className="truncate text-[11px] text-white/50">Freeman Capital Partners</div>
          </div>
          <ChevronDown size={16} className="text-white/40" />
        </div>
      </div>
    </aside>
  );
}
