import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, addServiceFee } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";

interface ProductListItemProps {
  product: Product;
}

const conditionColors: Record<string, string> = {
  New: "bg-green-100 text-green-800 hover:bg-green-100",
  "Like New": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Good: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  Refurbished: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  Used: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export default function ProductListItem({ product }: ProductListItemProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const displayPrice =
    !user || user.role === "buyer" || user.role === "seller"
      ? addServiceFee(product.price)
      : product.price;

  function handleAddToCart() {
    addToCart(product, product.minOrderQuantity, {});
  }

  return (
    <Card className="flex overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <Link
        href={`/products/${product.id}`}
        className="relative w-32 shrink-0 border-r flex items-center justify-center bg-background"
      >
        <img
          src={product.images[0]}
          alt={product.title}
          className="absolute inset-0 w-full h-full object-contain p-4"
        />
      </Link>
      <CardContent className="flex flex-col sm:flex-row flex-1 justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={`/products/${product.id}`}
            className="text-sm font-medium text-primary hover:underline line-clamp-2"
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
            {product.minOrderQuantity < product.totalUnits && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                Order by {product.orderMultiple}
              </Badge>
            )}
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
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
          <p className="text-base font-semibold text-gray-900">
            {formatCurrency(displayPrice)}{' '}
            <span className="text-xs font-normal text-gray-600">/unit</span>
          </p>
          {product.retailMsrp && (
            <p className="text-xs text-gray-500">MSRP: {formatCurrency(product.retailMsrp)}</p>
          )}
          <div className="flex gap-2 mt-1">
            <Button size="sm" className="flex items-center" onClick={handleAddToCart}>
              <ShoppingCart className="mr-1 h-4 w-4" /> Add to Cart
            </Button>
            <Link href={`/products/${product.id}`}> 
              <Button size="sm" variant="outline">
                Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
