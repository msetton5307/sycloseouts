import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Order, SupportTicket, Message, Quote, Policy } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChatMessage from "@/components/messages/chat-message";
import { useAdminUserMessages } from "@/hooks/use-messages";
import { useUserNotes, useCreateUserNote } from "@/hooks/use-user-notes";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteUser } from "@/hooks/use-users";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

export default function AdminUserProfilePage() {
  const { id } = useParams();
  const userId = parseInt(id);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/" + userId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !Number.isNaN(userId),
  });

  const { data: tickets = [] } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  const userTickets = tickets.filter(t => t.userId === userId);

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/admin/users/" + userId + "/orders"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: messages = [] } = useAdminUserMessages(userId);
  const { data: notes = [] } = useUserNotes(userId);
  const createNote = useCreateUserNote(userId);
  const [noteText, setNoteText] = useState("");
  const [relatedUser, setRelatedUser] = useState("");

  type QuoteWithPolicy = Quote & { policy?: Policy | null };

  const { data: quotes = [] } = useQuery<QuoteWithPolicy[]>({
    queryKey: [`/api/admin/users/${userId}/quotes`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const { data: salesPeople = [] } = useQuery<User[]>({
    queryKey: ["/api/users?roles=seller,admin"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  const onTimeRate = orders.length
    ? orders.filter(o => o.status === "delivered").length / orders.length
    : 0;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [suspendDays, setSuspendDays] = useState(0);
  const suspendUser = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/users/${userId}/suspend`, { days: suspendDays }),
    onSuccess: () => {
      setSuspendDays(0);
      queryClient.invalidateQueries({ queryKey: ["/api/users/" + userId] });
    },
  });

  const reinstateUser = useMutation({
    mutationFn: () => apiRequest("POST", `/api/users/${userId}/reinstate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/" + userId] });
    },
  });

  const deleteUserMutation = useDeleteUser();

  const [quoteTitle, setQuoteTitle] = useState("");
  const [quotePremium, setQuotePremium] = useState("");
  const [quoteSalespersonId, setQuoteSalespersonId] = useState("");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteContract, setQuoteContract] = useState<string | undefined>();
  const [quoteContractName, setQuoteContractName] = useState<string | undefined>();
  const [uploadingContract, setUploadingContract] = useState(false);
  const contractInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingQuoteId, setUploadingQuoteId] = useState<number | null>(null);
  const [resendingQuoteId, setResendingQuoteId] = useState<number | null>(null);

  const resetQuoteForm = () => {
    setQuoteTitle("");
    setQuotePremium("");
    setQuoteSalespersonId("");
    setQuoteDescription("");
    setQuoteContract(undefined);
    setQuoteContractName(undefined);
    if (contractInputRef.current) {
      contractInputRef.current.value = "";
    }
  };

  const handleNewContractUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingContract(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setQuoteContract(e.target.result);
        setQuoteContractName(file.name);
      }
      setUploadingContract(false);
    };
    reader.onerror = () => {
      setUploadingContract(false);
      toast({ title: "Upload failed", description: "Could not read that file.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      const premiumNumber = Number(quotePremium);
      const salespersonNumber = Number(quoteSalespersonId);
      const payload: Record<string, unknown> = {
        title: quoteTitle.trim(),
        premium: premiumNumber,
        salespersonId: salespersonNumber,
      };
      if (quoteDescription.trim()) {
        payload.description = quoteDescription.trim();
      }
      if (quoteContract) {
        payload.contractPdfUrl = quoteContract;
      }

      const res = await apiRequest("POST", `/api/admin/users/${userId}/quotes`, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Quote sent", description: "The customer has been notified." });
      resetQuoteForm();
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/quotes`] });
    },
    onError: (err: Error) => {
      toast({ title: "Unable to create quote", description: err.message, variant: "destructive" });
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async (payload: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PUT", `/api/admin/quotes/${payload.id}`, payload.data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Quote updated" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/quotes`] });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.id) {
        setUploadingQuoteId(current => (current === variables.id ? null : current));
      } else {
        setUploadingQuoteId(null);
      }
      setResendingQuoteId(null);
    },
  });

  const handleExistingContractUpload = (quoteId: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingQuoteId(quoteId);
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (typeof e.target?.result === "string") {
        updateQuoteMutation.mutate({ id: quoteId, data: { contractPdfUrl: e.target.result } });
      }
    };
    reader.onerror = () => {
      setUploadingQuoteId(null);
      toast({ title: "Upload failed", description: "Could not read that file.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const resendForSignature = (quoteId: number) => {
    setResendingQuoteId(quoteId);
    updateQuoteMutation.mutate({ id: quoteId, data: { status: "awaiting_signature" } });
  };

  const [certStatus, setCertStatus] = useState<string>("pending");

  const handleCreateQuote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quoteTitle.trim()) {
      toast({ title: "Missing title", description: "Enter a title for the quote.", variant: "destructive" });
      return;
    }
    const premiumNumber = Number(quotePremium);
    if (!Number.isFinite(premiumNumber) || premiumNumber <= 0) {
      toast({ title: "Invalid premium", description: "Enter a valid premium amount.", variant: "destructive" });
      return;
    }
    if (!quoteSalespersonId) {
      toast({ title: "Choose a salesperson", description: "Assign a salesperson before sending.", variant: "destructive" });
      return;
    }
    createQuoteMutation.mutate();
  };
  const updateCertStatus = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/api/users/${userId}`, { resaleCertStatus: certStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/" + userId] });
    },
  });

  useEffect(() => {
    if (user) {
      setCertStatus(user.resaleCertStatus || "none");
    }
  }, [user]);

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/users" className="text-primary hover:underline">
          &larr; Back to Users
        </Link>

        {user && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                  <AvatarFallback>
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-sm">Username: {user.username}</p>
                  <p className="text-sm capitalize">Role: {user.role}</p>
                  {user.suspendedUntil ? (
                    <p className="text-sm text-red-600">
                      Suspended until {format(new Date(user.suspendedUntil), "PPP")}
                    </p>
                  ) : (
                    <p className="text-sm text-green-600">Active</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {user.resaleCertUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Resale Certificate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <a
                    href={user.resaleCertUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    View Uploaded File
                  </a>
                  <div className="flex items-center space-x-2">
                    <Select value={certStatus} onValueChange={setCertStatus}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => updateCertStatus.mutate()} disabled={updateCertStatus.isPending}>
                      Update
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Support Tickets ({userTickets.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {userTickets.map(t => (
                  <div key={t.id} className="border rounded p-2">
                    <p className="font-medium">{t.subject}</p>
                    <p className="text-sm text-gray-500">Status: {t.status}</p>
                  </div>
                ))}
                {userTickets.length === 0 && <p>No tickets</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>On-time delivery rate: {(onTimeRate * 100).toFixed(0)}%</p>
                {orders.map(o => (
                  <div key={o.id} className="border rounded p-2 text-sm">
                    Order #{o.code} - {o.status}
                  </div>
                ))}
                {orders.length === 0 && <p>No orders</p>}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Quotes & Contracts ({quotes.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleCreateQuote} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="quote-title">Quote title</Label>
                      <Input
                        id="quote-title"
                        value={quoteTitle}
                        onChange={event => setQuoteTitle(event.target.value)}
                        placeholder="Annual Retail Protection"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-premium">Premium</Label>
                      <Input
                        id="quote-premium"
                        type="number"
                        min="0"
                        step="0.01"
                        value={quotePremium}
                        onChange={event => setQuotePremium(event.target.value)}
                        placeholder="2500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Salesperson</Label>
                      <Select value={quoteSalespersonId} onValueChange={setQuoteSalespersonId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {salesPeople.map(sp => (
                            <SelectItem key={sp.id} value={String(sp.id)}>
                              {sp.firstName} {sp.lastName} ({sp.role})
                            </SelectItem>
                          ))}
                          {salesPeople.length === 0 && <SelectItem value="">No team members</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-description">Description</Label>
                    <Textarea
                      id="quote-description"
                      value={quoteDescription}
                      onChange={event => setQuoteDescription(event.target.value)}
                      placeholder="Key coverages, inclusions, or payment schedule"
                      rows={3}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      ref={contractInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleNewContractUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingContract}
                      onClick={() => contractInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingContract
                        ? "Uploading..."
                        : quoteContractName
                        ? "Replace Contract"
                        : "Upload Contract PDF"}
                    </Button>
                    {quoteContractName && (
                      <span className="text-sm text-muted-foreground">{quoteContractName}</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={createQuoteMutation.isPending}>
                      {createQuoteMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Send Quote
                    </Button>
                  </div>
                </form>

                <div className="space-y-4">
                  {quotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No quotes have been issued to this user yet.
                    </p>
                  ) : (
                    quotes.map(quote => {
                      const fileInputId = `existing-contract-${quote.id}`;
                      return (
                        <div key={quote.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold">{quote.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Sent {quote.sentAt ? format(new Date(quote.sentAt), "PPP") : "-"}
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
                          </div>
                          <div className="grid gap-2 sm:grid-cols-4 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Premium</p>
                            <p className="font-medium">{formatCurrency(Number(quote.premium))}</p>
                          </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Salesperson</p>
                              <p className="font-medium">#{quote.salespersonId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Signed</p>
                              <p className="font-medium">{quote.signedAt ? format(new Date(quote.signedAt), "PPP") : "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Policy</p>
                              <p className="font-medium">{quote.policy?.policyNumber ?? quote.policyNumber ?? "-"}</p>
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
                                View Contract
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(fileInputId)?.click()}
                              disabled={uploadingQuoteId === quote.id}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingQuoteId === quote.id ? "Updating..." : "Replace PDF"}
                            </Button>
                            <Input
                              id={fileInputId}
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={handleExistingContractUpload(quote.id)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => resendForSignature(quote.id)}
                              disabled={resendingQuoteId === quote.id && updateQuoteMutation.isPending}
                            >
                              {resendingQuoteId === quote.id && updateQuoteMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Resend Signature Request
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>All Messages ({messages.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto bg-gray-50">
                {messages.map(m => (
                  <ChatMessage key={m.id} message={m} isOwn={m.senderId === userId} />
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Admin Notes ({notes.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notes.map(n => (
                    <div key={n.id} className="rounded border p-3 bg-gray-50">
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{format(new Date(n.createdAt), "PPP")}</span>
                        {n.relatedUserId && <span>Related #{n.relatedUserId}</span>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-sm text-gray-500">No notes yet.</p>
                  )}
                </div>
                <div className="space-y-2 border-t pt-4">
                  <Textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Write a note..."
                  />
                  <Input
                    type="number"
                    value={relatedUser}
                    onChange={e => setRelatedUser(e.target.value)}
                    placeholder="Related user ID (optional)"
                  />
                  <Button
                    onClick={() => {
                      createNote.mutate({
                        note: noteText,
                        relatedUserId: relatedUser ? Number(relatedUser) : undefined,
                      });
                      setNoteText("");
                      setRelatedUser("");
                    }}
                    disabled={createNote.isPending}
                  >
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suspend Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="suspend-days">Suspension Duration (days)</Label>
                  <Input
                    id="suspend-days"
                    type="number"
                    value={suspendDays}
                    onChange={e => setSuspendDays(parseInt(e.target.value))}
                    placeholder="Days"
                  />
                  <Button onClick={() => suspendUser.mutate()} disabled={suspendUser.isPending}>
                    Suspend
                  </Button>
                </div>
                {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
                  <Button variant="secondary" onClick={() => reinstateUser.mutate()} disabled={reinstateUser.isPending}>
                    Reinstate Now
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delete User</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this user?")) {
                      deleteUserMutation.mutate(userId, {
                        onSuccess: () => {
                          window.location.href = "/admin/users";
                        },
                      });
                    }
                  }}
                  disabled={deleteUserMutation.isPending}
                >
                  Delete User
                </Button>
              </CardContent>
            </Card>

          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
