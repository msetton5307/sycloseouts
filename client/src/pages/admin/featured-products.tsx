import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Star } from "lucide-react";
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
        <h1 className="text-3xl font-extrabold tracking-tight mb-6">Featured Products</h1>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {product.title}
                    <Button
                      size="icon"
                      variant={product.isBanner ? "default" : "outline"}
                      onClick={() => toggleBanner({ id: product.id, isBanner: !product.isBanner })}
                    >
                      <Star className="h-4 w-4" fill={product.isBanner ? "currentColor" : "none"} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={product.images[0]} alt={product.title} className="h-40 w-full object-contain mb-2" />
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
