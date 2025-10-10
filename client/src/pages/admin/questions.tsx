import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { Question, Domain } from "@shared/schema";

export default function QuestionsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [options, setOptions] = useState(["", "", "", ""]);
  const { toast } = useToast();

  const { data: questions, isLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

  const { data: domains } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setIsCreateOpen(false);
      setOptions(["", "", "", ""]);
      toast({
        title: "Success",
        description: "Question created successfully",
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
    
    const filteredOptions = options.filter(opt => opt.trim() !== "");
    
    const data = {
      domainId: parseInt(formData.get("domainId") as string),
      type: formData.get("type") as string,
      content: formData.get("content") as string,
      options: filteredOptions,
      correctAnswer: formData.get("correctAnswer") as string,
    };

    createMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Questions</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage your question bank
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-question">
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id} className="p-6" data-testid={`question-card-${question.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      {question.type === "multiple_choice" ? "Multiple Choice" : "True/False"}
                    </Badge>
                    <p className="font-medium flex-1" data-testid={`text-question-content-${question.id}`}>
                      {question.content}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pl-20">
                    {(question.options as string[]).map((option, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded-md ${
                          option === question.correctAnswer
                            ? "bg-chart-2/10 text-chart-2 font-medium"
                            : "bg-muted/50"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" data-testid={`button-edit-question-${question.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" data-testid={`button-delete-question-${question.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2" data-testid="text-no-questions">No questions added yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Start building your question bank
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-first-question">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Question
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>
              Create a new question for your question bank
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="domainId">Domain *</Label>
                  <Select name="domainId" required>
                    <SelectTrigger data-testid="select-question-domain">
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
                  <Label htmlFor="type">Question Type *</Label>
                  <Select name="type" defaultValue="multiple_choice" required>
                    <SelectTrigger data-testid="select-question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Question Content *</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Enter your question here..."
                  rows={3}
                  required
                  data-testid="input-question-content"
                />
              </div>

              <div className="space-y-3">
                <Label>Answer Options *</Label>
                {options.map((option, index) => (
                  <Input
                    key={index}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    required={index < 2}
                    data-testid={`input-option-${index}`}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctAnswer">Correct Answer *</Label>
                <Select name="correctAnswer" required>
                  <SelectTrigger data-testid="select-correct-answer">
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.filter(opt => opt.trim() !== "").map((option, index) => (
                      <SelectItem key={index} value={option}>
                        {String.fromCharCode(65 + index)}. {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-question">
                {createMutation.isPending ? "Adding..." : "Add Question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
