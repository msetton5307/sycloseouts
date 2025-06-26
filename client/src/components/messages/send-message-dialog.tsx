import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SendMessageDialogProps {
  trigger: React.ReactNode;
  onSubmit: (message: string) => void;
  title?: string;
  placeholder?: string;
}

export default function SendMessageDialog({
  trigger,
  onSubmit,
  title = "Send Message",
  placeholder = "Enter your message",
}: SendMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit() {
    if (!message.trim()) return;
    onSubmit(message.trim());
    setMessage("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={placeholder}
          className="mt-2"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!message.trim()}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
