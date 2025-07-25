import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Minus,
  ExternalLink,
  Truck,
  Package,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency, addServiceFee } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import AskQuestionDialog from "@/components/products/ask-question-dialog";
import MakeOfferDialog from "@/components/products/make-offer-dialog";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const productId = parseInt(id);
  const [quantity, setQuantity] = useState(0);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const questionMutation = useMutation({
    mutationFn: (q: string) =>
      apiRequest("POST", `/api/products/${productId}/questions`, { question: q }),
    onSuccess: () => {
      toast({ title: "Question sent" });
      if (product) navigate(`/conversations/${product.sellerId}`);
    },
    onError: (err: Error) =>
      toast({ title: "Failed to send question", description: err.message, variant: "destructive" }),
  });

  const offerMutation = useMutation({
    mutationFn: (data: { price: number; quantity: number; selectedVariations?: Record<string, string> }) =>
      apiRequest("POST", `/api/products/${productId}/offers`, data),
    onSuccess: () => {
      toast({ title: "Offer sent" });
    },
    onError: (err: Error) =>
      toast({ title: "Failed to send offer", description: err.message, variant: "destructive" }),
  });

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
  });

  useEffect(() => {
    if (product && quantity === 0) {
      setQuantity(product.minOrderQuantity);
    }
    if (product && product.variations) {
      const varKeys = Object.keys(product.variations);
      let found: Record<string, string> | null = null;

      const search = (idx: number, combo: Record<string, string>) => {
        if (idx === varKeys.length) {
          const key = JSON.stringify(combo);
          const stock =
            product.variationStocks && product.variationStocks[key] !== undefined
              ? product.variationStocks[key]
              : product.availableUnits;
          if (stock > 0) {
            found = { ...combo };
            return true;
          }
          return false;
        }
        const name = varKeys[idx];
        const options = product.variations?.[name] as string[];
        for (const opt of options || []) {
          combo[name] = opt;
          if (search(idx + 1, combo)) return true;
        }
        return false;
      };

      search(0, {});

      const init: Record<string, string> = found ?? {};
      if (!found) {
        Object.entries(product.variations).forEach(([key, vals]) => {
          if (Array.isArray(vals) && vals.length > 0) {
            init[key] = vals[0] as string;
          }
        });
      }

      setSelectedVariations(init);
    }
  }, [product]);

  const handleDecrease = () => {
    if (product && quantity > product.minOrderQuantity) {
      setQuantity(quantity - product.orderMultiple);
    }
  };

  const handleIncrease = () => {
    if (product && quantity + product.orderMultiple <= availableStock) {
      setQuantity(quantity + product.orderMultiple);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity, selectedVariations);
    }
  };

  const varKey = JSON.stringify(selectedVariations);
  const availableStock =
    product?.variationStocks && product.variationStocks[varKey] !== undefined
      ? product.variationStocks[varKey]
      : product?.availableUnits ?? 0;
  const basePrice =
    product?.variationPrices && product.variationPrices[varKey] !== undefined
      ? product.variationPrices[varKey]
      : product?.price ?? 0;
  const unitPrice =
    product && (!user || user.role === "buyer" || user.role === "seller")
      ? addServiceFee(basePrice)
      : basePrice;
  const totalCost = product ? unitPrice * quantity : 0;

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div className="aspect-square bg-gray-200 rounded-lg mb-4 md:mb-0"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 w-3/4 rounded"></div>
                <div className="h-4 bg-gray-200 w-1/2 rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-semibold">Product Not Found</h2>
          <p className="text-gray-500 mb-4">The product may have been removed.</p>
          <Link href="/products">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/products">
            <a className="text-primary hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Products
            </a>
          </Link>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-8">
          <div className="mb-6 md:mb-0">
            {product.images.length > 1 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {product.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="rounded-lg w-full object-contain aspect-square"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <img
                src={product.images[0]}
                alt={product.title}
                className="rounded-lg w-full object-contain aspect-square"
              />
            )}
          </div>

          <div>
            <Badge variant="outline" className="mb-2">{product.category}</Badge>
            <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
            <div className="flex items-center mb-4">
              <Badge className="mr-2">{product.condition}</Badge>
              <Badge className={availableStock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {availableStock > 0 ? "In Stock" : "Out of Stock"}
              </Badge>
            </div>

            <div className="text-3xl font-bold mb-2">{formatCurrency(unitPrice)} <span className="text-sm font-normal text-gray-500">/unit</span></div>
            {product.retailMsrp && (
              <div className="text-sm text-gray-500 mb-2">Retail MSRP: {formatCurrency(product.retailMsrp)}</div>
            )}
            <div className="text-sm text-gray-600 mb-1"><Package className="inline-block h-4 w-4 mr-1" />{availableStock} units</div>
            <div className="text-sm text-gray-600 mb-1"><Layers className="inline-block h-4 w-4 mr-1" />Minimum {product.minOrderQuantity} (by {product.orderMultiple})</div>
            {product.fobLocation && (
              <div className="text-sm text-gray-600 mb-4"><Truck className="inline-block h-4 w-4 mr-1" />Ships from {product.fobLocation}</div>
            )}

            {product.variations && Object.keys(product.variations).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.entries(product.variations).map(([name, options]) => (
                  <div key={name}>
                    <label className="block text-sm font-medium mb-1 capitalize">
                      {name}
                    </label>
                    <Select
                      value={selectedVariations[name]}
                      onValueChange={(val) =>
                        setSelectedVariations((prev) => ({ ...prev, [name]: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(options as string[]).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            <div className="hidden md:flex items-center space-x-2 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrease}
                disabled={quantity <= product.minOrderQuantity}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                className="w-20 text-center"
                value={quantity}
                min={product.minOrderQuantity}
                max={availableStock}
                step={product.orderMultiple}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrease}
                disabled={quantity + product.orderMultiple > availableStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="hidden md:block text-xl font-bold mb-2">Total: {formatCurrency(totalCost)}</div>
            <Button
              className="relative hidden md:block w-full mb-4 pl-8 gap-0"
              onClick={handleAddToCart}
              disabled={quantity < product.minOrderQuantity}
            >
              <ShoppingCart className="absolute left-3 h-4 w-4" aria-hidden="true" />
              Add to Cart
            </Button>

            {(user?.role === "buyer" || user?.role === "seller") && (
              <>
                <MakeOfferDialog
                  onSubmit={(p, q) =>
                    offerMutation.mutate({ price: p, quantity: q, selectedVariations })
                  }
                  maxQuantity={availableStock}
                  currentPrice={unitPrice}
                  currentStock={availableStock}
                  selectedVariations={selectedVariations}
                />
                <AskQuestionDialog onSubmit={q => questionMutation.mutate(q)} />
              </>
            )}

            {product.retailComparisonUrl && (
              <a href={product.retailComparisonUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center text-sm mb-2">
                <ExternalLink className="h-4 w-4 mr-1" />
                Compare retail listing
              </a>
            )}

            {product.upc && (
              <div className="text-sm text-gray-500">UPC: {product.upc}</div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <Tabs defaultValue="description">
            <TabsList className="grid grid-cols-1 w-full">
              <TabsTrigger value="description">Description</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="py-4">
              <p>{product.description}</p>
            </TabsContent>
          </Tabs>
        </div>

        <Separator className="my-10" />

        {availableStock > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t p-4 md:hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecrease}
                  disabled={quantity <= product.minOrderQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  className="w-16 text-center"
                  value={quantity}
                  min={product.minOrderQuantity}
                  max={availableStock}
                  step={product.orderMultiple}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncrease}
                  disabled={quantity + product.orderMultiple > availableStock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="font-semibold text-lg">{formatCurrency(totalCost)}</span>
            </div>
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={quantity < product.minOrderQuantity}
              className="relative w-full pl-8 gap-0"
            >
              <ShoppingCart className="absolute left-3 h-4 w-4" aria-hidden="true" />
              Add to Cart
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
