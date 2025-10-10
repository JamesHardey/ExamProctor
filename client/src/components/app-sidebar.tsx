import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  FileText, 
  HelpCircle, 
  Users, 
  Eye,
  Shield,
  LogOut,
  User,
  BarChart3,
  FolderOpen
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const adminItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    testId: "link-admin-dashboard"
  },
  {
    title: "Exams",
    url: "/exams",
    icon: FileText,
    testId: "link-exams"
  },
  {
    title: "Questions",
    url: "/questions",
    icon: HelpCircle,
    testId: "link-questions"
  },
  {
    title: "Domains",
    url: "/domains",
    icon: FolderOpen,
    testId: "link-domains"
  },
  {
    title: "Live Monitoring",
    url: "/monitoring",
    icon: Eye,
    testId: "link-monitoring"
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    testId: "link-analytics"
  },
];

const candidateItems = [
  {
    title: "My Exams",
    url: "/",
    icon: FileText,
    testId: "link-my-exams"
  },
];

export function AppSidebar() {
  const { user, isAdmin } = useAuth();
  const items = isAdmin ? adminItems : candidateItems;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      setLocation(isAdmin ? "/admin" : "/");
    },
  });

  const initials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">SmartExam</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Admin Panel" : "Candidate"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={item.testId}>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
              {user?.role || "Candidate"}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
