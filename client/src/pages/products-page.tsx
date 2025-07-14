import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ProductCard from "@/components/products/product-card";
import ProductListItem from "@/components/products/product-list-item";
import ProductFilter from "@/components/products/product-filter";
import { Button } from "@/components/ui/button";
import { Loader2, Grid3X3, List } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ProductsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    () => (window.innerWidth < 768 ? "list" : "grid")
  );

  useEffect(() => {
    setViewMode(isMobile ? "list" : "grid");
  }, [isMobile]);
  const [filters, setFilters] = useState({
    search: "",
    category: "All Categories",
    condition: "All Conditions",
    sort: "newest"
  });
  
  const {
    data: products,
    isLoading,
    error,
    refetch
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Filter and sort products based on user selections
  const filteredProducts = products ? products.filter(product => {
    if (product.availableUnits <= 0) {
      return false;
    }
    // Filter by search term
    if (filters.search && !product.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !product.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Filter by category
    if (filters.category !== "All Categories" && product.category !== filters.category) {
      return false;
    }
    
    // Filter by condition
    if (filters.condition !== "All Conditions" && product.condition !== filters.condition) {
      return false;
    }
    
    return true;
  }) : [];
  
  // Sort products
  const sortedProducts = [...(filteredProducts || [])].sort((a, b) => {
    switch (filters.sort) {
      case "price_low":
        return a.price - b.price;
      case "price_high":
        return b.price - a.price;
      case "qty_high":
        return b.availableUnits - a.availableUnits;
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };
  
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-2">
            Wholesale Products
          </h1>
          <p className="text-lg text-gray-500">
            Browse our collection of closeout lots and wholesale inventory at competitive prices.
          </p>
        </div>
        
        <ProductFilter 
          onFilterChange={handleFilterChange}
          categories={[
            "All Categories",
            "Electronics",
            "Apparel",
            "Home Goods",
            "Toys & Games",
            "Kitchen",
            "Beauty",
            "Sports",
            "Office",
            "Other"
          ]}
          conditions={[
            "All Conditions",
            "New",
            "Like New",
            "Good",
            "Refurbished",
            "Used"
          ]}
        />
        
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-500">
            {sortedProducts?.length || 0} products found
          </div>
          <div className="flex space-x-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4 mr-1" /> Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" /> List
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-red-500 mb-2">Error loading products</h3>
            <p className="text-gray-500 mb-4">There was a problem loading the products.</p>
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : sortedProducts && sortedProducts.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8"
                : "space-y-4"
            }
          >
            {sortedProducts.map(product =>
              viewMode === "grid" ? (
                <ProductCard key={product.id} product={product} />
              ) : (
                <ProductListItem key={product.id} product={product} />
              )
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later for new inventory.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}