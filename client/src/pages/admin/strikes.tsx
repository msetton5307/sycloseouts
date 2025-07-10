import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useStrikes, useCreateStrike, useUserStrikes, useStrikeCandidates } from "@/hooks/use-strikes";
import {
  useStrikeReasons,
  useCreateStrikeReason,
  useUpdateStrikeReason,
  useDeleteStrikeReason,
} from "@/hooks/use-strike-reasons";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

export default function AdminStrikesPage() {
  const { data: strikes = [] } = useStrikes();
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const create = useCreateStrike();
  const queryClient = useQueryClient();
  const reinstate = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/users/${id}/reinstate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strikes"] });
    },
  });

  const { data: reasons = [] } = useStrikeReasons();
  const { data: candidates = [] } = useStrikeCandidates();
  const createReason = useCreateStrikeReason();
  const updateReason = useUpdateStrikeReason();
  const deleteReason = useDeleteStrikeReason();

  const [selectedUser, setSelectedUser] = useState<number>();
  const [search, setSearch] = useState("");
  const [reasonId, setReasonId] = useState<number>();
  const [creatingNew, setCreatingNew] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [message, setMessage] = useState("");
  const [newReasonName, setNewReasonName] = useState("");
  const [newReasonBody, setNewReasonBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (reasons.length > 0 && reasonId === undefined && !creatingNew) {
      setReasonId(reasons[0].id);
      setMessage(reasons[0].emailBody);
    }
  }, [reasons, creatingNew]);

  useEffect(() => {
    if (creatingNew) return;
    const r = reasons.find(r => r.id === reasonId);
    if (r) setMessage(r.emailBody);
  }, [reasonId, reasons, creatingNew]);

  const { data: userStrikes = [] } = useUserStrikes(selectedUser ?? 0);
  const [suspensionDays, setSuspensionDays] = useState<string>("");
  const [permanent, setPermanent] = useState(false);

  function buildPreview() {
    const r = creatingNew ? { name: templateName } : reasons.find(t => t.id === reasonId);
    const count = (userStrikes?.length || 0) + 1;
    const consequences =
      count === 1
        ? "This is a warning."
        : count === 2
        ? "Further violations may lead to suspension or removal."
        : "Your account is at risk of permanent suspension.";
    const days = Number(suspensionDays);
    const suspensionText = permanent
      ? "Your account has been suspended permanently."
      : days > 0
      ? `Your account has been suspended for ${days} day${days === 1 ? "" : "s"}.`
      : "";
    return `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#f7f7f7;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,0.1);"><tr><td style="background:#222;padding:20px;text-align:center;"><h1 style="margin:0;color:#ffffff;font-size:24px;">SY Closeouts</h1><p style="margin:5px 0 0;color:#bbbbbb;">Account Strike Notice</p></td></tr><tr><td style="padding:20px;"><p style="margin-top:0;">You have received a strike for the following reason:</p><p style="font-weight:bold;">${r?.name || ""}</p>${message ? message : ""}<p>This is strike <strong>${count}</strong> of 3 on your account.</p><p>${consequences}</p>${suspensionText ? `<p>${suspensionText}</p>` : ""}</td></tr><tr><td style="background:#f9f9f9;padding:20px;"><p style="margin:0;">If you have questions please reply to this email.</p><p style="margin:5px 0 0;">Thank you for using <strong>SY Closeouts</strong>.</p></td></tr></table></body></html>`;
  }

  function submit() {
    if (!selectedUser) return;
    const r = reasons.find(t => t.id === reasonId);
    if (!r) return;
    create.mutate({
      userId: selectedUser,
      reason: r.name,
      message,
      suspensionDays: suspensionDays ? Number(suspensionDays) : undefined,
      permanent,
    });
  }

  function saveReason() {
    if (editingId) {
      updateReason.mutate({ id: editingId, values: { name: newReasonName, emailBody: newReasonBody } });
    } else {
      createReason.mutate({ name: newReasonName, emailBody: newReasonBody });
    }
    setEditingId(null);
    setNewReasonName("");
    setNewReasonBody("");
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
                {users.find(u => u.id === selectedUser)?.lastName} ({users.find(u => u.id === selectedUser)?.email}) - {userStrikes.length} strike{userStrikes.length === 1 ? "" : "s"}
              </div>
            )}
            <Select
              value={creatingNew ? "new" : reasonId?.toString()}
              onValueChange={v => {
                if (v === "new") {
                  setCreatingNew(true);
                  setReasonId(undefined);
                  setTemplateName("");
                  setMessage("");
                } else {
                  setCreatingNew(false);
                  setReasonId(Number(v));
                }
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(r => (
                  <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                ))}
                <SelectItem value="new">New reason...</SelectItem>
              </SelectContent>
            </Select>
            {creatingNew && (
              <Input
                placeholder="Reason name"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
              />
            )}
            <RichTextEditor value={message} onChange={setMessage} />
            <Button
              variant="outline"
              onClick={() => {
                if (creatingNew) {
                  createReason.mutate({ name: templateName, emailBody: message });
                  setCreatingNew(false);
                } else if (reasonId) {
                  updateReason.mutate({ id: reasonId, values: { emailBody: message } });
                }
              }}
              disabled={
                creatingNew
                  ? !templateName || createReason.isPending
                  : !reasonId || updateReason.isPending
              }
            >
              Save Template
            </Button>
            <div
              className="border rounded p-4"
              dangerouslySetInnerHTML={{ __html: buildPreview() }}
            />
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
                  <TableHead>Email</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strikes.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.first_name ? `${s.first_name} ${s.last_name}` : `User #${s.user_id}`}
                    </TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.reason}</TableCell>
                    <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {s.suspended_until && new Date(s.suspended_until) > new Date() && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reinstate.mutate(s.user_id)}
                          disabled={reinstate.isPending}
                        >
                          Unsuspend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {strikes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">
                      No strikes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strike Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map(c => (
                  <TableRow key={c.userId}>
                    <TableCell>{c.firstName} {c.lastName}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.reasons.join(', ')}</TableCell>
                  </TableRow>
                ))}
                {candidates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No candidates
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Strike Reasons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Reason name"
              value={newReasonName}
              onChange={e => setNewReasonName(e.target.value)}
            />
            <RichTextEditor value={newReasonBody} onChange={setNewReasonBody} />
            <Button onClick={saveReason} disabled={createReason.isPending}>
              Save
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reasons.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => {setNewReasonName(r.name); setNewReasonBody(r.emailBody); setEditingId(r.id);}}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteReason.mutate(r.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}