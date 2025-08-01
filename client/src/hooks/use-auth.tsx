import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Create a login schema manually since insertUserSchema is already processed
export const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// Create a base registration schema that other forms can extend
export const registerSchemaBase = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  email: z.string().email("Please enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  phone: z.string().min(1, "Phone is required"),
  address: z
    .string()
    .min(1, "Address is required")
    .refine((val) => /\d/.test(val) && /[A-Za-z]/.test(val) && val.length >= 5, {
      message: "Please enter a valid street address",
    }),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z
    .string()
    .min(1, "ZIP code is required")
    .regex(/^\d{5}(?:-\d{4})?$/, "Please enter a valid ZIP code"),
  country: z.string().default("United States"),
  role: z.string().default("buyer"),
  resaleCertUrl: z.string().optional().default(""),
  confirmPassword: z.string(),
});

// Registration schema used on the signup page with password confirmation check
export const registerSchema = registerSchemaBase
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) =>
      data.role !== "buyer" ||
      (typeof data.resaleCertUrl === "string" && data.resaleCertUrl.trim() !== ""),
    {
      message: "Resale certificate is required",
      path: ["resaleCertUrl"],
    }
  );

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, z.infer<typeof loginSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, z.infer<typeof registerSchema>>;
  makeSeller: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Use the new QueryClient settings
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      const match = error.message.match(/suspended until ([0-9TZ:\-\.]+)/i);
      if (match) {
        const until = encodeURIComponent(match[1]);
        window.location.href = `/suspended?until=${until}`;
        return;
      }
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userData } = data;
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
    // Avoid retrying registration automatically to prevent duplicate requests
    // which can lead to a "username already exists" error even when the first
    // attempt succeeds.
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Function to make the user a seller (for testing)
  const makeSeller = async (): Promise<User | null> => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to become a seller",
          variant: "destructive",
        });
        return null;
      }
      
      const res = await apiRequest("POST", "/api/make-seller");
      const updatedUser = await res.json();
      
      // Update the user in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Success",
        description: "You are now a seller!",
      });
      
      // Refresh the user data
      await refetchUser();
      
      return updatedUser;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to become a seller. " + (error as Error).message,
        variant: "destructive",
      });
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        makeSeller
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}