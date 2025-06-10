import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { 
  ShoppingCart, 
  ArrowLeft, 
  Plus, 
  Minus,
  ExternalLink,
  Truck,
  Package,
  Layers
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
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function ProductDetailPage() {
  const { id } = useParams();
  const productId = parseInt(id);
  const [quantity, setQuantity] = useState(0);
  const { addToCart } = useCart();
  
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
  });
  
  // Set default quantity to MOQ when product loads
  useState(() => {
    if (product && quantity === 0) {
      setQuantity(product.minOrderQuantity);
    }
  });
  
  const handleDecrease = () => {
    if (product && quantity > product.minOrderQuantity) {
      setQuantity(quantity - 1);
    }
  };
  
  const handleIncrease = () => {
    if (product && quantity < product.availableUnits) {
      setQuantity(quantity + 1);
    }
  };
  
  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
    }
  };
  
  // Calculate total cost
  const totalCost = product ? product.price * quantity : 0;
  
  if (isLoading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div className="aspect-w-1 aspect-h-1 rounded-lg bg-gray-200 mb-4 md:mb-0"></div>
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-full mt-6"></div>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
            <p className="text-gray-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link href="/products">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/products">
            <a className="text-primary hover:underline flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Products
            </a>
          </Link>
        </div>
        
        <div className="md:grid md:grid-cols-2 md:gap-8">
          {/* Product Images */}
          <div className="mb-6 md:mb-0">
            {product.images.length > 1 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {product.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <img
                          src={image}
                          alt={`${product.title} - Image ${index + 1}`}
                          className="rounded-lg w-full h-auto aspect-square object-cover object-center"
                        />
                      </div>
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
                className="rounded-lg w-full h-auto aspect-square object-cover object-center"
              />
            )}
            
            {/* Thumbnail row for multiple images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {product.images.slice(0, 5).map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-16 w-full object-cover rounded cursor-pointer border-2 border-transparent hover:border-primary"
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div>
            <div className="mb-6">
              <Badge className="mb-2" variant="outline">
                {product.category}
              </Badge>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl mb-2">
                {product.title}
              </h1>
              <div className="flex items-center mb-4">
                <Badge variant="secondary" className="mr-2 bg-blue-100 text-blue-800">
                  {product.condition}
                </Badge>
                {product.availableUnits > 0 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    In Stock
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    Out of Stock
                  </Badge>
                )}
              </div>
              
              <div className="mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(product.price)} <span className="text-lg font-normal text-gray-500">per unit</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Package className="h-4 w-4 mr-1" />
                  <span>{product.availableUnits} units available</span>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Layers className="h-4 w-4 mr-1" />
                  <span>Minimum order: {product.minOrderQuantity} units</span>
                </div>
                {product.fobLocation && (
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Truck className="h-4 w-4 mr-1" />
                    <span>Ships from: {product.fobLocation}</span>
                  </div>
                )}
              </div>
              
              {/* Quantity Selector and Add to Cart */}
              {product.availableUnits > 0 && (
                <div className="mb-6">
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <div className="flex flex-col sm:flex-row items-center mb-4 space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDecrease}
                      disabled={quantity <= product.minOrderQuantity}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-16 mx-2 text-center font-medium">
                      {quantity}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleIncrease}
                      disabled={quantity >= product.availableUnits}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm text-gray-500 mb-1">Total Price:</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalCost)}
                    </div>
                  </div>
                  
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={quantity < product.minOrderQuantity}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                </div>
              )}
              
              {/* Retail Comparison Link */}
              {product.retailComparisonUrl && (
                <a 
                  href={product.retailComparisonUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary hover:underline mb-4"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View retail listing for comparison
                </a>
              )}
              
              {/* UPC */}
              {product.upc && (
                <div className="text-sm text-gray-500 mb-4">
                  <span className="font-medium">UPC:</span> {product.upc}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Product Details Tabs */}
        <div className="mt-10">
          <Tabs defaultValue="description">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
              <TabsTrigger value="seller">Seller Info</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="py-4">
              <div className="prose max-w-none">
                <p>{product.description}</p>
                
                <h3 className="text-lg font-semibold mt-4">Product Details</h3>
                <ul className="list-disc pl-5 mt-2">
                  <li><strong>Category:</strong> {product.category}</li>
                  <li><strong>Condition:</strong> {product.condition}</li>
                  {product.upc && <li><strong>UPC:</strong> {product.upc}</li>}
                  <li><strong>Units Available:</strong> {product.availableUnits}</li>
                  <li><strong>Minimum Order:</strong> {product.minOrderQuantity} units</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="shipping" className="py-4">
              <h3 className="text-lg font-semibold mb-2">Shipping Information</h3>
              <p className="mb-4">This product ships from {product.fobLocation || "seller's location"}.</p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Shipping Policies</h4>
                <ul className="list-disc pl-5">
                  <li>Standard shipping usually takes 3-7 business days</li>
                  <li>Orders are processed within 1-2 business days</li>
                  <li>Bulk orders may require additional processing time</li>
                  <li>Shipping costs are calculated at checkout based on weight and destination</li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="seller" className="py-4">
              <h3 className="text-lg font-semibold mb-2">About the Seller</h3>
              <p className="mb-4">
                This product is being sold by a verified SY Closeouts seller. 
                All sellers on our platform are vetted to ensure product quality and reliable service.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Seller Policies</h4>
                <ul className="list-disc pl-5">
                  <li>Returns accepted within 14 days of delivery</li>
                  <li>Buyer is responsible for return shipping costs</li>
                  <li>Contact seller for bulk pricing on orders exceeding 500 units</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <Separator className="my-10" />
        
        {/* Related Products would go here */}
        
      </main>
      <Footer />
    </>
  );
}
