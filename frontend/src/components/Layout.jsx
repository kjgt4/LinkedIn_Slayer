import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenSquare, FolderOpen, Settings, Zap, Database, BarChart3, Mic, Users, MessageCircle, CreditCard } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { setTokenGetter } from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';
import { useSubscription } from '@/hooks/useSubscription';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/editor', icon: PenSquare, label: 'Create' },
  { path: '/library', icon: FolderOpen, label: 'Library' },
  { path: '/vault', icon: Database, label: 'Vault' },
  { path: '/voice', icon: Mic, label: 'Voice' },
  { path: '/influencers', icon: Users, label: 'Influencers' },
  { path: '/engagement', icon: MessageCircle, label: 'Engage' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/pricing', icon: CreditCard, label: 'Pricing' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const location = useLocation();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { effectiveTier } = useSubscription();

  // Set up token getter for API calls
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  const tierColors = {
    free: 'bg-neutral-600 text-neutral-300',
    basic: 'bg-electric-blue/20 text-electric-blue',
    premium: 'bg-amber-500/20 text-amber-400',
  };

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
        <nav className="flex-1 p-4 overflow-y-auto">
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

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "bg-slate-900 border border-slate-700",
                  userButtonPopoverActionButton: "text-white hover:bg-slate-800",
                  userButtonPopoverActionButtonText: "text-white",
                  userButtonPopoverActionButtonIcon: "text-slate-400",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate" data-testid="user-name">
                  {user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
                </p>
                <span className={cn(
                  "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                  tierColors[effectiveTier]
                )} data-testid="user-tier-badge">
                  {effectiveTier}
                </span>
              </div>
              <p className="text-xs text-neutral-500 truncate">
                {user?.primaryEmailAddress?.emailAddress || ''}
              </p>
            </div>
          </div>
        </div>

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
