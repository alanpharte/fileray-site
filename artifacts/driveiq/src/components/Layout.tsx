import { Link, useLocation } from "wouter";
import { Search, Users, Shield, FolderGit2, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useGetAuthUser, getGetAuthUserQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetAuthUser({
    query: { queryKey: getGetAuthUserQueryKey() }
  });

  const navItems = [
    { href: "/", label: "Search", icon: Search },
    { href: "/shared", label: "Shared With Me", icon: Users },
    { href: "/team", label: "Team Dashboard", icon: Shield },
    { href: "/organiser", label: "Smart Organiser", icon: FolderGit2 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-xl font-bold text-primary">DriveIQ</span>
        </div>
        
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex items-center">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.displayName || "Connected"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || "Google Drive"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold capitalize">
            {location === "/" ? "Smart File Finder" : location.slice(1).replace("-", " ")}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
