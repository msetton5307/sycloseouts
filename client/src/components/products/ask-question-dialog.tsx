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

interface AskQuestionDialogProps {
  onSubmit: (question: string) => void;
}

export default function AskQuestionDialog({ onSubmit }: AskQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");

  function handleSubmit() {
    if (!question.trim()) return;
    onSubmit(question.trim());
    setQuestion("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mb-4">
          Ask Seller a Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ask Seller a Question</DialogTitle>
        </DialogHeader>
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Enter your question"
          className="mt-2"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!question.trim()}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
