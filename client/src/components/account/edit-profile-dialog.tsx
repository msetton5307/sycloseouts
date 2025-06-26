import { ReactNode, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export function EditProfileDialog({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      company: user?.company || "",
      phone: user?.phone || "",
      address: user?.address || "",
      avatarUrl: user?.avatarUrl || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("PUT", "/api/users/me", data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        form.setValue("avatarUrl", event.target.result.toString());
      }
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setUploading(false);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your image.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your account details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Image URL or uploaded data" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={triggerFileUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Button>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
