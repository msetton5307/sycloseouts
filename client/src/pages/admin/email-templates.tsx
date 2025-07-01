import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useSendEmailTemplate,
} from "@/hooks/use-email-templates";
import { EmailTemplate } from "@shared/schema";

export default function AdminEmailTemplatesPage() {
  const { data: templates = [], isLoading } = useEmailTemplates();
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate();
  const remove = useDeleteEmailTemplate();
  const send = useSendEmailTemplate();

  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [name, setName] = useState("{}");
  const [subject, setSubject] = useState("{}");
  const [body, setBody] = useState("{}");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setSubject(editing.subject);
      setBody(editing.body);
    } else {
      setName("");
      setSubject("");
      setBody("");
    }
  }, [editing]);

  function submit() {
    if (editing) {
      update.mutate({ id: editing.id, values: { name, subject, body } });
      setEditing(null);
    } else {
      create.mutate({ name, subject, body });
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Edit Template" : "New Template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <Textarea rows={6} placeholder="HTML Body" value={body} onChange={e => setBody(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={submit} disabled={create.isPending || update.isPending}>Save</Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
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
                          <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => remove.mutate(t.id)}>Delete</Button>
                          <Button size="sm" onClick={() => send.mutate({ id: t.id, group: "buyers" })}>Buyers</Button>
                          <Button size="sm" variant="secondary" onClick={() => send.mutate({ id: t.id, group: "sellers" })}>Sellers</Button>
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
      </main>
      <Footer />
    </>
  );
}
