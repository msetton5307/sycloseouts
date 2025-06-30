import { useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useNotifications } from "@/hooks/use-notifications";
import { Link } from "wouter";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function NotificationsPage() {
  const { data: notes = [], clearNotification } = useNotifications();
  const [removing, setRemoving] = useState<number | null>(null);
  const unreadCount = notes.filter(n => !n.isRead).length;

  function titleFor(type: string) {
    switch (type) {
      case "order":
        return "Order Update";
      case "message":
        return "New Message";
      case "offer":
        return "Offer Update";
      case "support":
        return "Support Ticket";
      default:
        return "Notification";
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-sm text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        {notes.length === 0 ? (
          <p>No notifications.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <Alert
                key={n.id}
                data-removing={removing === n.id}
                className="relative transition-transform duration-300 data-[removing=true]:translate-x-full data-[removing=true]:opacity-0"
              >
                <button
                  onClick={() => {
                    setRemoving(n.id);
                    setTimeout(() => clearNotification.mutate(n.id), 300);
                  }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
                <AlertTitle>{titleFor(n.type)}</AlertTitle>
                <AlertDescription>
                  {n.link ? (
                    <Link href={n.link} className="text-primary underline">
                      {n.content}
                    </Link>
                  ) : (
                    <span>{n.content}</span>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
