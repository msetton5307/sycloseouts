import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSupportTickets, useRespondTicket } from "@/hooks/use-support-tickets";
import { useQuery } from "@tanstack/react-query";
import { SupportTicket, User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/" + ticket.userId],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  const respond = useRespondTicket(ticket.id);
  const [response, setResponse] = useState("");

  return (
    <Card key={ticket.id} className="space-y-2">
      <CardHeader className="flex flex-row justify-between items-start">
        <div className="space-y-1">
          <CardTitle>{ticket.subject}</CardTitle>
          <Badge variant="secondary">{ticket.topic}</Badge>
        </div>
        <span className="text-sm text-gray-600 self-center">
          {user ? user.username : `User #${ticket.userId}`}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="whitespace-pre-line">{ticket.message}</p>
        {ticket.response && (
          <div className="space-y-1">
            <Badge className="w-fit">Closed</Badge>
            <p className="whitespace-pre-line">{ticket.response}</p>
          </div>
        )}
      </CardContent>
      {!ticket.response && (
        <CardFooter>
          <form
            onSubmit={e => {
              e.preventDefault();
              respond.mutate(response);
            }}
            className="flex w-full flex-col space-y-2"
          >
            <Textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Write your response..."
            />
            <Button type="submit" disabled={respond.isPending} className="self-end">
              Send Response
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  );
}

export default function AdminTicketsPage() {
  const { data: tickets = [] } = useSupportTickets();

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <div className="space-y-4">
          {tickets.map(t => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
