import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Package, CheckCircle, Loader2 } from "lucide-react";

// Application schema for zod validation
const applicationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().min(10, "Please enter a valid phone number"),
  inventoryType: z.string().min(1, "Inventory type is required"),
  yearsInBusiness: z.coerce.number().min(0, "Years must be a positive number"),
  website: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function SellerApply() {
  const [, setLocation] = useLocation();
  const { user, makeSeller } = useAuth();
  const { toast } = useToast();
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Setup form with zod validation
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      companyName: user?.company || "",
      contactEmail: user?.email || "",
      contactPhone: "",
      inventoryType: "",
      yearsInBusiness: 0,
      website: "",
      additionalInfo: "",
    },
  });

  // Handle form submission with React Query
  const { mutate: submitApplication, isPending } = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const res = await apiRequest("POST", "/api/seller-applications", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your seller application has been submitted successfully. We'll review it shortly.",
      });
      setIsSubmitSuccess(true);
    },
    onError: (error) => {
      toast({
        title: "Application Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  function onSubmit(data: ApplicationFormData) {
    submitApplication(data);
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isSubmitSuccess ? (
          <div className="text-center max-w-md mx-auto py-16">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
              Application Submitted!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Thank you for applying to be a seller on SY Closeouts. We'll review your application and get back to you within 2-3 business days.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                className="flex-1"
                onClick={() => setLocation("/")}
              >
                Return Home
              </Button>
              {user && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setLocation("/buyer/dashboard")}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - Pitch */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-8 lg:p-12">
              <div className="max-w-lg">
                <Package className="h-12 w-12 mb-6" />
                <h1 className="text-3xl font-extrabold mb-6">
                  Become a Seller on SY Closeouts
                </h1>
                <p className="text-xl mb-8">
                  Join SY Closeouts to move your inventory fast and reach thousands of resellers.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Instant Access to Buyers</h3>
                      <p className="text-blue-100">Connect directly with thousands of qualified resellers looking for wholesale inventory like yours.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Lower Fees Than Traditional Channels</h3>
                      <p className="text-blue-100">Our competitive commission rates beat traditional liquidation channels, maximizing your revenue.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Easy-to-Use Platform</h3>
                      <p className="text-blue-100">Our intuitive dashboard makes listing products, managing inventory, and tracking sales simple.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column - Application Form */}
            <div className="bg-white rounded-lg shadow-lg p-8 lg:p-12">
              <h2 className="text-2xl font-bold mb-6">Seller Application</h2>
              <p className="text-gray-600 mb-8">
                Please fill out the form below to apply as a seller. Our team will review your application and get back to you within 2-3 business days.
              </p>
              
              {/* Quick Seller Approval (For testing) */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium mb-2">Developer Testing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Need to test seller features? Skip the application process and become a seller instantly.
                </p>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      const updatedUser = await makeSeller();
                      if (updatedUser) {
                        toast({
                          title: "Success!",
                          description: "You are now a seller. Redirecting to seller dashboard...",
                        });
                        setTimeout(() => {
                          setLocation("/seller/dashboard");
                        }, 1500);
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to become a seller. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
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
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="inventoryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type of Inventory</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select inventory type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Electronics">Electronics</SelectItem>
                              <SelectItem value="Apparel">Apparel</SelectItem>
                              <SelectItem value="Home Goods">Home Goods</SelectItem>
                              <SelectItem value="Toys & Games">Toys & Games</SelectItem>
                              <SelectItem value="Kitchen">Kitchen</SelectItem>
                              <SelectItem value="Beauty">Beauty</SelectItem>
                              <SelectItem value="Mixed Lots">Mixed Lots</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="yearsInBusiness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years in Business</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          If you have a company website, please provide the URL
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Information</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us more about your business and inventory..." 
                            className="h-32"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Share any additional information about your business, inventory sources, or past experience selling wholesale
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
