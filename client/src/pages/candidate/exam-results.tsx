import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Candidate, Exam } from "@shared/schema";
import { useLocation } from "wouter";

interface CandidateWithExam extends Candidate {
  exam?: Exam;
}

interface ProctorLog {
  id: number;
  candidateId: number;
  eventType: string;
  severity: string;
  timestamp: string;
}

export default function ExamResults({ candidateId }: { candidateId: number }) {
  const [, setLocation] = useLocation();

  const { data: candidate, isLoading } = useQuery<CandidateWithExam>({
    queryKey: ["/api/candidates", candidateId],
  });

  const { data: allLogs } = useQuery<ProctorLog[]>({
    queryKey: ["/api/proctor-logs"],
  });

  // Filter logs for this candidate
  const candidateLogs = allLogs?.filter(log => log.candidateId === candidateId) || [];
  
  // Count high severity violations for negative marking
  const highSeverityViolations = candidateLogs.filter(log => 
    log.severity === "high" && 
    ["face_absent", "multiple_faces", "fullscreen_exit", "tab_switch"].includes(log.eventType)
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Results not found</p>
      </div>
    );
  }

  const exam = candidate.exam;
  const resultVisibility = exam?.showResults || "delayed";
  const showResults = resultVisibility === "immediate";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-2xl w-full p-6 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            showResults && candidate.score !== null && candidate.score !== undefined && candidate.score >= 70 ? "bg-chart-2/10" : 
            showResults && candidate.score !== null && candidate.score !== undefined ? "bg-destructive/10" :
            "bg-muted"
          }`}>
            {showResults ? (
              candidate.score !== null && candidate.score !== undefined && candidate.score >= 70 ? (
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-chart-2" />
              ) : (
                <XCircle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
              )
            ) : (
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold mb-2" data-testid="text-exam-title">
            {exam?.title || "Exam Complete"}
          </h1>

          {showResults ? (
            <>
              <p className="text-3xl sm:text-4xl font-bold mb-2" data-testid="text-score">
                {candidate.score !== null && candidate.score !== undefined ? `${candidate.score}%` : 'N/A'}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-result-message">
                {candidate.score !== null && candidate.score !== undefined && candidate.score >= 70 
                  ? "Congratulations! You passed the exam."
                  : "You did not pass this time. Keep practicing!"}
              </p>
            </>
          ) : resultVisibility === "delayed" ? (
            <p className="text-base sm:text-lg text-muted-foreground" data-testid="text-delayed-message">
              Your exam has been submitted successfully. Results will be published later by your administrator.
            </p>
          ) : (
            <p className="text-base sm:text-lg text-muted-foreground" data-testid="text-hidden-message">
              Your exam has been submitted successfully. Results are not available for this exam.
            </p>
          )}
        </div>

        {showResults && exam?.proctoringMode === "negative_marking" && highSeverityViolations > 0 && (
          <div className="bg-destructive/10 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-destructive/20">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-medium text-destructive mb-1">
                  Negative Marking Applied
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                  {highSeverityViolations} high severity violation{highSeverityViolations > 1 ? 's' : ''} detected
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-destructive border-destructive/30">
                    -{highSeverityViolations} point{highSeverityViolations > 1 ? 's' : ''} deducted
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {showResults && candidate.completedAt && (
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3 justify-center text-xs sm:text-sm text-muted-foreground">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-center">Completed on {new Date(candidate.completedAt).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => setLocation("/")}
          data-testid="button-back-to-exams"
        >
          Back to My Exams
        </Button>
      </Card>
    </div>
  );
}
