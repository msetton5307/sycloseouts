import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/products/product-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeaturedProducts() {
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const inStockProducts = products?.filter(p => p.availableUnits > 0) || [];

  const renderSkeletons = () => {
    return Array(4).fill(0).map((_, index) => (
      <div key={index} className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="w-full min-h-80 aspect-w-1 aspect-h-1 rounded-t-lg overflow-hidden lg:h-60 lg:aspect-none">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="p-4">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-3/4 mt-1" />
          <div className="mt-2 flex space-x-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="mt-3 flex space-x-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        </div>
      </div>
    ));
  };

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Featured Closeout Lots</h2>
          <Link href="/products" className="text-primary hover:text-blue-700 font-medium flex items-center">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {isLoading ? (
            renderSkeletons()
          ) : error ? (
            <div className="col-span-full text-center py-10">
              <p className="text-red-500">Failed to load products. Please try again later.</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Refresh
              </Button>
            </div>
          ) : inStockProducts && inStockProducts.length > 0 ? (
            inStockProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p>No products available at the moment.</p>
              <p className="mt-2 text-gray-500">Check back soon for new inventory!</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
