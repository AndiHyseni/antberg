import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar.tsx';

export function AdminShell() {
  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar />
      <main className="ml-[260px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
