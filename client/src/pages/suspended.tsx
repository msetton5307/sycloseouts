import { Card, CardContent } from "@/components/ui/card";
import { Ban } from "lucide-react";
import { format } from "date-fns";

function useSuspendedUntil() {
  const params = new URLSearchParams(window.location.search);
  const until = params.get("until");
  return until ? new Date(until) : null;
}

export default function SuspendedPage() {
  const until = useSuspendedUntil();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <Ban className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Account Suspended</h1>
          </div>

          {until ? (
            <p className="mt-4 text-sm text-gray-600">
              Your account is suspended until {format(until, "PPP")}
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-600">
              Your account has been suspended. Please check your email for more details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

