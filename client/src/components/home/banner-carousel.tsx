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
import type { CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";

export default function BannerCarousel() {
  const { user } = useAuth();
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/banner-products"],
  });

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    return () => {
      api.off("select", update);
    };
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
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="relative group">
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 5000 })]}
          className="relative h-80 md:h-[32rem] w-full overflow-hidden rounded-2xl shadow-2xl"
        >
          <CarouselContent className="h-full">
            {products.map((product) => {
              const price =
                !user || user.role === "buyer"
                  ? product.price * (1 + SERVICE_FEE_RATE)
                  : product.price;
              return (
                <CarouselItem key={product.id} className="basis-full h-full">
                  <div className="relative w-full h-full">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/10 md:bg-gradient-to-r" />
                    <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-16 text-white">
                      <div className="max-w-lg ml-auto text-right">
                        <span className="inline-block px-3 py-1 mb-2 text-xs font-semibold tracking-wider text-white bg-blue-500 rounded-full">
                          NEW ARRIVAL
                        </span>
                        <h3 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
                          {product.title}
                        </h3>
                        <p className="text-sm md:text-base mb-6 drop-shadow-md">
                          {product.description}
                        </p>
                        <div className="inline-block px-4 py-2 mb-6 rounded-full bg-white/20 backdrop-blur-sm">
                          <span className="text-xl md:text-2xl font-bold">
                            {formatCurrency(price)}
                          </span>
                          <span className="text-sm opacity-80">/unit</span>
                        </div>
                        <div className="flex justify-end space-x-4">
                          <Button
                            asChild
                            className="bg-white text-gray-800 font-medium hover:bg-gray-100"
                            variant="secondary"
                          >
                            <Link href={`/products/${product.id}`}>Shop Now</Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            className="border border-white text-white hover:bg-white/10"
                          >
                            <Link href={`/products/${product.id}`}>Learn More</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="!left-4 !top-1/2 !-translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/80 hover:bg-white text-gray-800 shadow-lg transition-all opacity-0 group-hover:opacity-100" />
          <CarouselNext className="!right-4 !top-1/2 !-translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/80 hover:bg-white text-gray-800 shadow-lg transition-all opacity-0 group-hover:opacity-100" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={
                  index === current
                    ? "w-3 h-3 rounded-full bg-white"
                    : "w-3 h-3 rounded-full bg-white/50 hover:bg-white/80"
                }
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  );
}
