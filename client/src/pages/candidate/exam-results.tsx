import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Candidate, Exam } from "@shared/schema";
import { useLocation } from "wouter";

interface CandidateWithExam extends Candidate {
  exam?: Exam;
}

export default function ExamResults({ candidateId }: { candidateId: number }) {
  const [, setLocation] = useLocation();

  const { data: candidate, isLoading } = useQuery<CandidateWithExam>({
    queryKey: ["/api/candidates", candidateId],
  });

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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className={`h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            showResults && candidate.score !== null && candidate.score !== undefined && candidate.score >= 70 ? "bg-chart-2/10" : 
            showResults && candidate.score !== null && candidate.score !== undefined ? "bg-destructive/10" :
            "bg-muted"
          }`}>
            {showResults ? (
              candidate.score !== null && candidate.score !== undefined && candidate.score >= 70 ? (
                <CheckCircle className="h-10 w-10 text-chart-2" />
              ) : (
                <XCircle className="h-10 w-10 text-destructive" />
              )
            ) : (
              <Clock className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <h1 className="text-2xl font-semibold mb-2" data-testid="text-exam-title">
            {exam?.title || "Exam Complete"}
          </h1>

          {showResults ? (
            <>
              <p className="text-4xl font-bold mb-2" data-testid="text-score">
                {candidate.score}%
              </p>
              <p className="text-muted-foreground" data-testid="text-result-message">
                {candidate.score && candidate.score >= 70 
                  ? "Congratulations! You passed the exam."
                  : "You did not pass this time. Keep practicing!"}
              </p>
            </>
          ) : resultVisibility === "delayed" ? (
            <p className="text-lg text-muted-foreground" data-testid="text-delayed-message">
              Your exam has been submitted successfully. Results will be published later by your administrator.
            </p>
          ) : (
            <p className="text-lg text-muted-foreground" data-testid="text-hidden-message">
              Your exam has been submitted successfully. Results are not available for this exam.
            </p>
          )}
        </div>

        {showResults && candidate.completedAt && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Completed on {new Date(candidate.completedAt).toLocaleString()}</span>
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
