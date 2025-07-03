import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, addServiceFee } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";

interface ProductCardProps {
  product: Product;
}

const conditionColors: Record<string, string> = {
  New: "bg-green-100 text-green-800 hover:bg-green-100",
  "Like New": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Good: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  Refurbished: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  Used: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const displayPrice =
    !user || user.role === "buyer"
      ? addServiceFee(product.price)
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
          className="text-lg font-semibold text-primary hover:underline line-clamp-2"
        >
          {product.title}
        </Link>
        <div className="flex flex-wrap gap-1 text-xs">
          {product.minOrderQuantity >= product.totalUnits ? (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Take All Lot
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              MOQ: {product.minOrderQuantity}
            </Badge>
          )}
          <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            Order by {product.orderMultiple}
          </Badge>
          <Badge
            variant="outline"
            className={product.availableUnits > 0 ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
          >
            {product.availableUnits} avail.
          </Badge>
          <Badge variant="outline" className={conditionColors[product.condition] ?? "bg-gray-100 text-gray-800 hover:bg-gray-100"}>
            {product.condition}
          </Badge>
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