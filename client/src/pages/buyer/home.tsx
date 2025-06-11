import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import FeaturedProducts from "@/components/home/featured-products";
import Categories from "@/components/home/categories";
import { useAuth } from "@/hooks/use-auth";

export default function BuyerHomePage() {
  const { user } = useAuth();

  // Prefetch product data for the featured section
  useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
  });

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Welcome back, {user?.firstName}
        </h1>

        <section className="space-y-6">
          <FeaturedProducts />
          <Categories />
        </section>
      </main>
      <Footer />
    </>
  );
}