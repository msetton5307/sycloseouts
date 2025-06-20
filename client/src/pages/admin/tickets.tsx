import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSupportTickets, useRespondTicket } from "@/hooks/use-support-tickets";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function AdminTicketsPage() {
  const { data: tickets = [] } = useSupportTickets();
  const [responses, setResponses] = useState<Record<number, string>>({});

  const respondMutations = tickets.reduce((acc, t) => {
    acc[t.id] = useRespondTicket(t.id);
    return acc;
  }, {} as Record<number, ReturnType<typeof useRespondTicket>>);

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <div className="space-y-4">
          {tickets.map(t => {
            const { data: user } = useQuery<User>({ queryKey: ["/api/users/" + t.userId], queryFn: getQueryFn({ on401: "throw" }) });
            const resp = respondMutations[t.id];
            return (
              <div key={t.id} className="border p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <h3 className="font-medium">{t.subject}</h3>
                  <span className="text-sm text-gray-600">{user ? user.username : `User #${t.userId}`}</span>
                </div>
                <p className="whitespace-pre-line">{t.message}</p>
                {t.response ? (
                  <div className="p-2 border-t">
                    <p className="text-sm font-medium">Response:</p>
                    <p className="whitespace-pre-line">{t.response}</p>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); resp.mutate(responses[t.id]); }} className="space-y-2">
                    <Textarea value={responses[t.id] || ""} onChange={e => setResponses(r => ({ ...r, [t.id]: e.target.value }))} />
                    <Button type="submit" disabled={resp.isPending}>Send Response</Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
