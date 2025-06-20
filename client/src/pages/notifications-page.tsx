import { useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useNotifications } from "@/hooks/use-notifications";
import { Link } from "wouter";

export default function NotificationsPage() {
  const { data: notes = [], markRead } = useNotifications();

  useEffect(() => {
    markRead.mutate();
  }, []);

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {notes.length === 0 ? (
          <p>No notifications.</p>
        ) : (
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="border rounded p-4 bg-white shadow">
                {n.link ? (
                  <Link href={n.link} className="text-primary underline">
                    {n.content}
                  </Link>
                ) : (
                  <p>{n.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
