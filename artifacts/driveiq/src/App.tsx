import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useGetAuthStatus, getGetAuthStatusQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";

// Placeholder pages
import { Home } from "@/pages/Home";
import { SharedWithMe } from "@/pages/SharedWithMe";
import { TeamDashboard } from "@/pages/TeamDashboard";
import { SmartOrganiser } from "@/pages/SmartOrganiser";
import { Settings } from "@/pages/Settings";
import { Landing } from "@/pages/Landing";

const queryClient = new QueryClient();

function AppContent() {
  const { data: authStatus, isLoading } = useGetAuthStatus({
    query: { queryKey: getGetAuthStatusQueryKey() }
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!authStatus?.connected) {
    return <Landing />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shared" component={SharedWithMe} />
        <Route path="/team" component={TeamDashboard} />
        <Route path="/organiser" component={SmartOrganiser} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
