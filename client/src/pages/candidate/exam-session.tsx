import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Clock, 
  Camera,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Question } from "@shared/schema";

interface ExamSessionData {
  candidateId: number;
  examTitle: string;
  duration: number;
  questions: Question[];
  randomizedQuestions: any[];
  responses: any[];
  timeRemaining: number;
}

export default function ExamSessionPage({ 
  candidateId, 
  onComplete 
}: { 
  candidateId: number;
  onComplete?: () => void;
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const { data: sessionData, isLoading } = useQuery<ExamSessionData>({
    queryKey: [`/api/exam-session/${candidateId}`],
  });

  useEffect(() => {
    if (sessionData) {
      setTimeRemaining(sessionData.timeRemaining || sessionData.duration * 60);
    }
  }, [sessionData]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Webcam
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (error) {
        toast({
          title: "Camera Error",
          description: "Unable to access camera. Please check permissions.",
          variant: "destructive",
        });
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctorEvent("tab_switch", "medium");
        toast({
          title: "Warning",
          description: "Tab switching detected. This has been logged.",
          variant: "destructive",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const logProctorEvent = async (eventType: string, severity: string) => {
    try {
      await apiRequest("POST", "/api/proctor-logs", {
        candidateId,
        eventType,
        severity,
      });
    } catch (error) {
      console.error("Failed to log proctor event:", error);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/responses", data);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/exam-session/${candidateId}/submit`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exam submitted successfully",
      });
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = "/";
      }
    },
  });

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    
    if (sessionData) {
      const question = sessionData.randomizedQuestions[currentQuestionIndex];
      saveMutation.mutate({
        candidateId,
        questionId: question.id,
        selectedAnswer: answer,
      });
    }
  };

  const handleAutoSubmit = () => {
    submitMutation.mutate();
  };

  const handleNext = () => {
    if (sessionData && currentQuestionIndex < sessionData.randomizedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
    }
  };

  const toggleFlag = () => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(currentQuestionIndex)) {
      newFlagged.delete(currentQuestionIndex);
    } else {
      newFlagged.add(currentQuestionIndex);
    }
    setFlaggedQuestions(newFlagged);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading exam...</p>
      </div>
    );
  }

  const currentQuestion = sessionData.randomizedQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold" data-testid="text-exam-title">{sessionData.examTitle}</h1>
            <Badge variant="outline" data-testid="text-question-number">
              Question {currentQuestionIndex + 1} of {sessionData.randomizedQuestions.length}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {isCameraActive && (
              <Badge variant="outline" className="bg-chart-2/10 text-chart-2">
                <Camera className="h-3 w-3 mr-1" />
                Recording
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={timeRemaining < 300 ? "bg-destructive/10 text-destructive" : "bg-chart-3/10 text-chart-3"}
              data-testid="text-timer"
            >
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(timeRemaining)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-medium flex-1" data-testid="text-question-content">
                {currentQuestion.content}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFlag}
                className={flaggedQuestions.has(currentQuestionIndex) ? "bg-chart-4/10 text-chart-4" : ""}
                data-testid="button-flag-question"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {(currentQuestion.options as string[]).map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover-elevate ${
                    selectedAnswer === option
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  data-testid={`option-${index}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      selectedAnswer === option ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {selectedAnswer === option && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span>{String.fromCharCode(65 + index)}. {option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            data-testid="button-previous"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {sessionData.randomizedQuestions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? "bg-primary text-primary-foreground"
                    : flaggedQuestions.has(index)
                    ? "bg-chart-4/20 text-chart-4 border border-chart-4"
                    : "bg-muted hover-elevate"
                }`}
                data-testid={`nav-question-${index}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === sessionData.randomizedQuestions.length - 1 ? (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              data-testid="button-submit"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Exam"}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Camera Preview (small, bottom corner) */}
        <div className="fixed bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-primary shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            data-testid="video-camera-feed"
          />
          {!isCameraActive && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
