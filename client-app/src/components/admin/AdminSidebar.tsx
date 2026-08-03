import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Building2,
  KeyRound,
  LayoutGrid,
  LogOut,
  Users,
} from 'lucide-react';
import { AntbergLogo } from '../ui/AntbergLogo';
import { adminInitials, adminLogoutApi, getAdminUser } from '../../api/adminClient';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-colors',
    isActive
      ? 'border-l-[3px] border-lime bg-lime/8 text-lime -ml-px pl-[13px]'
      : 'border-l-[3px] border-transparent text-white/65 hover:text-white hover:bg-white/5',
  ].join(' ');

export function AdminSidebar() {
  const navigate = useNavigate();
  const user = getAdminUser();

  async function logout() {
    await adminLogoutApi();
    navigate('/admin/login', { replace: true });
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col bg-sidebar text-white">
      <div className="px-5 pt-6 pb-4">
        <AntbergLogo />
        <div className="mt-3 text-[10px] font-semibold tracking-[0.14em] text-lime/80 uppercase">
          Admin console
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3">
        <div className="space-y-0.5">
          <NavLink to="/admin" end className={navLinkClass}>
            <LayoutGrid size={16} strokeWidth={1.5} />
            Overview
          </NavLink>
        </div>

        <div>
          <div className="mb-2 px-4 text-[10px] font-semibold tracking-[0.14em] text-white/35 uppercase">
            Platform
          </div>
          <div className="space-y-0.5">
            <NavLink to="/admin/clients" className={navLinkClass}>
              <Building2 size={16} strokeWidth={1.5} />
              Clients
            </NavLink>
            <NavLink to="/admin/users" className={navLinkClass}>
              <Users size={16} strokeWidth={1.5} />
              Users
            </NavLink>
            <NavLink to="/admin/access-tokens" className={navLinkClass}>
              <KeyRound size={16} strokeWidth={1.5} />
              Access tokens
            </NavLink>
            <NavLink to="/admin/activity" className={navLinkClass}>
              <Activity size={16} strokeWidth={1.5} />
              Activity log
            </NavLink>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={() => void logout()}
          className="mb-3 flex w-full items-center gap-3 px-4 py-2 text-[13px] text-white/55 hover:text-white"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign out
        </button>
        <div className="mx-1 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-lime text-[12px] font-bold text-ink">
            {adminInitials(user?.display_name ?? 'AD')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{user?.display_name ?? 'Admin'}</div>
            <div className="truncate text-[11px] text-white/45">{user?.email ?? '—'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
