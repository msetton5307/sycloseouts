import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth, registerSchema } from "@/hooks/use-auth";
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
  contactName: z.string().min(1, "Your name is required"),
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
  const { user, registerMutation } = useAuth();
  const { toast } = useToast();
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const hasInitialized = useRef(false);

  const signupForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
      role: "seller",
      resaleCertUrl: "",
    },
  });

  function onSignup(values: z.infer<typeof registerSchema>) {
    registerMutation.mutate(values);
  }

  useEffect(() => {
    if (user && !hasInitialized.current) {
      form.reset({
        contactName: `${user.firstName} ${user.lastName}`,
        companyName: user.company || "",
        contactEmail: user.email,
        contactPhone: "",
        inventoryType: "",
        yearsInBusiness: 0,
        website: "",
        additionalInfo: "",
      });
      hasInitialized.current = true;
    }
  }, [user, form]);

  // Setup form with zod validation
  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      contactName: user ? `${user.firstName} ${user.lastName}` : "",
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
        description:
          "We received your application and will get back to you within 24 hours.",
      });
      setIsSubmitSuccess(true);
    },
    onError: (error) => {
      toast({
        title: "Application Failed",
        description:
          error.message ||
          "There was an error submitting your application. Please try again.",
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
              Thank you for applying to be a seller on SY Closeouts. We received
              your application and will get back to you within 24 hours.
            </p>
            <div className="flex gap-4 justify-center">
              <Button className="flex-1" onClick={() => setLocation("/")}>
                Return Home
              </Button>
              {user?.role === "buyer" && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation("/buyer/home")}
                >
                  Go to Buyer Home
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
                  Join SY Closeouts to move your inventory fast and reach
                  thousands of resellers.
                </p>

                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Instant Access to Buyers
                      </h3>
                      <p className="text-blue-100">
                        Connect directly with thousands of qualified resellers
                        looking for wholesale inventory like yours.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Lower Fees Than Traditional Channels
                      </h3>
                      <p className="text-blue-100">
                        Our competitive commission rates beat traditional
                        liquidation channels, maximizing your revenue.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-white/20 p-2 rounded-full mr-4">
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Easy-to-Use Platform
                      </h3>
                      <p className="text-blue-100">
                        Our intuitive dashboard makes listing products, managing
                        inventory, and tracking sales simple.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Application or Signup Form */}
            <div className="bg-white rounded-lg shadow-lg p-8 lg:p-12">
              {!user ? (
                <>
                  <h2 className="text-2xl font-bold mb-6">
                    Create a Seller Account
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Fill out the form below to create your seller account.
                  </p>

                  <Form {...signupForm}>
                    <form
                      onSubmit={signupForm.handleSubmit(onSignup)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="First name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Last name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={signupForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Choose a username"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your company name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="555-123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={signupForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                  <div className="text-sm text-gray-600 text-center pt-4">
                    Already have an account?{" "}
                    <a
                      href="/auth"
                      className="text-primary hover:underline font-medium"
                    >
                      Login
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-6">
                    Seller Application
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Please fill out the form below to apply as a seller. We will
                    review your application and get back to you within 24 hours.
                  </p>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your company name"
                                {...field}
                              />
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
                                <Input
                                  placeholder="email@example.com"
                                  type="email"
                                  {...field}
                                />
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
                                <Input
                                  placeholder="(555) 123-4567"
                                  {...field}
                                />
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
                                  <SelectItem value="Electronics">
                                    Electronics
                                  </SelectItem>
                                  <SelectItem value="Apparel">
                                    Apparel
                                  </SelectItem>
                                  <SelectItem value="Home Goods">
                                    Home Goods
                                  </SelectItem>
                                  <SelectItem value="Toys & Games">
                                    Toys & Games
                                  </SelectItem>
                                  <SelectItem value="Kitchen">
                                    Kitchen
                                  </SelectItem>
                                  <SelectItem value="Beauty">Beauty</SelectItem>
                                  <SelectItem value="Mixed Lots">
                                    Mixed Lots
                                  </SelectItem>
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
                                <Input type="number" min="0" {...field} />
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
                              <Input
                                placeholder="https://www.example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              If you have a company website, please provide the
                              URL
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
                              Share any additional information about your
                              business, inventory sources, or past experience
                              selling wholesale
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending}
                      >
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
                </>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}