import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Message, User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface ConversationPreviewProps {
  otherId: number;
  selected?: boolean;
}

export default function ConversationPreview({ otherId, selected }: ConversationPreviewProps) {
  const { user: currentUser } = useAuth();
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/" + otherId],
  });
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations/" + otherId + "/messages"],
  });

  const lastMessage = messages[messages.length - 1];
  const hasUnread = messages.some(
    m => m.receiverId === currentUser?.id && !m.isRead,
  );

  return (
    <Link
      href={`/conversations/${otherId}`}
      className={`relative flex items-center gap-3 p-3 border-b hover:bg-gray-50 ${selected ? "bg-gray-50" : ""}`}
    >
      <Avatar>
        <AvatarImage src={user?.avatarUrl || undefined} alt={user?.username} />
        <AvatarFallback>
          {user?.firstName?.charAt(0)}
          {user?.lastName?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {user ? `${user.firstName} ${user.lastName}` : `User #${otherId}`}
          </span>
          {lastMessage && (
            <span className="text-gray-500 text-xs">
              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="text-gray-600 text-sm truncate">{lastMessage.content}</p>
        )}
      </div>
      {hasUnread && <span className="absolute right-3 top-4 h-2 w-2 bg-blue-500 rounded-full" />}
    </Link>
  );
}