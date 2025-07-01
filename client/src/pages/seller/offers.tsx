import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Offer } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import MakeOfferDialog from "@/components/products/make-offer-dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function SellerOffersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  type OfferWithProduct = Offer & { productTitle: string; productAvailableUnits: number };

  const { data: offers = [], isLoading } = useQuery<OfferWithProduct[]>({
    queryKey: ["/api/offers"],
  });

  const counterOffer = useMutation({
    mutationFn: ({ id, price, quantity }: { id: number; price: number; quantity: number }) =>
      apiRequest("POST", `/api/offers/${id}/counter`, { price, quantity }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Counter offer sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  function handleCounter(id: number, price: number, quantity: number) {
    counterOffer.mutate({ id, price, quantity });
  }

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
                <p className="font-medium">{o.productTitle}</p>
                {o.selectedVariations && (
                  <p className="text-sm text-gray-500">
                    {Object.entries(o.selectedVariations)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </p>
                )}
                <p className="text-sm">Quantity: {o.quantity}</p>
                <p className="text-sm">Price: {formatCurrency(o.price)}</p>
                <span className="text-xs capitalize">Status: {o.status}</span>
              </div>
              {o.status === "pending" && (
                <div className="space-x-2 flex items-start">
                  <Button size="sm" onClick={() => handleAccept(o.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(o.id)}>
                    Reject
                  </Button>
                  <MakeOfferDialog
                    onSubmit={(p, q) => handleCounter(o.id, p, q)}
                    maxQuantity={o.productAvailableUnits}
                    label="Counter"
                    className=""
                  />
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
