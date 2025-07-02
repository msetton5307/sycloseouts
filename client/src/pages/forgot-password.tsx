import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/layout/header-fixed";
import Footer from "@/components/layout/footer-fixed";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email(),
});

const codeSchema = z.object({
  code: z.string().length(6),
});

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function sendCode(values: z.infer<typeof emailSchema>) {
    await apiRequest("POST", "/api/forgot-password", values);
    setEmail(values.email);
    setStep("verify");
    setCooldown(60);
    toast({ title: "Verification code sent" });
  }

  async function verify(values: z.infer<typeof codeSchema>) {
    await apiRequest("POST", "/api/forgot-password/check", {
      email,
      code: values.code,
    });
    navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${values.code}`);
  }

  const handleResend = async () => {
    if (cooldown > 0) return;
    await sendCode({ email });
  };


  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Forgot Password</CardTitle>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(sendCode)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
                    {emailForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      "Send Code"
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...codeForm}>
                <form onSubmit={codeForm.handleSubmit(verify)} className="space-y-4">
                  <FormField
                    control={codeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <InputOTPSlot key={i} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-between">
                    <Button type="submit" className="w-full" disabled={codeForm.formState.isSubmitting}>
                      {codeForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={cooldown > 0}
                      onClick={handleResend}
                      className="ml-2"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}
