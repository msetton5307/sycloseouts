import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useStrikes, useCreateStrike, useUserStrikes } from "@/hooks/use-strikes";
import { User } from "@shared/schema";

export default function AdminStrikesPage() {
  const { data: strikes = [] } = useStrikes();
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const create = useCreateStrike();

  const [selectedUser, setSelectedUser] = useState<number>();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("late/missed shipment");

  const reasonOptions = [
    "late/missed shipment",
    "not paying the wire",
    "sharing contact info",
    "inaccurate listing/shipping information",
  ];

  const { data: userStrikes = [] } = useUserStrikes(selectedUser ?? 0);
  const [suspensionDays, setSuspensionDays] = useState<string>("");
  const [permanent, setPermanent] = useState(false);

  function submit() {
    if (!selectedUser) return;
    create.mutate({
      userId: selectedUser,
      reason,
      suspensionDays: suspensionDays ? Number(suspensionDays) : undefined,
      permanent,
    });
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
            <input
              className="border rounded p-2 w-full md:w-72"
              placeholder="Search users"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <div className="border rounded p-2 max-h-40 overflow-y-auto bg-white shadow">
                {users
                  .filter(u =>
                    `${u.firstName} ${u.lastName} ${u.email}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map(u => (
                    <div
                      key={u.id}
                      className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedUser(u.id);
                        setSearch("");
                      }}
                    >
                      {u.firstName} {u.lastName} ({u.email})
                    </div>
                  ))}
              </div>
            )}
            {selectedUser && (
              <div className="text-sm text-gray-600">
                Selected: {users.find(u => u.id === selectedUser)?.firstName} {" "}
                {users.find(u => u.id === selectedUser)?.lastName} - {userStrikes.length} strike{userStrikes.length === 1 ? "" : "s"}
              </div>
            )}
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
            {selectedUser && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="border rounded p-2 w-32"
                  placeholder="Suspend days"
                  value={suspensionDays}
                  onChange={e => setSuspensionDays(e.target.value)}
                />
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={e => setPermanent(e.target.checked)}
                  />
                  Permanent
                </label>
              </div>
            )}
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