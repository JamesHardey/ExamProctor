import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import PreExamCheck from "./pre-exam-check";
import ExamSession from "./exam-session";
import ExamResults from "./exam-results";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Candidate } from "@shared/schema";

type ExamStage = "pre-check" | "session" | "results";

export default function ExamWrapper() {
  const [, params] = useRoute("/exam/:candidateId");
  const candidateId = params?.candidateId ? parseInt(params.candidateId) : 0;
  const { toast } = useToast();
  
  const { data: candidate, isLoading: isCandidateLoading, error: candidateError } = useQuery<Candidate>({
    queryKey: ["/api/candidates", candidateId],
    enabled: !!candidateId,
  });

  // Determine initial stage based on candidate status
  const [stage, setStage] = useState<ExamStage | null>(null);

  useEffect(() => {
    if (candidate) {
      if (candidate.status === "completed" || candidate.status === "auto_submitted") {
        setStage("results");
      } else if (candidate.status === "in_progress") {
        setStage("session");
      } else {
        setStage("pre-check");
      }
    }
  }, [candidate?.status]);

  const { data: examData, error: examError, isError: isExamError } = useQuery({
    queryKey: [`/api/exam-session/${candidateId}`],
    enabled: !!candidateId && stage !== "results",
    retry: false,
  });

  const startExamMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/candidates/${candidateId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-exams"] });
      setStage("session");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartExam = () => {
    // Call backend to update status after pre-check passes
    startExamMutation.mutate();
  };

  const handleExamComplete = () => {
    setStage("results");
  };

  if (!candidateId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid exam session</p>
      </div>
    );
  }

  // Show error state if candidate query fails
  if (candidateError) {
    const errorMessage = candidateError instanceof Error ? candidateError.message : "Failed to load exam";
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-semibold" data-testid="text-candidate-error-title">Unable to Load Exam</h1>
          <p className="text-muted-foreground" data-testid="text-candidate-error-message">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while determining candidate status
  if (isCandidateLoading || stage === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  // Show error message for draft or archived exams
  if (isExamError && examError) {
    const errorMessage = examError instanceof Error ? examError.message : "Unable to access this exam";
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-semibold" data-testid="text-exam-error-title">Exam Unavailable</h1>
          <p className="text-muted-foreground" data-testid="text-exam-error-message">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  if (stage === "results") {
    return <ExamResults candidateId={candidateId} />;
  }

  if (stage === "session") {
    return <ExamSession candidateId={candidateId} onComplete={handleExamComplete} />;
  }

  return (
    <PreExamCheck
      examTitle={(examData as any)?.examTitle || "Examination"}
      onStart={handleStartExam}
      isStarting={startExamMutation.isPending}
    />
  );
}
