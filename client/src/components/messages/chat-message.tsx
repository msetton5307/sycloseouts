import { Message } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

export default function ChatMessage({ message, isOwn }: ChatMessageProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-card border"
        }`}
      >
        {message.content}
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    </div>
  );
}