import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenSquare, FolderOpen, Settings, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/editor', icon: PenSquare, label: 'Create' },
  { path: '/library', icon: FolderOpen, label: 'Library' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-white/10 flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-electric-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,122,255,0.4)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold uppercase tracking-wider text-white">Authority</h1>
              <p className="text-xs text-neutral-500 tracking-widest uppercase">Engine</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    data-testid={`nav-${label.toLowerCase()}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/30'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-neutral-500 text-center">
            <p>4-3-2-1 Strategy</p>
            <p className="text-neutral-600">Powered by AI</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
