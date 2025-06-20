import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { useSupportTickets, useCreateTicket } from "@/hooks/use-support-tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function HelpPage() {
  const { user } = useAuth();
  const { data: tickets = [] } = useSupportTickets();
  const create = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !message) return;
    create.mutate({ subject, message });
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
              <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
              <Textarea placeholder="Describe your issue" value={message} onChange={e => setMessage(e.target.value)} />
              <Button type="submit" disabled={create.isPending}>Submit Ticket</Button>
            </form>
            <div className="space-y-4">
              {tickets.map(t => (
                <div key={t.id} className="border p-4 rounded">
                  <h3 className="font-medium">{t.subject}</h3>
                  <p className="text-sm text-gray-600">Status: {t.status}</p>
                  <p className="mt-2 whitespace-pre-line">{t.message}</p>
                  {t.response && (
                    <div className="mt-2 p-2 border-t">
                      <p className="text-sm font-medium">Admin Response:</p>
                      <p className="whitespace-pre-line">{t.response}</p>
                    </div>
                  )}
                </div>
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
