import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSupportTickets, useUpdateTicketStatus, useTicketMessages, useSendTicketMessage } from "@/hooks/use-support-tickets";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { SupportTicket, User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import ChatMessage from "@/components/messages/chat-message";
import { Button } from "@/components/ui/button";

export default function AdminTicketsPage() {
  const { data: tickets = [] } = useSupportTickets();
  const { user } = useAuth();
  const [selected, setSelected] = useState<SupportTicket>();
  const { data: messages = [] } = useTicketMessages(selected?.id);
  const sendMsg = useSendTicketMessage(selected?.id ?? 0);
  const updateStatus = useUpdateTicketStatus(selected?.id ?? 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 flex h-[calc(100vh-8rem)]">
        <div className="w-72 border-r overflow-y-auto space-y-1">
          {tickets.map(t => (
            <TicketListItem key={t.id} ticket={t} selected={t.id === selected?.id} onSelect={() => setSelected(t)} />
          ))}
          {tickets.length === 0 && <p className="p-2">No tickets</p>}
        </div>
        <div className="flex-1 flex flex-col ml-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">{selected.subject}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant={selected.status === 'open' ? 'outline' : 'default'}>{selected.status}</Badge>
                  {selected.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate('closed')} disabled={updateStatus.isPending}>Close</Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 bg-gray-50 border rounded p-4">
                {messages.map(m => (
                  <ChatMessage key={m.id} message={{ id: m.id, orderId: 0, senderId: m.senderId, receiverId: 0, content: m.message, isRead: true, createdAt: m.createdAt }} isOwn={m.senderId === user?.id} />
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={e => { e.preventDefault(); const value = inputRef.current?.value.trim(); if (!value) return; sendMsg.mutate(value); if (inputRef.current) inputRef.current.value = ""; }} className="mt-2 flex gap-2">
                <input ref={inputRef} className="flex-1 border rounded-full px-3 py-2" placeholder="Type a message" />
                <button type="submit" className="bg-primary text-white px-4 rounded-full" disabled={sendMsg.isPending}>Send</button>
              </form>
            </>
          ) : (
            <p className="m-auto text-center text-gray-500">Select a ticket</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function TicketListItem({ ticket, selected, onSelect }: { ticket: SupportTicket; selected: boolean; onSelect: () => void }) {
  const { data: user } = useQuery<User>({ queryKey: ["/api/users/" + ticket.userId], queryFn: getQueryFn({ on401: "throw" }) });
  return (
    <button onClick={onSelect} className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 flex justify-between ${selected ? 'bg-gray-50' : ''}`}>
      <span>
        {ticket.subject}
        <span className="block text-xs text-muted-foreground">{user ? user.username : `User #${ticket.userId}`}</span>
      </span>
      <Badge variant={ticket.status === 'open' ? 'outline' : 'default'}>{ticket.status}</Badge>
    </button>
  );
}
