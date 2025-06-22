import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, SERVICE_FEE_RATE } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const displayPrice =
    !user || user.role === "buyer"
      ? product.price * (1 + SERVICE_FEE_RATE)
      : product.price;
  
  const handleAddToCart = () => {
    addToCart(product, product.minOrderQuantity, {});
  };
  
  return (
    <Card className="flex flex-col bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-square bg-white border-b flex items-center justify-center hover:opacity-90">
          <img
            src={product.images[0]}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-contain p-4"
          />
        </div>
      </Link>
      <CardContent className="flex flex-col flex-1 p-4 gap-2">
        <Link
          href={`/products/${product.id}`}
          className="text-base font-semibold text-gray-900 hover:underline line-clamp-2"
        >
          {product.title}
        </Link>
        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant="secondary">MOQ: {product.minOrderQuantity}</Badge>
          <Badge variant="secondary">Order by {product.orderMultiple}</Badge>
          <Badge variant="secondary">{product.availableUnits} avail.</Badge>
          <Badge variant="secondary">{product.condition}</Badge>
        </div>
        <div className="mt-auto">
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(displayPrice)}{' '}
            <span className="text-sm font-normal text-gray-600">/unit</span>
          </p>
          <Button
            size="sm"
            className="mt-2 w-full flex items-center justify-center"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="mr-1 h-4 w-4" /> Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}