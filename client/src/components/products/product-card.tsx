import { Product } from "@shared/schema";
import { Link } from "wouter";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  
  const handleAddToCart = () => {
    addToCart(product, product.minOrderQuantity);
  };
  
  return (
    <Card className="group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="w-full min-h-80 aspect-w-1 aspect-h-1 rounded-t-lg overflow-hidden group-hover:opacity-90 lg:h-60 lg:aspect-none">
        <Link href={`/products/${product.id}`}>
          <img 
            src={product.images[0]} 
            alt={product.title}
            className="w-full h-full object-center object-cover lg:w-full lg:h-full cursor-pointer"
          />
        </Link>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between">
          <h3 className="text-sm text-gray-700 font-medium">
            <Link href={`/products/${product.id}`}>
              <a className="cursor-pointer">
                <span aria-hidden="true" className="absolute inset-0"></span>
                {product.title}
              </a>
            </Link>
          </h3>
          <p className="text-sm font-medium text-green-600">{formatCurrency(product.price)}/unit</p>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {product.description.length > 80
            ? `${product.description.substring(0, 80)}...`
            : product.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {product.availableUnits} units available
          </Badge>
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            MOQ: {product.minOrderQuantity}
          </Badge>
        </div>
        <div className="mt-3">
          <Button
            size="sm"
            className="flex items-center"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="mr-1 h-4 w-4" /> Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
