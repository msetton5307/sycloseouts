import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { useSupportTickets, useCreateTicket } from "@/hooks/use-support-tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
                <Card key={t.id}>
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle>{t.subject}</CardTitle>
                      <Badge variant="secondary">{t.topic}</Badge>
                    </div>
                    <Badge className="self-center" variant={t.status === 'open' ? 'outline' : 'default'}>
                      {t.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{t.message}</p>
                  </CardContent>
                  {t.response && (
                    <CardFooter className="flex flex-col items-start space-y-1">
                      <p className="text-sm font-medium">Admin Response:</p>
                      <p className="whitespace-pre-line">{t.response}</p>
                    </CardFooter>
                  )}
                </Card>
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