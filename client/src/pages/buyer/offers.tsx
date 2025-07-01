import { useQuery, useMutation } from "@tanstack/react-query";
import { Offer } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

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

  const pending = offers.filter((o) => o.status === "pending");
  const accepted = offers.filter((o) => o.status === "accepted");
  const rejected = offers.filter((o) => o.status === "rejected");
  const countered = offers.filter((o) => o.status === "countered");

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
              {[{
                label: "Pending",
                list: pending,
              },
              {
                label: "Countered",
                list: countered,
              },
              {
                label: "Accepted",
                list: accepted,
              },
              {
                label: "Rejected",
                list: rejected,
              }].map(
                ({ label, list }) => (
                  <div key={label} className="space-y-2">
                    <h2 className="font-medium text-lg">{label}</h2>
                    {list.length === 0 ? (
                      <p className="text-sm text-gray-500">None</p>
                    ) : (
                      list.map((o) => (
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
                          {label === "Countered" && (
                            <Button size="sm" onClick={() => acceptCounter.mutate(o.id)}>
                              Accept Counter
                            </Button>
                          )}
                          {label === "Accepted" && (
                            <Button size="sm" onClick={() => handleAddToCart(o)} disabled={items.some(it => it.offerId === o.id)}>
                              {items.some(it => it.offerId === o.id) ? "In Cart" : "Add to Cart"}
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

