import React, { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailLogs,
} from "@/hooks/use-email-templates";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmailTemplate, User } from "@shared/schema";

export default function AdminEmailTemplatesPage() {
  const { data: templates = [], isLoading } = useEmailTemplates();
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate();
  const remove = useDeleteEmailTemplate();

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [group, setGroup] = useState("");
  const [templateId, setTemplateId] = useState<number>();
  const [creatingNew, setCreatingNew] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const { data: logs = [] } = useEmailLogs(templateId);
  const [openLog, setOpenLog] = useState<string | null>(null);
  function handleHtmlUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) setBody(text);
    };
    reader.readAsText(file);
  }

  useEffect(() => {
    if (templates.length > 0 && templateId === undefined && !creatingNew) {
      setTemplateId(templates[0].id);
      setSubject(templates[0].subject);
      setBody(templates[0].body);
    }
  }, [templates, creatingNew]);

  useEffect(() => {
    if (creatingNew) return;
    const t = templates.find(t => t.id === templateId);
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  }, [templateId, templates, creatingNew]);

  function applyPlaceholders(html: string, user?: User) {
    if (!user) return html;
    return html
      .replace(/\{\{\{first_name\}\}\}/gi, user.firstName)
      .replace(/\{\{\{last_name\}\}\}/gi, user.lastName)
      .replace(/\{\{\{name\}\}\}/gi, `${user.firstName} ${user.lastName}`)
      .replace(/\{\{\{company\}\}\}/gi, user.company || "");
  }

  function buildPreview() {
    const html = applyPlaceholders(body, selectedUsers[0]);
    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:20px;background:#f7f7f7;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#222;padding:20px;text-align:center;color:#fff;font-size:20px;">SY Closeouts</td>
          </tr>
          <tr>
            <td style="padding:20px;">${html}</td>
          </tr>
        </table>
      </body>
    </html>`;
  }

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (group && templateId) {
        await apiRequest("POST", `/api/admin/email-templates/${templateId}/send`, {
          group,
        });
        return;
      }
      for (const u of selectedUsers) {
        const html = applyPlaceholders(body, u);
        await apiRequest(`POST`, `/api/admin/users/${u.id}/email`, {
          subject,
          message: html,
          html,
          templateId,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/email-templates", templateId, "logs"] });
    },
  });

  function saveTemplate() {
    if (creatingNew) {
      create.mutate({ name, subject, body });
      setCreatingNew(false);
    } else if (templateId) {
      update.mutate({ id: templateId, values: { subject, body } });
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Admin Email Templates</h1>
        <Card>
          <CardHeader>
            <CardTitle>Send Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              className="border rounded p-2 w-full md:w-72"
              placeholder="Search users"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Send to group..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyers">All Buyers</SelectItem>
                <SelectItem value="sellers">All Sellers</SelectItem>
                <SelectItem value="both">Buyers &amp; Sellers</SelectItem>
              </SelectContent>
            </Select>
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
                        if (!selectedUsers.find(s => s.id === u.id)) {
                          setSelectedUsers([...selectedUsers, u]);
                        }
                        setSearch("");
                      }}
                    >
                      {u.firstName} {u.lastName} ({u.email})
                    </div>
                  ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map(u => (
                  <Badge key={u.id} className="flex items-center gap-1">
                    {u.firstName} {u.lastName}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setSelectedUsers(selectedUsers.filter(s => s.id !== u.id))
                      }
                    />
                  </Badge>
                ))}
              </div>
            )}
            <Select
              value={creatingNew ? "new" : templateId?.toString()}
              onValueChange={v => {
                if (v === "new") {
                  setCreatingNew(true);
                  setTemplateId(undefined);
                  setName("");
                  setSubject("");
                  setBody("");
                } else {
                  setCreatingNew(false);
                  setTemplateId(Number(v));
                }
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
                <SelectItem value="new">New template...</SelectItem>
              </SelectContent>
            </Select>
            {creatingNew && (
              <Input
                placeholder="Template name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            )}
            <Input
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <input type="file" accept=".html" onChange={handleHtmlUpload} />
            <RichTextEditor value={body} onChange={setBody} />
            <Button
              variant="outline"
              onClick={saveTemplate}
              disabled={
                creatingNew ? !name || create.isPending : !templateId || update.isPending
              }
            >
              Save Template
            </Button>
            <div
              className="border rounded p-4 bg-white shadow"
              dangerouslySetInnerHTML={{ __html: buildPreview() }}
            />
            <Button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending || (selectedUsers.length === 0 && !group)}>
              Send Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : templates.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>{t.subject}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setCreatingNew(false);
                            setTemplateId(t.id);
                          }}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => remove.mutate(t.id)}>
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-gray-500">No templates</div>
            )}
          </CardContent>
        </Card>

        {templateId && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sent Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>
                        {l.user ? `${l.user.firstName} ${l.user.lastName}` : "Unknown"}
                      </TableCell>
                      <TableCell>{l.toAddress}</TableCell>
                      <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{l.success ? "Success" : "Failed"}</TableCell>
                      <TableCell>
                        <Dialog open={openLog === String(l.id)} onOpenChange={o => !o && setOpenLog(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setOpenLog(String(l.id))}>View</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Email Preview</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: l.html }} />
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}
