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
