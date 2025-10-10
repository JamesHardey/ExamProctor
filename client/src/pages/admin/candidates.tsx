import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, UserPlus, Upload, Download, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";
import { exportExamResultsCSV, exportExamResultsPDF } from "@/lib/exportReports";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Candidate, User, Exam } from "@shared/schema";

interface CandidateWithDetails extends Candidate {
  user?: User;
  exam?: Exam;
}

export default function CandidatesPage() {
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<CandidateWithDetails[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: exams } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const assignMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/candidates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsAssignOpen(false);
      toast({
        title: "Success",
        description: "Exam assigned to candidate successfully",
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

  const bulkImportMutation = useMutation({
    mutationFn: async (data: any[]) => {
      return await apiRequest("POST", "/api/candidates/bulk-import", { candidates: data });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      setIsImportOpen(false);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${response.successful} candidates. ${response.failed > 0 ? `${response.failed} failed.` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      userId: formData.get("userId") as string,
      examId: parseInt(formData.get("examId") as string),
    };

    assignMutation.mutate(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const validData = results.data
          .filter((row: any) => row.email && row.examId)
          .map((row: any) => ({
            email: row.email.trim(),
            examId: parseInt(row.examId),
            firstName: row.firstName?.trim() || '',
            lastName: row.lastName?.trim() || '',
          }));

        if (validData.length === 0) {
          toast({
            title: "No Valid Data",
            description: "The CSV file contains no valid candidate entries.",
            variant: "destructive",
          });
          return;
        }

        bulkImportMutation.mutate(validData);
      },
      error: (error) => {
        toast({
          title: "CSV Parse Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = 'email,firstName,lastName,examId\ncandidate@example.com,John,Doe,1\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-chart-2/10 text-chart-2";
      case "in_progress":
        return "bg-chart-3/10 text-chart-3";
      case "auto_submitted":
        return "bg-chart-4/10 text-chart-4";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Candidates</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage candidate enrollments and exam assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => candidates && exportExamResultsCSV(candidates)} variant="outline" data-testid="button-export-csv">
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => candidates && exportExamResultsPDF(candidates)} variant="outline" data-testid="button-export-pdf">
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => setIsImportOpen(true)} variant="outline" data-testid="button-import-csv">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsAssignOpen(true)} data-testid="button-assign-exam">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Exam
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : candidates && candidates.length > 0 ? (
        <div className="space-y-4">
          {candidates.map((candidate) => {
            const user = candidate.user;
            const initials = user?.firstName && user?.lastName 
              ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
              : user?.email?.[0]?.toUpperCase() || "U";

            return (
              <Card key={candidate.id} className="p-6" data-testid={`candidate-card-${candidate.id}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user?.profileImageUrl || undefined} className="object-cover" />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <p className="font-medium" data-testid={`text-candidate-name-${candidate.id}`}>
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email || "Unknown User"}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-candidate-exam-${candidate.id}`}>
                        {candidate.exam?.title || "Unknown Exam"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {candidate.score !== null && (
                      <div className="text-right">
                        <p className="text-2xl font-bold" data-testid={`text-candidate-score-${candidate.id}`}>
                          {candidate.score}%
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    )}
                    
                    <Badge className={getStatusColor(candidate.status)} data-testid={`badge-candidate-status-${candidate.id}`}>
                      {candidate.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2" data-testid="text-no-candidates">No candidates assigned yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Assign exams to candidates to get started
            </p>
            <Button onClick={() => setIsAssignOpen(true)} data-testid="button-assign-first-exam">
              <UserPlus className="h-4 w-4 mr-2" />
              Assign First Exam
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Exam to Candidate</DialogTitle>
            <DialogDescription>
              Select a candidate and exam to create a new assignment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Candidate *</Label>
                <Select name="userId" required>
                  <SelectTrigger data-testid="select-candidate-user">
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.filter(u => u.role === "candidate").map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="examId">Exam *</Label>
                <Select name="examId" required>
                  <SelectTrigger data-testid="select-candidate-exam">
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams?.filter(e => e.status === "active").map((exam) => (
                      <SelectItem key={exam.id} value={exam.id.toString()}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={assignMutation.isPending} data-testid="button-submit-assignment">
                {assignMutation.isPending ? "Assigning..." : "Assign Exam"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Candidates from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import candidates and assign exams
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                CSV should include: email, firstName, lastName, examId
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-csv-file"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={bulkImportMutation.isPending}
                className="w-full"
                data-testid="button-select-csv"
              >
                <Upload className="h-4 w-4 mr-2" />
                {bulkImportMutation.isPending ? "Importing..." : "Select CSV File"}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportOpen(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
