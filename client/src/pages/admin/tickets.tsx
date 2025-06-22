import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSupportTickets, useRespondTicket, useUpdateTicketStatus } from "@/hooks/use-support-tickets";
import { useQuery } from "@tanstack/react-query";
import { SupportTicket, User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

function TicketItem({ ticket }: { ticket: SupportTicket }) {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/" + ticket.userId],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  const respond = useRespondTicket(ticket.id);
  const updateStatus = useUpdateTicketStatus(ticket.id);
  const [response, setResponse] = useState("");

  return (
    <AccordionItem value={String(ticket.id)} className="border rounded">
      <AccordionTrigger className="px-4 py-2 flex items-start justify-between">
        <div className="text-left space-y-1">
          <span className="font-medium">{ticket.subject}</span>
          <span className="text-sm text-muted-foreground">
            {user ? user.username : `User #${ticket.userId}`} - {ticket.topic}
          </span>
        </div>
        <Badge variant={ticket.status === 'open' ? 'outline' : 'default'}>
          {ticket.status}
        </Badge>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 p-4 border-t">
          <p className="whitespace-pre-line">{ticket.message}</p>
          {ticket.response && (
            <div className="space-y-1">
              <p className="whitespace-pre-line">{ticket.response}</p>
            </div>
          )}
          {(ticket.status === 'open' || !ticket.response) && (
            <div className="flex flex-col space-y-2 items-start">
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
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function AdminTicketsPage() {
  const { data: tickets = [] } = useSupportTickets();

  const openTickets = tickets.filter(t => t.status === 'open');
  const closedTickets = tickets.filter(t => t.status !== 'open');

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Support Tickets</h1>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Open Tickets</h2>
          <Accordion type="multiple" className="space-y-2">
            {openTickets.map(t => (
              <TicketItem key={t.id} ticket={t} />
            ))}
            {openTickets.length === 0 && <p>No open tickets</p>}
          </Accordion>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Closed Tickets</h2>
          <Accordion type="multiple" className="space-y-2">
            {closedTickets.map(t => (
              <TicketItem key={t.id} ticket={t} />
            ))}
            {closedTickets.length === 0 && <p>No closed tickets</p>}
          </Accordion>
        </section>
      </main>
      <Footer />
    </>
  );
}