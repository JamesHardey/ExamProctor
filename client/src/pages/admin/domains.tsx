import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, FolderOpen } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { Domain } from "@shared/schema";

export default function DomainsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: domains, isLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/domains", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setIsCreateOpen(false);
      toast({
        title: "Success",
        description: "Domain created successfully",
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
    
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    };

    createMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Domains</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Organize questions and exams by subject area
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-domain">
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : domains && domains.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => (
            <Card key={domain.id} className="p-6 hover-elevate" data-testid={`domain-card-${domain.id}`}>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1" data-testid={`text-domain-name-${domain.id}`}>
                    {domain.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {domain.description || "No description"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-domains">No domains created yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create subject domains to organize your questions and exams
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-domain">
              <Plus className="h-4 w-4 mr-2" />
              Create First Domain
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Domain</DialogTitle>
            <DialogDescription>
              Add a new subject area for organizing questions and exams
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Domain Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Mathematics, Physics, History"
                required
                data-testid="input-domain-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of this subject area"
                rows={3}
                data-testid="input-domain-description"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-domain">
                {createMutation.isPending ? "Creating..." : "Create Domain"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
