import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const statCards = [
    {
      title: "Active Exams",
      value: stats?.activeExams || 0,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      testId: "stat-active-exams"
    },
    {
      title: "Total Candidates",
      value: stats?.totalCandidates || 0,
      icon: Users,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-total-candidates"
    },
    {
      title: "Flagged Incidents",
      value: stats?.flaggedIncidents || 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      testId: "stat-flagged-incidents"
    },
    {
      title: "Completion Rate",
      value: `${stats?.completionRate || 0}%`,
      icon: CheckCircle,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      testId: "stat-completion-rate"
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Overview of your examination system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid={stat.testId}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats?.recentExams?.length ? (
              <div className="space-y-3">
                {stats.recentExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate"
                    data-testid={`exam-item-${exam.id}`}
                  >
                    <div>
                      <p className="font-medium">{exam.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {exam.candidateCount} candidates
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                      exam.status === 'active' 
                        ? 'bg-chart-2/10 text-chart-2' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {exam.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-exams">
                No exams created yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats?.recentActivity?.length ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border"
                    data-testid={`activity-item-${index}`}
                  >
                    <div className={`h-2 w-2 rounded-full mt-2 ${
                      activity.severity === 'high' ? 'bg-destructive' :
                      activity.severity === 'medium' ? 'bg-chart-4' :
                      'bg-chart-2'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-activity">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
