import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, UserCog, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@shared/schema";
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

export default function AdministratorsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: admins, isLoading } = useQuery<User[]>({
    queryKey: ["/api/administrators"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/administrators", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      setIsCreateOpen(false);
      toast({
        title: "Success",
        description: "Administrator created successfully",
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/administrators/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      setIsEditOpen(false);
      setSelectedAdmin(null);
      toast({
        title: "Success",
        description: "Administrator updated successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/administrators/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/administrators"] });
      setIsDeleteOpen(false);
      setSelectedAdmin(null);
      toast({
        title: "Success",
        description: "Administrator deleted successfully",
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

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      password: formData.get("password") as string,
    };

    createMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    const formData = new FormData(e.currentTarget);
    
    const data = {
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      password: formData.get("password") as string || undefined,
    };

    updateMutation.mutate({ id: selectedAdmin.id, data });
  };

  const handleEdit = (admin: User) => {
    setSelectedAdmin(admin);
    setIsEditOpen(true);
  };

  const handleDelete = (admin: User) => {
    setSelectedAdmin(admin);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedAdmin) {
      deleteMutation.mutate(selectedAdmin.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Administrators</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage administrator accounts and permissions
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-admin">
          <Plus className="h-4 w-4 mr-2" />
          Add Administrator
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </Card>
      ) : admins && admins.length > 0 ? (
        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id} data-testid={`admin-row-${admin.id}`}>
                  <TableCell className="font-medium" data-testid={`text-admin-name-${admin.id}`}>
                    {admin.firstName} {admin.lastName}
                  </TableCell>
                  <TableCell data-testid={`text-admin-email-${admin.id}`}>
                    {admin.email}
                  </TableCell>
                  <TableCell data-testid={`text-admin-created-${admin.id}`}>
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(admin)}
                        data-testid={`button-edit-admin-${admin.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(admin)}
                        data-testid={`button-delete-admin-${admin.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-admins">No administrators yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create administrator accounts to manage the platform
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-admin">
              <Plus className="h-4 w-4 mr-2" />
              Create First Administrator
            </Button>
          </div>
        </Card>
      )}

      {/* Create Administrator Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Administrator</DialogTitle>
            <DialogDescription>
              Add a new administrator account with full access privileges
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="John"
                required
                data-testid="input-first-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                required
                data-testid="input-last-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
                data-testid="input-password"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-admin">
                {createMutation.isPending ? "Creating..." : "Create Administrator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Administrator Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update administrator details. Leave password blank to keep current password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                defaultValue={selectedAdmin?.firstName || ""}
                placeholder="John"
                required
                data-testid="input-edit-first-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                defaultValue={selectedAdmin?.lastName || ""}
                placeholder="Doe"
                required
                data-testid="input-edit-last-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={selectedAdmin?.email || ""}
                placeholder="admin@example.com"
                required
                data-testid="input-edit-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current password"
                minLength={8}
                data-testid="input-edit-password"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                {updateMutation.isPending ? "Updating..." : "Update Administrator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Administrator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedAdmin?.firstName} {selectedAdmin?.lastName}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
