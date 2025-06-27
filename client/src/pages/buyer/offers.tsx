import { useQuery } from "@tanstack/react-query";
import { Offer } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";

export default function BuyerOffersPage() {
  type OfferWithProduct = Offer & { productTitle: string };

  const { data: offers = [] } = useQuery<OfferWithProduct[]>({
    queryKey: ["/api/offers"],
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Offers</h1>
        <div className="space-y-4">
          {offers.map((o) => (
            <div key={o.id} className="border p-4 rounded">
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
                <div className="text-right">
                  <p>{formatCurrency(o.price * (1 - SERVICE_FEE_RATE))}</p>
                  <p className="text-xs text-gray-500">after 3.5% commission</p>
                  <span className="text-xs capitalize">{o.status}</span>
                </div>
              </div>
            </div>
          ))}
          {offers.length === 0 && <p>No offers yet.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}

