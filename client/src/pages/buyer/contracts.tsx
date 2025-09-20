import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, ShieldCheck, Upload } from "lucide-react";
import { Quote, Policy } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuoteWithPolicy extends Quote {
  policy?: Policy | null;
}

export default function BuyerContractsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: quotes = [], isLoading } = useQuery<QuoteWithPolicy[]>({
    queryKey: ["/api/quotes"],
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithPolicy | null>(null);
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ACH");
  const [nameOnAccount, setNameOnAccount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDocumentUrl, setPaymentDocumentUrl] = useState<string | undefined>();
  const [paymentDocumentName, setPaymentDocumentName] = useState<string | undefined>();
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const resetForm = () => {
    setSignature("");
    setConsent(false);
    setPaymentMethod("ACH");
    setNameOnAccount("");
    setAccountNumber("");
    setRoutingNumber("");
    setCardLast4("");
    setPaymentNotes("");
    setPaymentDocumentUrl(undefined);
    setPaymentDocumentName(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenQuote = (quote: QuoteWithPolicy) => {
    setSelectedQuote(quote);
    resetForm();
    setIsDialogOpen(true);
  };

  const { mutate: signContract, isPending: isSigning } = useMutation({
    mutationFn: async () => {
      if (!selectedQuote) return;
      const paymentDetailsEntries = {
        nameOnAccount: nameOnAccount.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        routingNumber: routingNumber.trim() || undefined,
        cardLast4: cardLast4.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      };

      const filteredDetails = Object.fromEntries(
        Object.entries(paymentDetailsEntries).filter(([, value]) => Boolean(value)),
      );

      const body: Record<string, unknown> = {
        signature,
        consent,
        paymentMethod,
      };

      if (Object.keys(filteredDetails).length > 0) {
        body.paymentDetails = filteredDetails;
      }

      if (paymentDocumentUrl) {
        body.paymentDocumentUrl = paymentDocumentUrl;
      }

      const res = await apiRequest("POST", `/api/quotes/${selectedQuote.id}/sign`, body);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Contract signed", description: "Your policy is now active." });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: (err: Error) => {
      toast({ title: "Unable to sign", description: err.message, variant: "destructive" });
    },
  });

  const handlePaymentDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setPaymentDocumentUrl(e.target.result);
        setPaymentDocumentName(file.name);
      }
      setUploadingDoc(false);
    };
    reader.onerror = () => {
      setUploadingDoc(false);
      toast({
        title: "Upload failed",
        description: "We couldn't read that file. Try again.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const disabled =
    !selectedQuote ||
    !signature.trim() ||
    !consent ||
    isSigning;

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" /> Contracts & Policies
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and sign your agreements securely.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : quotes.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              You don't have any quotes yet. We'll notify you when a contract is ready.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {quotes.map((quote) => (
              <Card key={quote.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      {quote.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Sent {quote.sentAt ? formatDate(quote.sentAt) : "-"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      quote.status === "converted"
                        ? "secondary"
                        : quote.status === "awaiting_signature"
                        ? "default"
                        : "outline"
                    }
                    className="uppercase"
                  >
                    {quote.status.replace("_", " ")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Premium</p>
                      <p className="font-semibold">{formatCurrency(quote.premium)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salesperson</p>
                      <p className="font-semibold">#{quote.salespersonId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Policy Number</p>
                      <p className="font-semibold">{quote.policy?.policyNumber ?? quote.policyNumber ?? "-"}</p>
                    </div>
                  </div>
                  {quote.description && (
                    <p className="text-sm text-muted-foreground">{quote.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={quote.contractPdfUrl || "/placeholder-contract.pdf"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Contract PDF
                      </a>
                    </Button>
                    {quote.status === "awaiting_signature" && (
                      <Button size="sm" onClick={() => handleOpenQuote(quote)}>
                        Review & Sign
                      </Button>
                    )}
                    {quote.policy && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active Policy
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review & Sign Contract</DialogTitle>
            <DialogDescription>
              Please review the agreement and provide your payment information to activate your policy.
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="h-72 rounded border overflow-hidden">
                <iframe
                  title={`Contract ${selectedQuote.title}`}
                  src={selectedQuote.contractPdfUrl || "/placeholder-contract.pdf"}
                  className="w-full h-full"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACH">ACH / Bank Transfer</SelectItem>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                      <SelectItem value="card">Credit Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name-on-account">Name on Account</Label>
                  <Input
                    id="name-on-account"
                    value={nameOnAccount}
                    onChange={(event) => setNameOnAccount(event.target.value)}
                    placeholder="Account holder"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-number">Account Number (last digits)</Label>
                  <Input
                    id="account-number"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                    placeholder="****1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routing-number">Routing Number</Label>
                  <Input
                    id="routing-number"
                    value={routingNumber}
                    onChange={(event) => setRoutingNumber(event.target.value)}
                    placeholder="#########"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-last4">Card Last 4 (if card)</Label>
                  <Input
                    id="card-last4"
                    value={cardLast4}
                    onChange={(event) => setCardLast4(event.target.value)}
                    placeholder="1234"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="payment-notes">Payment Notes</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                    placeholder="Add any helpful payment instructions."
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Supporting Document</Label>
                <div className="flex items-center gap-2">
                  <Input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={handlePaymentDocumentUpload} hidden />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingDoc}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingDoc ? "Uploading..." : paymentDocumentName ? "Replace Document" : "Upload Document"}
                  </Button>
                  {paymentDocumentName && <span className="text-sm text-muted-foreground">{paymentDocumentName}</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature">Type Your Full Name</Label>
                <Input
                  id="signature"
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="flex items-start gap-2 rounded border p-3 bg-muted/40">
                <Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(Boolean(checked))} />
                <Label htmlFor="consent" className="text-sm leading-snug">
                  I agree to sign this contract electronically and authorize the selected payment method to be used for the
                  quoted premium.
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSigning}>
              Cancel
            </Button>
            <Button onClick={() => signContract()} disabled={disabled}>
              {isSigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign & Activate Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
