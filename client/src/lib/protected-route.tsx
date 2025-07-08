import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
  allowedRoles?: string[];
};

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
          return <Redirect to="/" />;
        }

        if (
          path.startsWith("/seller") &&
          path !== "/seller/apply" &&
          user.role === "seller" &&
          (!user.isSeller || !user.isApproved)
        ) {
          return <Redirect to="/seller/apply" />;
        }

        return <Component />;
      }}
    </Route>
  );
}
