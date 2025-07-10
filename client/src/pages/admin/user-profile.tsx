import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Order,
  SupportTicket,
  Message,
} from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const onTimeRate = orders.length
    ? orders.filter(o => o.status === "delivered").length / orders.length
    : 0;

  const queryClient = useQueryClient();

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const sendEmail = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/admin/users/${userId}/email`, {
        subject: emailSubject,
        message: emailBody,
      }),
    onSuccess: () => {
      setEmailSubject("");
      setEmailBody("");
    },
  });

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

  const [certStatus, setCertStatus] = useState<string>("pending");
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
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Link href="/admin/users" className="text-primary hover:underline">
          &larr; Back to Users
        </Link>

        {user && (
          <Card>
            <CardHeader>
              <CardTitle>{user.firstName} {user.lastName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Email: {user.email}</p>
              <p>Username: {user.username}</p>
              <p>Role: {user.role}</p>
              {user.suspendedUntil ? (
                <p>
                  Suspended until {format(new Date(user.suspendedUntil), "PPP")}
                </p>
              ) : (
                <p>Not suspended</p>
              )}
          </CardContent>
        </Card>
      )}

      {user?.resaleCertUrl && (
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
              <Button
                onClick={() => updateCertStatus.mutate()}
                disabled={updateCertStatus.isPending}
              >
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Messages ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto bg-gray-50">
            {messages.map(m => (
              <ChatMessage key={m.id} message={m} isOwn={m.senderId === userId} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Notes ({notes.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="border rounded p-2 text-sm space-y-1">
                <div className="text-xs text-gray-500">
                  {format(new Date(n.createdAt), "PPP")}
                  {n.relatedUserId ? ` - Related User #${n.relatedUserId}` : ""}
                </div>
                <div className="whitespace-pre-wrap">{n.note}</div>
              </div>
            ))}
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="New note"
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
            {user?.suspendedUntil && new Date(user.suspendedUntil) > new Date() && (
              <Button variant="secondary" onClick={() => reinstateUser.mutate()} disabled={reinstateUser.isPending}>
                Reinstate Now
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Subject"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
            />
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
            />
            <Button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending}>
              Send Email
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

