import { useQuery } from "@tanstack/react-query";

import { Product } from "@shared/schema";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Autoplay from "embla-carousel-autoplay";

export default function BannerCarousel() {
  const { user } = useAuth();
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
    <section className="py-6">
      <Carousel
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 5000 })]}
        className="relative"
      >
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem key={product.id} className="basis-full">
              <div className="relative flex h-72 md:h-96 w-full overflow-hidden rounded-lg shadow-lg">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="absolute inset-0 m-auto h-full w-full object-contain p-6"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/60" />
                <div className="relative z-10 ml-auto mr-8 flex max-w-md flex-col justify-center space-y-3 text-right">
                  <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow">
                    {product.title}
                  </h3>
                  <p className="text-lg md:text-xl text-primary-foreground drop-shadow">
                    {formatCurrency(
                      !user || user.role === "buyer"
                        ? product.price * (1 + SERVICE_FEE_RATE)
                        : product.price
                    )}/unit
                  </p>
                  <Button asChild size="sm" variant="secondary" className="self-end">
                    <Link href={`/products/${product.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="bg-white/80 text-gray-700 hover:bg-white" />
        <CarouselNext className="bg-white/80 text-gray-700 hover:bg-white" />
      </Carousel>
    </section>
  );
}