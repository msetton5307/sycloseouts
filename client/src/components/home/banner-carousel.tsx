import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Product } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export default function BannerCarousel() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/banner-products"],
  });

  const [api, setApi] = useState<CarouselApi>();

  // Auto advance slides every 4 seconds
  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => api.scrollNext(), 4000);
    return () => clearInterval(id);
  }, [api]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <section className="py-4">
      <Carousel opts={{ loop: true }} setApi={setApi}>
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem key={product.id} className="basis-full p-4">
              <div className="relative h-64 md:h-80 w-full bg-gray-100 flex items-center justify-center rounded-lg overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="max-h-full w-auto object-contain"
                />
                <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-4 rounded shadow">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.title}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {formatCurrency(product.price)}/unit
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}
