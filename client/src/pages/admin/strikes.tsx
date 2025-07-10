import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useStrikes, useCreateStrike } from "@/hooks/use-strikes";
import { User } from "@shared/schema";

export default function AdminStrikesPage() {
  const { data: strikes = [] } = useStrikes();
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const create = useCreateStrike();

  const [selectedUser, setSelectedUser] = useState("");
  const [reason, setReason] = useState("late/missed shipment");

  const reasonOptions = [
    "late/missed shipment",
    "not paying the wire",
    "sharing contact info",
    "inaccurate listing/shipping information",
  ];

  function submit() {
    if (!selectedUser) return;
    create.mutate({ userId: Number(selectedUser), reason });
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Issue Strike</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={submit} disabled={create.isPending || !selectedUser}>
              Add Strike
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Strikes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strikes.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.first_name ? `${s.first_name} ${s.last_name}` : `User #${s.user_id}`}
                    </TableCell>
                    <TableCell>{s.reason}</TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {strikes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No strikes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
