import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

export default function FeaturedProductsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user && user.role === "admin",
  });

  const { mutate: toggleBanner } = useMutation({
    mutationFn: async (data: { id: number; isBanner: boolean }) => {
      const res = await apiRequest("PUT", `/api/products/${data.id}`, {
        isBanner: data.isBanner,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banner-products"] });
    },
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Featured Products
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Toggle the star icon to mark a product as featured. Featured products
          appear in the homepage banner.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="relative group overflow-hidden">
                <Button
                  size="icon"
                  variant={product.isBanner ? "default" : "outline"}
                  onClick={() =>
                    toggleBanner({
                      id: product.id,
                      isBanner: !product.isBanner,
                    })
                  }
                  className="absolute top-2 right-2 z-10"
                >
                  <Star
                    className="h-5 w-5"
                    fill={product.isBanner ? "currentColor" : "none"}
                  />
                </Button>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base font-semibold line-clamp-2">
                    {product.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center gap-2">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="h-40 w-full object-contain"
                  />
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="text-sm font-medium">
                    {formatCurrency(product.price)} /unit
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
