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
  
  const { data: candidate } = useQuery<Candidate>({
    queryKey: ["/api/candidates", candidateId],
    enabled: !!candidateId,
  });

  // Determine initial stage based on candidate status
  const [stage, setStage] = useState<ExamStage>("pre-check");

  useEffect(() => {
    if (candidate) {
      if (candidate.status === "completed") {
        setStage("results");
      } else if (candidate.status === "in_progress") {
        setStage("session");
      } else {
        setStage("pre-check");
      }
    }
  }, [candidate?.status]);

  const { data: examData } = useQuery({
    queryKey: [`/api/exam-session/${candidateId}`],
    enabled: !!candidateId,
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

  if (stage === "results") {
    return <ExamResults candidateId={candidateId} />;
  }

  if (stage === "session") {
    return <ExamSession candidateId={candidateId} onComplete={handleExamComplete} />;
  }

  return (
    <PreExamCheck
      examTitle={examData?.examTitle || candidate?.exam?.title || "Examination"}
      onStart={handleStartExam}
      isStarting={startExamMutation.isPending}
    />
  );
}
