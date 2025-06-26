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

  const inStockProducts = products?.filter(p => p.availableUnits > 0) || [];

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

  if (inStockProducts.length === 0) return null;

  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <div className="relative group rounded-2xl overflow-hidden shadow-2xl">
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 5000 })]}
          className="relative w-full"
        >
          <CarouselContent>
            {inStockProducts.map((product) => {
              const price =
                !user || user.role === "buyer"
                  ? product.price * (1 + SERVICE_FEE_RATE)
                  : product.price;
              return (
                <CarouselItem key={product.id} className="basis-full">
                  <div className="relative w-full min-h-96 md:min-h-[32rem]">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent md:bg-gradient-to-r" />
                    <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:p-16 text-white">
                      <div className="max-w-md mx-auto md:max-w-lg md:ml-auto space-y-3 text-center md:text-right">
                        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-white bg-blue-500 rounded-full">
                          NEW ARRIVAL
                        </span>
                        <h3 className="text-2xl md:text-5xl font-bold drop-shadow-lg">
                          {product.title}
                        </h3>
                        <p className="text-sm md:text-base drop-shadow-md line-clamp-3">
                          {product.description}
                        </p>
                        <div className="inline-block px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                          <span className="text-lg md:text-2xl font-bold">
                            {formatCurrency(price)}
                          </span>
                          <span className="text-sm opacity-80">/unit</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:justify-end items-center gap-2 md:gap-4">
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
            {inStockProducts.map((_, index) => (
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