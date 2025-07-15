import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (user.role === "seller") {
      if (user.isSeller && user.isApproved) {
        return <Redirect to="/seller/dashboard" />;
      }
      return <Redirect to="/seller/apply" />;
    }
    if (user.role === "buyer") {
      return <Redirect to="/buyer/home" />;
    }
  }

  return <Redirect to="/products" />;
}
