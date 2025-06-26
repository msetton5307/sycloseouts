import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Offer } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function SellerOffersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
  });

  const acceptOffer = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/offers/${id}/accept`).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Offer accepted" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const rejectOffer = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/offers/${id}/reject`).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Offer rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  function handleAccept(id: number) {
    if (window.confirm("Accept this offer?")) {
      acceptOffer.mutate(id);
    }
  }

  function handleReject(id: number) {
    if (window.confirm("Reject this offer?")) {
      rejectOffer.mutate(id);
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold mb-6">Offers</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : offers.length > 0 ? (
          offers.map((o) => (
            <div key={o.id} className="border p-4 rounded flex justify-between">
              <div>
                <p className="font-medium">Offer #{o.id} for product #{o.productId}</p>
                <p className="text-sm">Buyer #{o.buyerId}</p>
                <p className="text-sm">Quantity: {o.quantity}</p>
                <p className="text-sm">Price: {formatCurrency(o.price)}</p>
                <span className="text-xs capitalize">Status: {o.status}</span>
                {o.status === "accepted" && o.orderId && (
                  <p className="text-xs">Order #{o.orderId}</p>
                )}
              </div>
              {o.status === "pending" && (
                <div className="space-x-2 flex items-start">
                  <Button size="sm" onClick={() => handleAccept(o.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(o.id)}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>No offers yet.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
