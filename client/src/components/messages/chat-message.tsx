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
        className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm text-sm whitespace-pre-wrap break-words ${
          isOwn
            ? "bg-primary text-white rounded-br-none"
            : "bg-gray-100 rounded-bl-none"
        }`}
      >
        {message.content}
        <div className="text-[10px] text-gray-500 mt-1 text-right">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    </div>
  );
}
