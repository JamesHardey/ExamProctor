import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Save, Upload, Download, X, Sparkles, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Exam, Domain } from "@shared/schema";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type QuestionInput = {
  type: "multiple_choice" | "true_false";
  content: string;
  options: string[];
  correctAnswer: string;
};

export default function ExamManagePage() {
  const [, params] = useRoute("/exams/:id/manage");
  const [, setLocation] = useLocation();
  const examId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [newQuestions, setNewQuestions] = useState<QuestionInput[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [importResults, setImportResults] = useState<any>(null);
  const [importedCandidates, setImportedCandidates] = useState<any[]>([]);
  
  // Form state for settings
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    domainId: 0,
    duration: 0,
    questionCount: 0,
    showResults: "delayed" as "immediate" | "delayed" | "hidden",
    status: "draft" as "draft" | "active" | "archived",
    enableWebcam: true,
    enableTabDetection: true,
  });

  const { data: exam, isLoading: examLoading } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
    enabled: !!examId,
  });

  const { data: domains } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: examQuestions, refetch: refetchQuestions } = useQuery<any[]>({
    queryKey: ["/api/exams", examId, "questions"],
    enabled: !!examId,
  });

  // Initialize form data when exam loads
  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title,
        description: exam.description || "",
        domainId: exam.domainId,
        duration: exam.duration,
        questionCount: exam.questionCount,
        showResults: exam.showResults as "immediate" | "delayed" | "hidden",
        status: exam.status as "draft" | "active" | "archived",
        enableWebcam: exam.enableWebcam ?? true,
        enableTabDetection: exam.enableTabDetection ?? true,
      });
    }
  }, [exam]);

  const updateExamMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/exams/${examId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId] });
      toast({
        title: "Success",
        description: "Exam updated successfully",
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

  const addQuestionsMutation = useMutation({
    mutationFn: async ({ examId, questions }: { examId: number; questions: any[] }) => {
      return await apiRequest("POST", `/api/exams/${examId}/questions`, { questions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "questions"] });
      setNewQuestions([]);
      refetchQuestions();
      toast({
        title: "Success",
        description: "Questions added successfully",
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

  const generateAIQuestionsMutation = useMutation({
    mutationFn: async () => {
      if (!exam) throw new Error("Exam not found");
      
      const response = await apiRequest("POST", "/api/ai/generate-questions", {
        examTitle: exam.title,
        domainId: exam.domainId,
        description: exam.description || "",
        count: aiQuestionCount,
      });
      
      if (!response?.questions || !Array.isArray(response.questions)) {
        throw new Error("Invalid response from AI service");
      }
      
      // Convert AI response to proper format
      // AI service returns options as JSON string, but backend expects array
      const generatedQuestions = response.questions.map((q: any) => ({
        domainId: exam!.domainId,
        type: q.type,
        content: q.content,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correctAnswer,
      }));
      
      await apiRequest("POST", `/api/exams/${examId}/questions`, { questions: generatedQuestions });
      
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "questions"] });
      refetchQuestions();
      setUseAI(false);
      setAiQuestionCount(5);
      toast({
        title: "Success",
        description: `${data?.questions?.length || 0} questions generated and added successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI questions",
        variant: "destructive",
      });
    },
  });

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateExamMutation.mutate(formData);
  };

  const addNewQuestion = () => {
    setNewQuestions([...newQuestions, {
      type: "multiple_choice",
      content: "",
      options: ["", "", "", ""],
      correctAnswer: "",
    }]);
  };

  const removeNewQuestion = (index: number) => {
    setNewQuestions(newQuestions.filter((_, i) => i !== index));
  };

  const updateNewQuestion = (index: number, field: keyof QuestionInput, value: any) => {
    const updated = [...newQuestions];
    if (field === "type") {
      if (value === "true_false") {
        updated[index] = { 
          ...updated[index], 
          type: value, 
          options: ["True", "False"],
          correctAnswer: "True"
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
    setNewQuestions(updated);
  };

  const updateNewQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...newQuestions];
    updated[questionIndex].options[optionIndex] = value;
    setNewQuestions(updated);
  };

  const handleAddQuestionsSubmit = () => {
    if (!exam || newQuestions.length === 0) return;
    
    const questionsData = newQuestions.map(q => ({
      domainId: exam.domainId,
      type: q.type,
      content: q.content,
      options: q.options.filter(opt => opt.trim() !== ""),
      correctAnswer: q.correctAnswer,
    }));

    addQuestionsMutation.mutate({ examId: exam.id, questions: questionsData });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !exam) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    const processData = async (rows: any[]) => {
      const candidatesData = rows.map((row: any) => {
        const fullName = row['FULL NAME'] || row['Full Name'] || row['full name'] || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const password = generatePassword();

        return {
          email: row['EMAIL'] || row['Email'] || row['email'] || '',
          firstName,
          lastName,
          fullName,
          department: row['DEPT'] || row['Dept'] || row['dept'] || '',
          matricNo: row['MATRIC NO'] || row['Matric No'] || row['matric no'] || '',
          examId: exam.id,
          password,
        };
      }).filter(c => c.email); // Filter out rows without email

      if (candidatesData.length === 0) {
        toast({
          title: "Error",
          description: "No valid candidates found in file",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await apiRequest("POST", "/api/candidates/bulk-import", {
          candidates: candidatesData,
        });

        setImportResults(response);
        setImportedCandidates(candidatesData);
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${response.successful} candidates`,
        });
      } catch (error: any) {
        toast({
          title: "Import Failed",
          description: error.message || "Failed to import candidates",
          variant: "destructive",
        });
      }
    };

    if (isExcel) {
      // Handle Excel files
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        processData(jsonData);
      };
      reader.readAsBinaryString(file);
    } else {
      // Handle CSV files
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          processData(results.data);
        },
        error: (error) => {
          toast({
            title: "Parse Error",
            description: error.message || "Failed to parse CSV file",
            variant: "destructive",
          });
        },
      });
    }
  };

  const handleDownloadCredentials = () => {
    if (importedCandidates.length === 0) return;

    const csvContent = Papa.unparse(importedCandidates.map(c => ({
      'Full Name': c.fullName,
      'Email': c.email,
      'Department': c.department,
      'Matric No': c.matricNo,
      'Password': c.password,
    })));

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam?.title || 'exam'}-credentials.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!examId || examLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-6">
        <p className="text-destructive">Exam not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/exams")}
          data-testid="button-back-to-exams"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold" data-testid="text-exam-title">
            {exam.title}
          </h1>
          <p className="text-muted-foreground">Manage exam settings, questions, and candidates</p>
        </div>
        <Badge variant={exam.status === "active" ? "default" : "secondary"} data-testid="badge-exam-status">
          {exam.status}
        </Badge>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
          <TabsTrigger value="candidates" data-testid="tab-candidates">Candidates</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Exam Settings</h3>
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-exam-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  data-testid="input-exam-description"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="domainId">Domain *</Label>
                  <Select 
                    value={formData.domainId.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, domainId: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="select-domain">
                      <SelectValue />
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
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    required
                    data-testid="input-duration"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="questionCount">Number of Questions *</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    value={formData.questionCount}
                    onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 0 })}
                    required
                    data-testid="input-question-count"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="showResults">Result Visibility *</Label>
                  <Select 
                    value={formData.showResults} 
                    onValueChange={(value: any) => setFormData({ ...formData, showResults: value })}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
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
                  <Switch 
                    id="enableWebcam" 
                    checked={formData.enableWebcam}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableWebcam: checked })}
                    data-testid="switch-webcam" 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableTabDetection">Tab Switch Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor and log when candidates switch tabs
                    </p>
                  </div>
                  <Switch 
                    id="enableTabDetection" 
                    checked={formData.enableTabDetection}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableTabDetection: checked })}
                    data-testid="switch-tab-detection" 
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateExamMutation.isPending} data-testid="button-save-settings">
                  <Save className="h-4 w-4 mr-2" />
                  {updateExamMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Exam Questions</h3>
            
            <div className="space-y-4 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useAI">Generate Questions with AI</Label>
                  <p className="text-sm text-muted-foreground">
                    Use AI to automatically generate exam questions
                  </p>
                </div>
                <Switch 
                  id="useAI" 
                  checked={useAI}
                  onCheckedChange={setUseAI}
                  data-testid="switch-use-ai-questions" 
                />
              </div>

              {useAI && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="aiQuestionCount">Number of AI Questions</Label>
                    <Input
                      id="aiQuestionCount"
                      type="number"
                      min="1"
                      max="50"
                      value={aiQuestionCount}
                      onChange={(e) => setAiQuestionCount(parseInt(e.target.value) || 5)}
                      placeholder="5"
                      data-testid="input-ai-question-count"
                    />
                    <p className="text-sm text-muted-foreground">
                      AI will generate questions based on exam title, domain, and description
                    </p>
                  </div>
                  <Button
                    onClick={() => generateAIQuestionsMutation.mutate()}
                    disabled={generateAIQuestionsMutation.isPending}
                    data-testid="button-generate-ai-questions"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generateAIQuestionsMutation.isPending ? "Generating..." : "Generate AI Questions"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between my-4">
              <h4 className="font-medium">Manual Questions</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addNewQuestion}
                data-testid="button-add-question"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {examQuestions && examQuestions.length > 0 ? (
              <div className="space-y-4 mb-6">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Existing Questions ({examQuestions.length})
                </h4>
                {examQuestions.map((q, index) => (
                  <Card key={q.id} className="p-4" data-testid={`existing-question-${index}`}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2 flex-1">
                          <Badge variant="outline" className="mt-1">{q.type === "multiple_choice" ? "Multiple Choice" : "True/False"}</Badge>
                          <p className="font-medium flex-1">{q.content}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            // Navigate to Questions page to edit
                            window.location.href = '/admin/questions';
                          }}
                          data-testid={`button-edit-existing-${index}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Answer Options:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(q.options as string[]).map((option, oIndex) => (
                            <div
                              key={oIndex}
                              className={`text-sm p-2 rounded-md border ${
                                option === q.correctAnswer
                                  ? "bg-chart-2/10 border-chart-2 text-chart-2 font-medium"
                                  : "bg-muted/30 border-border"
                              }`}
                              data-testid={`existing-option-${index}-${oIndex}`}
                            >
                              <span className="font-semibold">{String.fromCharCode(65 + oIndex)}.</span> {option}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ✓ Correct Answer: <span className="font-medium text-chart-2">{q.correctAnswer}</span>
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">No questions added yet</p>
            )}

            {newQuestions.length > 0 && (
              <div className="space-y-4 border-t pt-6">
                <h4 className="font-medium">New Questions</h4>
                {newQuestions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-4" data-testid={`new-question-${qIndex}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h5 className="font-medium">Question {qIndex + 1}</h5>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewQuestion(qIndex)}
                          data-testid={`button-remove-new-question-${qIndex}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) => updateNewQuestion(qIndex, "type", value)}
                        >
                          <SelectTrigger data-testid={`select-new-question-type-${qIndex}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True/False</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Question Content</Label>
                        <Textarea
                          value={question.content}
                          onChange={(e) => updateNewQuestion(qIndex, "content", e.target.value)}
                          placeholder="Enter your question here"
                          rows={2}
                          data-testid={`textarea-new-question-content-${qIndex}`}
                        />
                      </div>

                      {question.type === "multiple_choice" ? (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {question.options.map((option, oIndex) => (
                            <Input
                              key={oIndex}
                              value={option}
                              onChange={(e) => updateNewQuestionOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              data-testid={`input-new-question-option-${qIndex}-${oIndex}`}
                            />
                          ))}
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Select
                          value={question.correctAnswer}
                          onValueChange={(value) => updateNewQuestion(qIndex, "correctAnswer", value)}
                        >
                          <SelectTrigger data-testid={`select-new-correct-answer-${qIndex}`}>
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
                                .map((opt, idx) => (
                                  <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewQuestions([])}
                    data-testid="button-cancel-new-questions"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddQuestionsSubmit}
                    disabled={addQuestionsMutation.isPending}
                    data-testid="button-submit-new-questions"
                  >
                    {addQuestionsMutation.isPending ? "Adding..." : "Add Questions"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Import Candidates</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-upload">Upload CSV or Excel File</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  data-testid="input-csv-upload"
                />
                <p className="text-sm text-muted-foreground">
                  File should have columns: FULL NAME, EMAIL, DEPT, MATRIC NO
                </p>
              </div>
              
              {importResults && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium">Import Results</h4>
                  <p className="text-sm">
                    ✓ Successfully imported: <span className="font-semibold">{importResults.successful}</span>
                  </p>
                  {importResults.failed > 0 && (
                    <p className="text-sm text-destructive">
                      ✗ Failed: <span className="font-semibold">{importResults.failed}</span>
                    </p>
                  )}
                  {importResults.errors.length > 0 && (
                    <div className="space-y-1 mt-2">
                      <p className="text-sm font-medium">Errors:</p>
                      {importResults.errors.map((error: string, idx: number) => (
                        <p key={idx} className="text-sm text-destructive">• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {importedCandidates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Successfully Imported Candidates ({importedCandidates.length})</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium">Full Name</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Department</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Matric No</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedCandidates.map((candidate: any, idx: number) => (
                          <tr key={idx} className="border-t" data-testid={`imported-candidate-${idx}`}>
                            <td className="px-4 py-2 text-sm">{candidate.fullName}</td>
                            <td className="px-4 py-2 text-sm">{candidate.email}</td>
                            <td className="px-4 py-2 text-sm">{candidate.department}</td>
                            <td className="px-4 py-2 text-sm">{candidate.matricNo}</td>
                            <td className="px-4 py-2 text-sm font-mono">{candidate.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadCredentials}
                    data-testid="button-download-credentials"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Credentials
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Exam Results</h3>
            <p className="text-sm text-muted-foreground">
              View results of candidates who have taken this exam (coming soon)
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
