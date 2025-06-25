import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { useSupportTickets, useCreateTicket, useTicketMessages, useSendTicketMessage } from "@/hooks/use-support-tickets";
import { SupportTicket } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ChatMessage from "@/components/messages/chat-message";

export default function HelpPage() {
  const { user } = useAuth();
  const { data: tickets = [] } = useSupportTickets();
  const create = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [topic, setTopic] = useState("General");

  const topics = ["Orders", "Account", "Products", "General"];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !message) return;
    create.mutate({ subject, message, topic });
    setSubject("");
    setMessage("");
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Help Center</h1>
        {user ? (
          <>
            <form onSubmit={submit} className="space-y-2">
              <Input
                placeholder="Subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Describe your issue"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <Button type="submit" disabled={create.isPending} className="self-end">
                Submit Ticket
              </Button>
            </form>
            <div className="space-y-4">
              {tickets.map(t => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </div>
          </>
        ) : (
          <p>Please log in to submit a support ticket.</p>
        )}
      </main>
      <Footer />
    </>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const { user } = useAuth();
  const { data: messages = [] } = useTicketMessages(ticket.id);
  const sendMsg = useSendTicketMessage(ticket.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div className="space-y-1">
          <CardTitle>{ticket.subject}</CardTitle>
          <Badge variant="secondary">{ticket.topic}</Badge>
        </div>
        <Badge className="self-center" variant={ticket.status === 'open' ? 'outline' : 'default'}>
          {ticket.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {messages.map(m => (
          <ChatMessage key={m.id} message={{ id: m.id, orderId: 0, senderId: m.senderId, receiverId: 0, content: m.message, isRead: true, createdAt: m.createdAt }} isOwn={m.senderId === user?.id} />
        ))}
        <div ref={bottomRef} />
        {ticket.status === 'open' && (
          <form onSubmit={e => { e.preventDefault(); const value = inputRef.current?.value.trim(); if (!value) return; sendMsg.mutate(value); if (inputRef.current) inputRef.current.value = ''; }} className="flex gap-2">
            <input ref={inputRef} className="flex-1 border rounded-full px-3 py-2" placeholder="Type a message" />
            <button type="submit" className="bg-primary text-white px-4 rounded-full" disabled={sendMsg.isPending}>Send</button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}