import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenSquare, FolderOpen, Settings, Zap, Database, BarChart3, Mic, Users, MessageCircle, CreditCard, Menu } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { setTokenGetter } from '@/lib/api';
import { useAuth } from '@clerk/clerk-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set up token getter for API calls
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const tierColors = {
    free: 'bg-muted text-muted-foreground',
    basic: 'bg-primary/20 text-primary',
    premium: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  };

  // Shared sidebar content component
  const SidebarContent = ({ isMobile = false }) => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider text-sidebar-foreground">Authority</h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <li key={path}>
                <NavLink
                  to={path}
                  data-testid={`nav-${label.toLowerCase()}`}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
                userButtonPopoverCard: "bg-popover border border-border",
                userButtonPopoverActionButton: "text-popover-foreground hover:bg-accent",
                userButtonPopoverActionButtonText: "text-popover-foreground",
                userButtonPopoverActionButtonIcon: "text-muted-foreground",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="user-name">
                {user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User'}
              </p>
              <span className={cn(
                "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                tierColors[effectiveTier]
              )} data-testid="user-tier-badge">
                {effectiveTier}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {user?.primaryEmailAddress?.emailAddress || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>4-3-2-1 Strategy</p>
          <p className="text-muted-foreground/60">Powered by AI</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-40 md:hidden safe-area-inset">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-base font-bold uppercase tracking-wider text-foreground">Authority</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Open navigation menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-sidebar-border flex flex-col">
              <SidebarContent isMobile={true} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col z-50">
        <SidebarContent />
        {/* Theme toggle in desktop sidebar */}
        <div className="absolute top-6 right-4">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Content - add top padding on mobile for header, left margin on desktop for sidebar */}
      <main className="flex-1 min-h-screen pt-16 md:pt-0 md:ml-64">
        <Outlet />
      </main>
    </div>
  );
}
