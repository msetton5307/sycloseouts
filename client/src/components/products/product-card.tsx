import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    addToCart(product, product.minOrderQuantity);
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
          className="text-sm font-medium text-blue-600 hover:underline line-clamp-2"
        >
          {product.title}
        </Link>
        <p className="text-sm text-gray-500 line-clamp-2">
          {product.description}
        </p>
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-2">
          <span>MOQ: {product.minOrderQuantity}</span>
          <span>Order by {product.orderMultiple}</span>
          <span>{product.availableUnits} avail.</span>
          <span>{product.condition}</span>
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