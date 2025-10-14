import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye, Camera, FileDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProctorLog, Candidate, User } from "@shared/schema";
import { exportProctorLogsCSV, exportProctorLogsPDF } from "@/lib/exportReports";

interface ProctorLogWithDetails extends ProctorLog {
  candidate?: Candidate & { user?: User };
}

interface ActiveSession extends Candidate {
  user?: User;
  exam?: any;
  timeRemaining?: string | null;
}

export default function MonitoringPage() {
  const [videoFeeds, setVideoFeeds] = useState<Map<number, string>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  const { data: activeSessions, isLoading: sessionsLoading } = useQuery<ActiveSession[]>({
    queryKey: ["/api/monitoring/active"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<ProctorLogWithDetails[]>({
    queryKey: ["/api/monitoring/logs"],
  });

  // WebSocket connection for receiving video feeds
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Admin WebSocket connected for video monitoring');
      ws.send(JSON.stringify({
        type: 'register',
        clientType: 'admin'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'video_frame' && data.candidateId && data.frame) {
          setVideoFeeds(prev => {
            const updated = new Map(prev);
            updated.set(data.candidateId, data.frame);
            return updated;
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Admin WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Admin WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 text-destructive";
      case "medium":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-chart-2/10 text-chart-2";
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "face_absent":
      case "multiple_faces":
        return Camera;
      case "tab_switch":
        return Eye;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Live Monitoring</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Real-time exam monitoring and proctoring events
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => logs && exportProctorLogsCSV(logs)} variant="outline" data-testid="button-export-logs-csv">
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => logs && exportProctorLogsPDF(logs)} variant="outline" data-testid="button-export-logs-pdf">
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Exam Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : activeSessions && activeSessions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeSessions.map((session: any) => {
                    const user = session.user;
                    const initials = user?.firstName && user?.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                      : user?.email?.[0]?.toUpperCase() || "U";

                    return (
                      <div
                        key={session.id}
                        className="p-4 rounded-lg border border-border bg-card"
                        data-testid={`session-${session.id}`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {user?.firstName && user?.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user?.email || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">{session.exam?.title}</p>
                          </div>
                          <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                            <div className="h-2 w-2 rounded-full bg-chart-2 mr-1.5 animate-pulse" />
                            Live
                          </Badge>
                        </div>

                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-3 relative overflow-hidden" data-testid={`camera-feed-${session.id}`}>
                          {videoFeeds.get(session.id) ? (
                            <img 
                              src={videoFeeds.get(session.id)} 
                              alt="Live camera feed"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <Camera className="h-8 w-8 text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Waiting for feed...</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Time Remaining:</span>
                          <span className="font-medium font-mono" data-testid={`time-remaining-${session.id}`}>
                            {session.timeRemaining || "00:00"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-active-sessions">
                  No active exam sessions
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proctoring Events</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {logs.map((log) => {
                  const EventIcon = getEventIcon(log.eventType);
                  const user = log.candidate?.user;

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-border"
                      data-testid={`log-${log.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg ${getSeverityColor(log.severity)} flex items-center justify-center flex-shrink-0`}>
                          <EventIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="text-sm font-medium mb-1">
                            {log.eventType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.firstName && user?.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user?.email || "Unknown User"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-events">
                No proctoring events
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
