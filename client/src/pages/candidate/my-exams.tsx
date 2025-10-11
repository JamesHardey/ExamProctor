import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Play, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Candidate, Exam } from "@shared/schema";

interface CandidateWithExam extends Candidate {
  exam?: Exam;
}

export default function MyExamsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: allExams, isLoading } = useQuery<CandidateWithExam[]>({
    queryKey: ["/api/my-exams"],
  });

  // Filter out draft exams - candidates should never see them
  const myExams = allExams?.filter(candidate => candidate.exam?.status !== "draft");

  // Simply navigate to exam page, don't change status yet
  const handleStartExam = (candidateId: number, exam?: Exam) => {
    // Prevent starting archived exams
    if (exam?.status === "archived") {
      toast({
        title: "Exam Archived",
        description: "This exam has been archived and new attempts cannot be started.",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/exam/${candidateId}`);
  };

  const getStatusInfo = (candidate: CandidateWithExam) => {
    switch (candidate.status) {
      case "completed":
        return {
          label: "Completed",
          color: "bg-chart-2/10 text-chart-2",
          icon: CheckCircle,
        };
      case "in_progress":
        return {
          label: "In Progress",
          color: "bg-chart-3/10 text-chart-3",
          icon: Clock,
        };
      case "auto_submitted":
        return {
          label: "Auto Submitted",
          color: "bg-chart-4/10 text-chart-4",
          icon: Clock,
        };
      default:
        return {
          label: "Not Started",
          color: "bg-muted text-muted-foreground",
          icon: Play,
        };
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">My Exams</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          View and take your assigned examinations
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : myExams && myExams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myExams.map((candidate) => {
            const exam = candidate.exam;
            const statusInfo = getStatusInfo(candidate);
            const StatusIcon = statusInfo.icon;

            return (
              <Card key={candidate.id} className="p-6 hover-elevate" data-testid={`exam-card-${candidate.id}`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2" data-testid={`text-exam-title-${candidate.id}`}>
                        {exam?.title || "Unknown Exam"}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exam?.description}
                      </p>
                    </div>
                    <Badge className={statusInfo.color} data-testid={`badge-status-${candidate.id}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium font-mono">{exam?.duration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Questions:</span>
                      <span className="font-medium">{exam?.questionCount}</span>
                    </div>
                    {candidate.score !== null && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="font-bold text-lg">{candidate.score}%</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {candidate.status === "assigned" ? (
                      exam?.status === "archived" ? (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          disabled 
                          data-testid={`button-archived-${candidate.id}`}
                        >
                          Exam Archived
                        </Button>
                      ) : (
                        <Button 
                          className="w-full" 
                          onClick={() => handleStartExam(candidate.id, exam)}
                          data-testid={`button-start-exam-${candidate.id}`}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Exam
                        </Button>
                      )
                    ) : candidate.status === "in_progress" ? (
                      exam?.status === "archived" ? (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          disabled 
                          data-testid={`button-archived-${candidate.id}`}
                        >
                          Exam Archived
                        </Button>
                      ) : (
                        <Button 
                          className="w-full" 
                          onClick={() => setLocation(`/exam/${candidate.id}`)}
                          data-testid={`button-continue-exam-${candidate.id}`}
                        >
                          Continue Exam
                        </Button>
                      )
                    ) : candidate.status === "completed" && exam?.showResults === "immediate" ? (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setLocation(`/exam/${candidate.id}`)}
                        data-testid={`button-view-results-${candidate.id}`}
                      >
                        View Results
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled data-testid={`button-completed-${candidate.id}`}>
                        {exam?.showResults === "delayed" ? "Results Pending" : "Completed"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-exams">No exams assigned yet</h3>
            <p className="text-sm text-muted-foreground">
              Your assigned exams will appear here
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
