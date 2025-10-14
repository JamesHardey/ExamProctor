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
import { ArrowLeft, Plus, Save, Upload, Download, X, Sparkles, Pencil, Trash2, FileText, Camera, Eye, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Exam, Domain, ProctorLog, Candidate, User } from "@shared/schema";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type QuestionInput = {
  type: "multiple_choice" | "true_false";
  content: string;
  options: string[];
  correctAnswer: string;
};

interface ProctorLogWithDetails extends ProctorLog {
  candidate?: Candidate & { user?: User };
}

export default function ExamManagePage() {
  const [, params] = useRoute("/exams/:id/manage");
  const [, setLocation] = useLocation();
  const examId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [newQuestions, setNewQuestions] = useState<QuestionInput[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [documentContent, setDocumentContent] = useState<string>("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [importResults, setImportResults] = useState<any>(null);
  const [importedCandidates, setImportedCandidates] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);
  const [manualCandidateForm, setManualCandidateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    matricNo: "",
  });
  const [candidateToDelete, setCandidateToDelete] = useState<number | null>(null);
  
  // Form state for settings
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    domainId: 0,
    duration: 0,
    questionCount: 0,
    showResults: "delayed" as "immediate" | "delayed" | "hidden",
    status: "draft" as "draft" | "active" | "inactive",
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

  const { data: examCandidates, refetch: refetchCandidates } = useQuery<any[]>({
    queryKey: ["/api/exams", examId, "candidates"],
    enabled: !!examId,
  });

  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/monitoring/active", examId],
    queryFn: () => fetch(`/api/monitoring/active?examId=${examId}`).then(res => res.json()),
    enabled: !!examId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: logs, isLoading: logsLoading } = useQuery<ProctorLogWithDetails[]>({
    queryKey: ["/api/monitoring/logs", examId],
    queryFn: () => fetch(`/api/monitoring/logs?examId=${examId}`).then(res => res.json()),
    enabled: !!examId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Helper functions for monitoring
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

  // Generate cryptographically secure password for candidates
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(array[i] % chars.length);
    }
    return password;
  };

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
        status: exam.status as "draft" | "active" | "inactive",
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
        documentContent: documentContent || undefined,
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

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/questions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "questions"] });
      refetchQuestions();
      setEditingQuestion(null);
      toast({
        title: "Success",
        description: "Question updated successfully",
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

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/questions/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "questions"] });
      refetchQuestions();
      setDeletingQuestionId(null);
      toast({
        title: "Success",
        description: "Question deleted successfully",
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

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, candidateId }: { userId: string; candidateId: number }) => {
      const password = generatePassword();
      const response = await apiRequest("POST", "/api/users/reset-password", {
        userId,
        password,
      });
      return { ...response, password, candidateId };
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset Successfully",
        description: `New Password: ${data.password}`,
        duration: 15000,
      });
      
      // Add to imported candidates list for download
      const candidate = examCandidates?.find(c => c.id === data.candidateId);
      if (candidate) {
        const resetCandidate = {
          fullName: `${candidate.user?.firstName} ${candidate.user?.lastName}`,
          email: candidate.user?.email,
          department: candidate.user?.department,
          matricNo: candidate.user?.matricNo,
          password: data.password,
        };
        setImportedCandidates(prev => [...prev, resetCandidate]);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const allowRetakeMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      return await apiRequest("POST", `/api/candidates/${candidateId}/allow-retake`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "candidates"] });
      refetchCandidates();
      toast({
        title: "Retake Allowed",
        description: "Candidate can now retake the exam",
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

  const deleteCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      return await apiRequest("DELETE", `/api/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "candidates"] });
      refetchCandidates();
      setCandidateToDelete(null);
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
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

  const addManualCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      // Check if user already exists
      const checkResponse = await apiRequest("GET", `/api/users/check-email?email=${encodeURIComponent(candidateData.email)}`);
      const userExists = checkResponse?.exists;
      
      // Only generate password for new users
      const password = userExists ? null : generatePassword();
      
      // Use bulk import endpoint with single candidate
      const response = await apiRequest("POST", "/api/candidates/bulk-import", {
        candidates: [{
          email: candidateData.email,
          firstName: candidateData.firstName,
          lastName: candidateData.lastName,
          department: candidateData.department,
          matricNo: candidateData.matricNo,
          examId: examId,
          password: password || undefined, // Don't send password if user exists
        }]
      });

      return { response, password, candidateData, userExists };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "candidates"] });
      refetchCandidates();
      
      // Only add to imported candidates if it's a new user with a password
      if (data.password && !data.userExists) {
        const newCandidate = {
          fullName: `${data.candidateData.firstName} ${data.candidateData.lastName}`,
          email: data.candidateData.email,
          department: data.candidateData.department,
          matricNo: data.candidateData.matricNo,
          password: data.password,
        };
        setImportedCandidates(prev => [...prev, newCandidate]);
      }
      
      setManualCandidateForm({
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        matricNo: "",
      });
      
      // Different toast message for existing vs new users
      if (data.userExists) {
        toast({
          title: "Candidate Assigned to Exam",
          description: `${data.candidateData.email} has been assigned to this exam. They will use their existing password.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "New Candidate Created",
          description: `Email: ${data.candidateData.email} | Password: ${data.password}`,
          duration: 10000,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
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

  const handleExportResultsCSV = () => {
    if (!examCandidates) return;
    
    const completedCandidates = examCandidates.filter(
      c => c.status === "completed" || c.status === "auto_submitted"
    );
    
    if (completedCandidates.length === 0) return;

    const csvData = completedCandidates.map(c => ({
      'Name': `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(),
      'Email': c.user?.email || '',
      'Department': c.user?.department || '-',
      'Matric No': c.user?.matricNo || '-',
      'Score': c.score !== null && c.score !== undefined ? `${c.score}%` : 'N/A',
      'Status': c.status === 'auto_submitted' ? 'Auto-Submitted' : 'Completed',
      'Completed At': c.completedAt ? new Date(c.completedAt).toLocaleString() : '-',
    }));

    const csvContent = Papa.unparse(csvData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam?.title || 'exam'}-results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Successful",
      description: "Results exported to CSV successfully",
    });
  };

  const handleExportResultsPDF = () => {
    if (!examCandidates || !exam) return;
    
    const completedCandidates = examCandidates.filter(
      c => c.status === "completed" || c.status === "auto_submitted"
    );
    
    if (completedCandidates.length === 0) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Exam Results: ${exam.title}`, 14, 20);
    
    // Add exam info
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Candidates: ${completedCandidates.length}`, 14, 36);
    
    // Prepare table data
    const tableData = completedCandidates.map(c => [
      `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(),
      c.user?.email || '',
      c.user?.department || '-',
      c.user?.matricNo || '-',
      c.score !== null && c.score !== undefined ? `${c.score}%` : 'N/A',
      c.status === 'auto_submitted' ? 'Auto-Submitted' : 'Completed',
      c.completedAt ? new Date(c.completedAt).toLocaleString() : '-',
    ]);
    
    // Add table
    (doc as any).autoTable({
      head: [['Name', 'Email', 'Department', 'Matric No', 'Score', 'Status', 'Completed At']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 45 },
    });
    
    // Save PDF
    doc.save(`${exam.title || 'exam'}-results.pdf`);
    
    toast({
      title: "Export Successful",
      description: "Results exported to PDF successfully",
    });
  };

  const handleExportLogs = async () => {
    if (!examId) return;

    try {
      const response = await fetch(`/api/monitoring/logs/export?examId=${examId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to export logs');
      }

      const logsData: ProctorLogWithDetails[] = await response.json();

      if (!Array.isArray(logsData) || logsData.length === 0) {
        toast({
          title: "No Logs",
          description: "There are no proctoring logs to export for this exam",
        });
        return;
      }

      const csvData = logsData.map(log => ({
        'Timestamp': log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A',
        'Candidate Name': log.candidate?.user?.firstName && log.candidate?.user?.lastName
          ? `${log.candidate.user.firstName} ${log.candidate.user.lastName}`
          : 'Unknown',
        'Email': log.candidate?.user?.email || 'Unknown',
        'Event Type': log.eventType ? log.eventType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown',
        'Severity': log.severity || 'N/A',
        'Metadata': log.metadata ? JSON.stringify(log.metadata) : '-',
      }));

      const csvContent = Papa.unparse(csvData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exam?.title || 'exam'}-proctoring-logs.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${logsData.length} proctoring log(s) to CSV`,
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export proctoring logs",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF, Word, or PowerPoint document",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await fetch('/api/ai/extract-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract document text');
      }

      const data = await response.json();
      setDocumentContent(data.text);
      setUploadedDocName(file.name);
      
      toast({
        title: "Document Uploaded",
        description: `Successfully extracted text from ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const clearDocument = () => {
    setDocumentContent("");
    setUploadedDocName("");
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
          <TabsTrigger value="candidates" data-testid="tab-candidates">Candidates</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="tab-monitoring">Live Monitoring</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
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
                      <SelectItem value="inactive">Archived</SelectItem>
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="document-manage">Upload Document (Optional)</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a PDF, Word, or PowerPoint document to generate questions based on its content
                    </p>
                    {!uploadedDocName ? (
                      <div className="flex items-center gap-2">
                        <Input
                          id="document-manage"
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={handleDocumentUpload}
                          disabled={isUploadingDoc}
                          data-testid="input-document-upload-manage"
                        />
                        {isUploadingDoc && <span className="text-sm text-muted-foreground">Uploading...</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{uploadedDocName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearDocument}
                          data-testid="button-clear-document-manage"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {documentContent 
                        ? "Questions will be generated from the uploaded document content" 
                        : "Without a document, AI will generate questions based on exam title, domain, and description"}
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingQuestion(q)}
                            disabled={updateQuestionMutation.isPending || deleteQuestionMutation.isPending}
                            data-testid={`button-edit-question-${index}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setDeletingQuestionId(q.id)}
                            disabled={updateQuestionMutation.isPending || deleteQuestionMutation.isPending}
                            data-testid={`button-delete-question-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
          {/* Manual Candidate Addition */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add Candidate Manually</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addManualCandidateMutation.mutate(manualCandidateForm);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={manualCandidateForm.firstName}
                    onChange={(e) => setManualCandidateForm({ ...manualCandidateForm, firstName: e.target.value })}
                    placeholder="John"
                    required
                    data-testid="input-candidate-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={manualCandidateForm.lastName}
                    onChange={(e) => setManualCandidateForm({ ...manualCandidateForm, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                    data-testid="input-candidate-lastname"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={manualCandidateForm.email}
                  onChange={(e) => setManualCandidateForm({ ...manualCandidateForm, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  required
                  data-testid="input-candidate-email"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={manualCandidateForm.department}
                    onChange={(e) => setManualCandidateForm({ ...manualCandidateForm, department: e.target.value })}
                    placeholder="Computer Science"
                    data-testid="input-candidate-department"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matricNo">Matric No</Label>
                  <Input
                    id="matricNo"
                    value={manualCandidateForm.matricNo}
                    onChange={(e) => setManualCandidateForm({ ...manualCandidateForm, matricNo: e.target.value })}
                    placeholder="CS/2024/001"
                    data-testid="input-candidate-matricno"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={addManualCandidateMutation.isPending}
                data-testid="button-add-candidate"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addManualCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
              </Button>
            </form>
          </Card>

          {/* Bulk Import */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Import Candidates (Bulk)</h3>
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

          {/* Existing Candidates for this Exam */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Enrolled Candidates ({examCandidates?.length || 0})
            </h3>
            {examCandidates && examCandidates.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Department</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Matric No</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examCandidates.map((candidate: any, idx: number) => (
                      <tr key={candidate.id} className="border-t" data-testid={`enrolled-candidate-${idx}`}>
                        <td className="px-4 py-2 text-sm">
                          {candidate.user?.firstName} {candidate.user?.lastName}
                        </td>
                        <td className="px-4 py-2 text-sm">{candidate.user?.email}</td>
                        <td className="px-4 py-2 text-sm">{candidate.user?.department || "-"}</td>
                        <td className="px-4 py-2 text-sm">{candidate.user?.matricNo || "-"}</td>
                        <td className="px-4 py-2 text-sm">
                          <Badge variant={
                            candidate.status === "completed" ? "default" :
                            candidate.status === "in_progress" ? "secondary" : "outline"
                          }>
                            {candidate.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resetPasswordMutation.mutate({ 
                                userId: candidate.user?.id, 
                                candidateId: candidate.id 
                              })}
                              disabled={resetPasswordMutation.isPending}
                              data-testid={`button-reset-password-${idx}`}
                            >
                              Reset Password
                            </Button>
                            {candidate.status === "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => allowRetakeMutation.mutate(candidate.id)}
                                disabled={allowRetakeMutation.isPending}
                                data-testid={`button-allow-retake-${idx}`}
                              >
                                Allow Retake
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCandidateToDelete(candidate.id)}
                              data-testid={`button-delete-candidate-${idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No candidates enrolled yet</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Exam Results</h3>
              {examCandidates && examCandidates.filter(c => c.status === "completed" || c.status === "auto_submitted").length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResultsCSV}
                    data-testid="button-export-csv"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportResultsPDF}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              )}
            </div>
            
            {examCandidates && examCandidates.filter(c => c.status === "completed" || c.status === "auto_submitted").length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Department</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Matric No</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Score</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examCandidates
                      .filter(c => c.status === "completed" || c.status === "auto_submitted")
                      .map((candidate: any, idx: number) => (
                        <tr key={candidate.id} className="border-t" data-testid={`result-row-${idx}`}>
                          <td className="px-4 py-2 text-sm">
                            {candidate.user?.firstName} {candidate.user?.lastName}
                          </td>
                          <td className="px-4 py-2 text-sm">{candidate.user?.email}</td>
                          <td className="px-4 py-2 text-sm">{candidate.user?.department || "-"}</td>
                          <td className="px-4 py-2 text-sm">{candidate.user?.matricNo || "-"}</td>
                          <td className="px-4 py-2 text-sm">
                            <Badge variant={
                              candidate.score !== null && candidate.score !== undefined && candidate.score >= 70 ? "default" : "destructive"
                            }>
                              {candidate.score !== null && candidate.score !== undefined ? `${candidate.score}%` : "N/A"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <Badge variant={
                              candidate.status === "completed" ? "default" : "secondary"
                            }>
                              {candidate.status === "auto_submitted" ? "Auto-Submitted" : "Completed"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {candidate.completedAt 
                              ? new Date(candidate.completedAt).toLocaleString()
                              : "-"
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed exams yet
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Active Exam Sessions</h3>
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

                      <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-3">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Camera Feed</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Time Remaining:</span>
                        <span className="font-medium font-mono">{session.timeRemaining || "45:32"}</span>
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
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Proctoring Events</h3>
              <Button
                onClick={handleExportLogs}
                variant="outline"
                size="sm"
                data-testid="button-export-logs"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </div>
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
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Update the question details below
            </DialogDescription>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={editingQuestion.type}
                  onValueChange={(value) => setEditingQuestion({ ...editingQuestion, type: value })}
                >
                  <SelectTrigger data-testid="select-edit-question-type">
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
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  placeholder="Enter question text"
                  data-testid="input-edit-question-content"
                />
              </div>

              {editingQuestion.type === "multiple_choice" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {(editingQuestion.options as string[]).map((option, idx) => (
                    <Input
                      key={idx}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(editingQuestion.options as string[])];
                        newOptions[idx] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      data-testid={`input-edit-option-${idx}`}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select
                  value={editingQuestion.correctAnswer}
                  onValueChange={(value) => setEditingQuestion({ ...editingQuestion, correctAnswer: value })}
                >
                  <SelectTrigger data-testid="select-edit-correct-answer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editingQuestion.type === "true_false" ? (
                      <>
                        <SelectItem value="True">True</SelectItem>
                        <SelectItem value="False">False</SelectItem>
                      </>
                    ) : (
                      (editingQuestion.options as string[])
                        .filter(opt => opt.trim() !== "")
                        .map((opt, idx) => (
                          <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingQuestion(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateQuestionMutation.mutate({
                      id: editingQuestion.id,
                      data: {
                        type: editingQuestion.type,
                        content: editingQuestion.content,
                        options: editingQuestion.options,
                        correctAnswer: editingQuestion.correctAnswer,
                        domainId: editingQuestion.domainId,
                      },
                    });
                  }}
                  disabled={updateQuestionMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateQuestionMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Question Confirmation */}
      <AlertDialog open={!!deletingQuestionId} onOpenChange={(open) => !open && setDeletingQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingQuestionId) {
                  deleteQuestionMutation.mutate(deletingQuestionId);
                }
              }}
              data-testid="button-confirm-delete"
            >
              {deleteQuestionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Candidate Confirmation */}
      <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this candidate? This action cannot be undone.
              All associated responses and proctoring logs will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-candidate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (candidateToDelete) {
                  deleteCandidateMutation.mutate(candidateToDelete);
                }
              }}
              data-testid="button-confirm-delete-candidate"
            >
              {deleteCandidateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
