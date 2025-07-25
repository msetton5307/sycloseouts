import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useAdminRecentMessages } from "@/hooks/use-messages";
import { formatDate } from "@/lib/utils";

export default function AdminMessagesPage() {
  const { data: messages = [], isLoading } = useAdminRecentMessages();

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Message Supervision</h1>
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.created_at ?? m.createdAt, true)}</TableCell>
                        <TableCell>
                          {m.sender_first_name} {m.sender_last_name} ({m.sender_username})
                        </TableCell>
                        <TableCell>
                          {m.receiver_first_name} {m.receiver_last_name} ({m.receiver_username})
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap max-w-sm">
                          {m.content}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p>No messages found.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
