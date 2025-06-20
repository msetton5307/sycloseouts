import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import ChatMessage from "@/components/messages/chat-message";
import { useAdminUserMessages } from "@/hooks/use-messages";

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

  const onTimeRate = orders.length
    ? orders.filter(o => o.status === "delivered").length / orders.length
    : 0;

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
                Order #{o.id} - {o.status}
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

