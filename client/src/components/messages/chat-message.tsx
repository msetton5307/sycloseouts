import { Message } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

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
            : "bg-muted"
        }`}
      >
        {message.content}
        <div className="text-xs text-muted-foreground mt-1 text-right">
          {format(
            utcToZonedTime(
              parseISO(message.createdAt as unknown as string),
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            ),
            "p",
          )}
        </div>
      </div>
    </div>
  );
}
