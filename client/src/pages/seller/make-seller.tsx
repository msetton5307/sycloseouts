import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { apiRequest } from "@/lib/queryClient";

export default function MakeSeller() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Simple function to call the make-seller endpoint directly
  const handleMakeSeller = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/make-seller", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!res.ok) {
        throw new Error(`Failed with status: ${res.status}`);
      }
      
      const data = await res.json();
      
      toast({
        title: "Success!",
        description: "You are now a seller. Redirecting to seller dashboard...",
      });
      
      // Redirect to seller dashboard after successful update
      setTimeout(() => {
        setLocation("/seller/dashboard");
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to become a seller: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6">Become a Seller</h1>
          <p className="text-gray-600 mb-8">
            Click the button below to instantly become a seller for testing purposes.
          </p>
          
          <Button 
            className="w-full"
            onClick={handleMakeSeller}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Make Me a Seller Instantly"
            )}
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}