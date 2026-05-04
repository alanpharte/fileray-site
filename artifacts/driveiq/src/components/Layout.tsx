import { Link, useLocation } from "wouter";
import { Search, Users, Shield, FolderGit2, FolderTree, Settings as SettingsIcon, Sun, Moon } from "lucide-react";
import { useGetAuthUser, getGetAuthUserQueryKey } from "@workspace/api-client-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function FilerayMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="fileray-mark-clip">
          <rect width="90" height="90" rx="20" />
        </clipPath>
      </defs>
      <g clipPath="url(#fileray-mark-clip)">
        <rect width="90" height="90" fill="#c9ff33" />
        <rect x="18" y="15" width="15" height="60" rx="2" fill="#1c0f2e" />
        <rect x="18" y="15" width="50" height="15" rx="2" fill="#1c0f2e" />
        <rect x="18" y="40" width="36" height="13" rx="2" fill="#1c0f2e" />
        <line x1="68" y1="22" x2="82" y2="6" stroke="#1c0f2e" strokeWidth="5" strokeLinecap="round" />
        <line x1="68" y1="22" x2="86" y2="22" stroke="#1c0f2e" strokeWidth="5" strokeLinecap="round" />
        <line x1="68" y1="22" x2="82" y2="38" stroke="#1c0f2e" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetAuthUser({
    query: { queryKey: getGetAuthUserQueryKey() }
  });
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/", label: "Smart File Finder", icon: Search },
    { href: "/folders", label: "Folder Explorer", icon: FolderTree },
    { href: "/shared", label: "Shared With Me", icon: Users },
    { href: "/team", label: "Team Dashboard", icon: Shield },
    { href: "/organiser", label: "Smart Organiser", icon: FolderGit2 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border gap-2.5">
          <FilerayMark size={32} />
          <span className="text-xl font-extrabold tracking-tight text-foreground dark:text-white" style={{ fontFamily: 'var(--app-font-heading)', letterSpacing: '-0.03em' }}>fileray</span>
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

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="absolute top-4 right-6 z-30 h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</TooltipContent>
        </Tooltip>
        <main className="flex-1 overflow-y-auto bg-background p-6 pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
