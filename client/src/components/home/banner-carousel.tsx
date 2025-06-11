import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import ProductCard from "@/components/products/product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export default function BannerCarousel() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/banner-products"],
  });

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
      <Carousel opts={{ loop: true }}>
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem key={product.id} className="basis-full p-4">
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}
