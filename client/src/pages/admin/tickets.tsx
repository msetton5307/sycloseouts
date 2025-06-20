import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSupportTickets, useRespondTicket, useUpdateTicketStatus } from "@/hooks/use-support-tickets";
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
  const updateStatus = useUpdateTicketStatus(ticket.id);
  const [response, setResponse] = useState("");

  return (
    <Card key={ticket.id} className="space-y-2">
      <CardHeader className="flex flex-row justify-between items-start">
        <div className="space-y-1">
          <CardTitle>{ticket.subject}</CardTitle>
          <Badge variant="secondary">{ticket.topic}</Badge>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className="text-sm text-gray-600">
            {user ? user.username : `User #${ticket.userId}`}
          </span>
          <Badge variant={ticket.status === 'open' ? 'outline' : 'default'}>{ticket.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="whitespace-pre-line">{ticket.message}</p>
        {ticket.response && (
          <div className="space-y-1">
            <p className="whitespace-pre-line">{ticket.response}</p>
          </div>
        )}
      </CardContent>
      {(ticket.status === 'open' || !ticket.response) && (
        <CardFooter className="flex flex-col space-y-2 items-start">
          {!ticket.response && (
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
          )}
          {ticket.status === 'open' && (
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate('closed')}
              disabled={updateStatus.isPending}
            >
              Close Ticket
            </Button>
          )}
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