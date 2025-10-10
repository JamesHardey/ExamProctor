import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Eye, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Exam, Domain } from "@shared/schema";

type QuestionInput = {
  type: "multiple_choice" | "true_false";
  content: string;
  options: string[];
  correctAnswer: string;
};

export default function ExamsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: domains } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/exams", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      setIsCreateOpen(false);
      setQuestions([]);
      setSelectedDomain(null);
      toast({
        title: "Success",
        description: "Exam created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const examData = {
      domainId: parseInt(formData.get("domainId") as string),
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      duration: parseInt(formData.get("duration") as string),
      questionCount: parseInt(formData.get("questionCount") as string),
      showResults: formData.get("showResults") as string,
      status: "draft",
      enableWebcam: formData.get("enableWebcam") === "on",
      enableTabDetection: formData.get("enableTabDetection") === "on",
    };

    const questionsData = questions.map(q => ({
      domainId: examData.domainId,
      type: q.type,
      content: q.content,
      options: q.options.filter(opt => opt.trim() !== ""),
      correctAnswer: q.correctAnswer,
    }));

    createMutation.mutate({
      ...examData,
      questions: questionsData,
    });
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      type: "multiple_choice",
      content: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionInput, value: any) => {
    const updated = [...questions];
    if (field === "type") {
      if (value === "true_false") {
        updated[index] = { 
          ...updated[index], 
          type: value, 
          options: ["True", "False"],
          correctAnswer: "" 
        };
      } else {
        updated[index] = { 
          ...updated[index], 
          type: value, 
          options: ["", "", "", ""],
          correctAnswer: "" 
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setQuestions(updated);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Exams</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Create and manage your examinations
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-exam">
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="p-6 hover-elevate" data-testid={`exam-card-${exam.id}`}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1" data-testid={`text-exam-title-${exam.id}`}>
                      {exam.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {exam.description}
                    </p>
                  </div>
                  <Badge
                    variant={exam.status === "active" ? "default" : "secondary"}
                    data-testid={`badge-exam-status-${exam.id}`}
                  >
                    {exam.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{exam.duration} mins</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-exam-${exam.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-exam-${exam.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-exams">No exams created yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Get started by creating your first examination
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-exam">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Exam
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Exam</DialogTitle>
            <DialogDescription>
              Configure exam settings and add questions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Mathematics Final Exam"
                  required
                  data-testid="input-exam-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the exam"
                  rows={3}
                  data-testid="input-exam-description"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="domainId">Domain *</Label>
                  <Select 
                    name="domainId" 
                    required 
                    onValueChange={(value) => setSelectedDomain(parseInt(value))}
                  >
                    <SelectTrigger data-testid="select-domain">
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains?.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id.toString()}>
                          {domain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="1"
                    placeholder="60"
                    required
                    data-testid="input-exam-duration"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="questionCount">Number of Questions *</Label>
                  <Input
                    id="questionCount"
                    name="questionCount"
                    type="number"
                    min="1"
                    placeholder="20"
                    required
                    data-testid="input-question-count"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="showResults">Result Visibility *</Label>
                  <Select name="showResults" defaultValue="delayed" required>
                    <SelectTrigger data-testid="select-show-results">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Proctoring Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableWebcam">Webcam Monitoring</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable face detection and presence monitoring
                    </p>
                  </div>
                  <Switch id="enableWebcam" name="enableWebcam" defaultChecked data-testid="switch-webcam" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableTabDetection">Tab Switch Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor and log when candidates switch tabs
                    </p>
                  </div>
                  <Switch id="enableTabDetection" name="enableTabDetection" defaultChecked data-testid="switch-tab-detection" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Questions</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addQuestion}
                    disabled={!selectedDomain}
                    data-testid="button-add-question"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {!selectedDomain && (
                  <p className="text-sm text-muted-foreground">
                    Select a domain first to add questions
                  </p>
                )}

                {questions.length > 0 && (
                  <div className="space-y-4">
                    {questions.map((question, qIndex) => (
                      <Card key={qIndex} className="p-4" data-testid={`question-builder-${qIndex}`}>
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-medium">Question {qIndex + 1}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(qIndex)}
                              data-testid={`button-remove-question-${qIndex}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Label>Question Type</Label>
                            <Select
                              value={question.type}
                              onValueChange={(value) => updateQuestion(qIndex, "type", value)}
                            >
                              <SelectTrigger data-testid={`select-question-type-${qIndex}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                <SelectItem value="true_false">True/False</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Question Content *</Label>
                            <Textarea
                              value={question.content}
                              onChange={(e) => updateQuestion(qIndex, "content", e.target.value)}
                              placeholder="Enter your question here..."
                              rows={3}
                              required
                              data-testid={`textarea-question-content-${qIndex}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Options</Label>
                            {question.type === "true_false" ? (
                              <div className="space-y-2">
                                <Input value="True" disabled />
                                <Input value="False" disabled />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {question.options.map((option, oIndex) => (
                                  <Input
                                    key={oIndex}
                                    value={option}
                                    onChange={(e) => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                    placeholder={`Option ${oIndex + 1}`}
                                    data-testid={`input-question-option-${qIndex}-${oIndex}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Correct Answer *</Label>
                            <Select
                              value={question.correctAnswer}
                              onValueChange={(value) => updateQuestion(qIndex, "correctAnswer", value)}
                              required
                            >
                              <SelectTrigger data-testid={`select-correct-answer-${qIndex}`}>
                                <SelectValue placeholder="Select correct answer" />
                              </SelectTrigger>
                              <SelectContent>
                                {question.type === "true_false" ? (
                                  <>
                                    <SelectItem value="True">True</SelectItem>
                                    <SelectItem value="False">False</SelectItem>
                                  </>
                                ) : (
                                  question.options
                                    .filter(opt => opt.trim() !== "")
                                    .map((option, idx) => (
                                      <SelectItem key={idx} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateOpen(false);
                  setQuestions([]);
                  setSelectedDomain(null);
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-exam">
                {createMutation.isPending ? "Creating..." : "Create Exam"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
