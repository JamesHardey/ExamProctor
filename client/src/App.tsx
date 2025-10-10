import { Switch, Route } from "wouter";
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
import Landing from "@/pages/landing";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import ExamsPage from "@/pages/admin/exams";
import QuestionsPage from "@/pages/admin/questions";
import CandidatesPage from "@/pages/admin/candidates";
import MonitoringPage from "@/pages/admin/monitoring";
import DomainsPage from "@/pages/admin/domains";

// Candidate pages
import MyExamsPage from "@/pages/candidate/my-exams";
import ExamWrapper from "@/pages/candidate/exam-wrapper";

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      {isAdmin ? (
        <>
          <Route path="/" component={AdminDashboard} />
          <Route path="/exams" component={ExamsPage} />
          <Route path="/questions" component={QuestionsPage} />
          <Route path="/candidates" component={CandidatesPage} />
          <Route path="/monitoring" component={MonitoringPage} />
          <Route path="/domains" component={DomainsPage} />
        </>
      ) : (
        <>
          <Route path="/" component={MyExamsPage} />
          <Route path="/exam/:candidateId" component={ExamWrapper} />
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

  if (isLoading || !isAuthenticated) {
    return (
      <>
        <Router />
        <Toaster />
      </>
    );
  }

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
