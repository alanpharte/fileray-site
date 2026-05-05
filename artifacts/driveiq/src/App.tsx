import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import {
  useGetAuthStatus,
  getGetAuthStatusQueryKey,
  useGetSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";

import { Home } from "@/pages/Home";
import { Upload } from "@/pages/Upload";
import { FolderExplorer } from "@/pages/FolderExplorer";
import { SharedWithMe } from "@/pages/SharedWithMe";
import { TeamDashboard } from "@/pages/TeamDashboard";
import { SmartOrganiser } from "@/pages/SmartOrganiser";
import { Settings } from "@/pages/Settings";
import { Landing } from "@/pages/Landing";
import { Privacy } from "@/pages/Privacy";
import { Terms } from "@/pages/Terms";
import { Onboarding } from "@/pages/Onboarding";
import { CheckoutSuccess, CheckoutCancel } from "@/pages/CheckoutResult";

const queryClient = new QueryClient();

function AuthGate() {
  const { data: authStatus, isLoading: authLoading } = useGetAuthStatus({
    query: { queryKey: getGetAuthStatusQueryKey() },
  });

  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
    refetch: refetchSettings,
  } = useGetSettings({
    query: {
      queryKey: getGetSettingsQueryKey(),
      enabled: !!authStatus?.connected,
    },
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!authStatus?.connected) {
    return <Landing />;
  }

  if (settingsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (settingsError || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">We couldn't load your account</h2>
          <p className="text-muted-foreground text-sm">
            Something went wrong fetching your Fileray settings. Try again, and if it keeps
            failing, contact <a className="underline" href="mailto:hello@fileray.io">hello@fileray.io</a>.
          </p>
          <button
            onClick={() => refetchSettings()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!settings.onboardingCompletedAt) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/upload" component={Upload} />
        <Route path="/folders" component={FolderExplorer} />
        <Route path="/shared" component={SharedWithMe} />
        <Route path="/team" component={TeamDashboard} />
        <Route path="/organiser" component={SmartOrganiser} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppContent() {
  return (
    <Switch>
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route>{() => <AuthGate />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="fileray-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppContent />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
