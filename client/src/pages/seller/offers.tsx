import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Offer } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MakeOfferDialog from "@/components/products/make-offer-dialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SellerOffersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  type OfferWithProduct = Offer & {
    productTitle: string;
    productAvailableUnits: number;
    productImages: string[];
  };

  const { data: offers = [], isLoading } = useQuery<OfferWithProduct[]>({
    queryKey: ["/api/offers"],
  });

  type Status = "pending" | "countered" | "accepted" | "rejected";
  const [status, setStatus] = useState<Status>("pending");

  const pending = offers.filter((o) => o.status === "pending");
  const countered = offers.filter((o) => o.status === "countered");
  const accepted = offers.filter((o) => o.status === "accepted");
  const rejected = offers.filter((o) => o.status === "rejected");

  const listMap: Record<Status, OfferWithProduct[]> = {
    pending,
    countered,
    accepted,
    rejected,
  };

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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Offers</h1>
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
                      <div className="flex gap-4 justify-between">
                        {o.productImages?.[0] && (
                          <img
                            src={o.productImages[0]}
                            alt={o.productTitle}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 flex justify-between">
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
                          </div>
                          <div className="text-right space-y-1">
                            <span className="text-xs capitalize">{o.status}</span>
                          </div>
                        </div>
                      </div>
                      {status !== "accepted" && status !== "rejected" && (
                        <div className="space-x-2">
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
