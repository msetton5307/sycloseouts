import { useQuery, useMutation } from "@tanstack/react-query";
import { Offer } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MakeOfferDialog from "@/components/products/make-offer-dialog";

export default function BuyerOffersPage() {
  type OfferWithProduct = Offer & { productTitle: string };

  const { data: offers = [], isLoading } = useQuery<OfferWithProduct[]>({
    queryKey: ["/api/offers"],
  });

  const { toast } = useToast();
  const { addToCart, items } = useCart();

  const acceptCounter = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/offers/${id}/accept-counter`).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Offer accepted" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const rejectCounter = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/offers/${id}/reject-counter`).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Counter rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const counterBack = useMutation({
    mutationFn: ({ id, price, quantity }: { id: number; price: number; quantity: number }) =>
      apiRequest("POST", `/api/offers/${id}/counter-buyer`, { price, quantity }).then((r) => r.json()),
    onSuccess: () => {
      toast({ title: "Counter sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
    },
    onError: (err: Error) =>
      toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  async function handleAddToCart(o: OfferWithProduct) {
    try {
      const res = await fetch(`/api/products/${o.productId}`);
      if (!res.ok) return;
      const product = await res.json();
      addToCart(
        product,
        o.quantity,
        o.selectedVariations ?? {},
        o.price,
        o.quantity,
        o.id
      );
    } catch (err) {
      console.error(err);
    }
  }

  type Status = "pending" | "countered" | "accepted" | "rejected";
  const [status, setStatus] = useState<Status>("pending");

  const pending = offers.filter((o) => o.status === "pending");
  const accepted = offers.filter((o) => o.status === "accepted");
  const rejected = offers.filter((o) => o.status === "rejected");
  const countered = offers.filter((o) => o.status === "countered");

  const listMap: Record<Status, OfferWithProduct[]> = {
    pending,
    countered,
    accepted,
    rejected,
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Offers</h1>
        <div className="space-y-8">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="flex space-x-2 mb-4">
                {([
                  { label: "Pending", key: "pending", color: "bg-yellow-600" },
                  { label: "Countered", key: "countered", color: "bg-blue-600" },
                  { label: "Accepted", key: "accepted", color: "bg-green-600" },
                  { label: "Rejected", key: "rejected", color: "bg-red-600" },
                ] as { label: string; key: Status; color: string }[]).map(
                  ({ label, key, color }) => (
                    <Button
                      key={key}
                      variant={status === key ? "default" : "outline"}
                      className={status === key ? `${color} text-white` : ""}
                      onClick={() => setStatus(key)}
                    >
                      {label}
                      <Badge variant="secondary" className="ml-2">
                        {listMap[key].length}
                      </Badge>
                    </Button>
                  )
                )}
              </div>
              <div className="space-y-4">
                {listMap[status].length === 0 ? (
                  <p className="text-sm text-gray-500">None</p>
                ) : (
                  listMap[status].map((o) => (
                    <div key={o.id} className="border p-4 rounded space-y-2">
                      <div className="flex justify-between">
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
                        </div>
                        <div className="text-right space-y-1">
                          <p>{formatCurrency(o.price * (1 + SERVICE_FEE_RATE))}</p>
                          <span className="text-xs capitalize">{o.status}</span>
                        </div>
                      </div>
                      {status === "countered" && (
                        <div className="space-x-2">
                          <Button size="sm" onClick={() => acceptCounter.mutate(o.id)}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => rejectCounter.mutate(o.id)}>Decline</Button>
                          <MakeOfferDialog
                            onSubmit={(p, q) => counterBack.mutate({ id: o.id, price: p, quantity: q })}
                            maxQuantity={o.quantity}
                            label="Counter"
                            className=""
                          />
                        </div>
                      )}
                      {status === "accepted" && (
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(o)}
                          disabled={items.some((it) => it.offerId === o.id)}
                        >
                          {items.some((it) => it.offerId === o.id) ? "In Cart" : "Add to Cart"}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}