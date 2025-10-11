import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import AdminLoginPage from "@/pages/admin-login";
import CandidateLoginPage from "@/pages/candidate-login";
import SetPasswordPage from "@/pages/set-password";
import ForgotPasswordPage from "@/pages/admin/forgot-password";
import ResetPasswordPage from "@/pages/admin/reset-password";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import ExamsPage from "@/pages/admin/exams";
import ExamManagePage from "@/pages/admin/exam-manage";
import CandidatesPage from "@/pages/admin/candidates";
import MonitoringPage from "@/pages/admin/monitoring";
import DomainsPage from "@/pages/admin/domains";
import AnalyticsPage from "@/pages/admin/analytics";
import AdministratorsPage from "@/pages/admin/administrators";

// Candidate pages
import MyExamsPage from "@/pages/candidate/my-exams";
import ExamWrapper from "@/pages/candidate/exam-wrapper";

function AdminRoute({ component: Component, ...rest }: any) {
  const { isAdmin } = useAuth();
  
  if (!isAdmin) {
    return <Redirect to="/" />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return null;
  }

  // If not authenticated, show public routes only
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={CandidateLoginPage} />
        <Route path="/admin" component={AdminLoginPage} />
        <Route path="/admin/forgot-password" component={ForgotPasswordPage} />
        <Route path="/admin/reset-password" component={ResetPasswordPage} />
        <Route path="/set-password" component={SetPasswordPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Authenticated routes
  return (
    <Switch>
      {isAdmin ? (
        <>
          <Route path="/" component={AdminDashboard} />
          <Route path="/exams" component={ExamsPage} />
          <Route path="/exams/:id/manage" component={ExamManagePage} />
          <Route path="/candidates" component={CandidatesPage} />
          <Route path="/monitoring" component={MonitoringPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/domains" component={DomainsPage} />
          <Route path="/administrators" component={AdministratorsPage} />
        </>
      ) : (
        <>
          <Route path="/" component={MyExamsPage} />
          <Route path="/exam/:candidateId" component={ExamWrapper} />
          <Route path="/exams">{() => <Redirect to="/" />}</Route>
          <Route path="/candidates">{() => <Redirect to="/" />}</Route>
          <Route path="/monitoring">{() => <Redirect to="/" />}</Route>
          <Route path="/analytics">{() => <Redirect to="/" />}</Route>
          <Route path="/domains">{() => <Redirect to="/" />}</Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show minimal layout while loading or not authenticated
  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

  // Show full layout with sidebar for authenticated users
  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-2 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
