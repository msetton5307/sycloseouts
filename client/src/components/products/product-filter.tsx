import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Filter, RefreshCw } from "lucide-react";

interface FilterValues {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  condition: string;
  sort: string;
}

interface ProductFilterProps {
  onFilterChange: (filters: FilterValues) => void;
  categories: string[];
  conditions: string[];
  maxPriceValue: number;
}

export default function ProductFilter({
  onFilterChange,
  categories = ["All Categories", "Electronics", "Apparel", "Home Goods", "Toys & Games", "Kitchen"],
  conditions = ["All Conditions", "New", "Like New", "Good", "Refurbished"],
  maxPriceValue = 1000
}: ProductFilterProps) {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    category: "All Categories",
    minPrice: 0,
    maxPrice: maxPriceValue,
    condition: "All Conditions",
    sort: "newest"
  });
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, maxPriceValue]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  useEffect(() => {
    // Parse URL query parameters on mount
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search") || "";
    const categoryParam = params.get("category") || "All Categories";
    const minPriceParam = params.get("minPrice") ? Number(params.get("minPrice")) : 0;
    const maxPriceParam = params.get("maxPrice") ? Number(params.get("maxPrice")) : maxPriceValue;
    const conditionParam = params.get("condition") || "All Conditions";
    const sortParam = params.get("sort") || "newest";
    
    setFilters({
      search: searchParam,
      category: categoryParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      condition: conditionParam,
      sort: sortParam
    });
    
    setPriceRange([minPriceParam, maxPriceParam]);
  }, [maxPriceValue]);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  const handleFilterChange = (key: keyof FilterValues, value: string | number) => {
    setFilters({ ...filters, [key]: value });
  };
  
  const handlePriceChange = (value: [number, number]) => {
    setPriceRange(value);
    setFilters({ ...filters, minPrice: value[0], maxPrice: value[1] });
  };
  
  const applyFilters = () => {
    // Update URL with filter params
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category !== "All Categories") params.set("category", filters.category);
    if (filters.minPrice > 0) params.set("minPrice", filters.minPrice.toString());
    if (filters.maxPrice < maxPriceValue) params.set("maxPrice", filters.maxPrice.toString());
    if (filters.condition !== "All Conditions") params.set("condition", filters.condition);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    
    setLocation(`/products?${params.toString()}`);
    onFilterChange(filters);
    
    // Close mobile filters if open
    if (showMobileFilters) {
      setShowMobileFilters(false);
    }
  };
  
  const resetFilters = () => {
    const defaultFilters = {
      search: "",
      category: "All Categories",
      minPrice: 0,
      maxPrice: maxPriceValue,
      condition: "All Conditions",
      sort: "newest"
    };
    
    setFilters(defaultFilters);
    setPriceRange([0, maxPriceValue]);
    setLocation("/products");
    onFilterChange(defaultFilters);
  };
  
  return (
    <div className="mb-6">
      {/* Search Bar - Always visible */}
      <form onSubmit={handleSearchSubmit} className="mb-4 flex space-x-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search products..."
            className="pl-10"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          className="md:hidden"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </form>
      
      {/* Desktop Filters */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange("category", value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={filters.condition}
              onValueChange={(value) => handleFilterChange("condition", value)}
            >
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="sort">Sort By</Label>
            <Select
              value={filters.sort}
              onValueChange={(value) => handleFilterChange("sort", value)}
            >
              <SelectTrigger id="sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="qty_high">Quantity: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={applyFilters} className="flex-1">Apply</Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={resetFilters}
              className="flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <Label>Price Range: ${priceRange[0]} - ${priceRange[1]}</Label>
          <Slider
            defaultValue={[0, maxPriceValue]}
            max={maxPriceValue}
            step={5}
            value={priceRange}
            onValueChange={handlePriceChange}
            className="mt-2"
          />
        </div>
      </div>
      
      {/* Mobile Filters */}
      {showMobileFilters && (
        <div className="md:hidden mt-4 bg-white p-4 rounded-lg shadow-md">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="category">
              <AccordionTrigger>Category</AccordionTrigger>
              <AccordionContent>
                <Select
                  value={filters.category}
                  onValueChange={(value) => handleFilterChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="price">
              <AccordionTrigger>Price Range</AccordionTrigger>
              <AccordionContent>
                <Label>Price: ${priceRange[0]} - ${priceRange[1]}</Label>
                <Slider
                  defaultValue={[0, maxPriceValue]}
                  max={maxPriceValue}
                  step={5}
                  value={priceRange}
                  onValueChange={handlePriceChange}
                  className="mt-2"
                />
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="condition">
              <AccordionTrigger>Condition</AccordionTrigger>
              <AccordionContent>
                <Select
                  value={filters.condition}
                  onValueChange={(value) => handleFilterChange("condition", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="sort">
              <AccordionTrigger>Sort By</AccordionTrigger>
              <AccordionContent>
                <Select
                  value={filters.sort}
                  onValueChange={(value) => handleFilterChange("sort", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="qty_high">Quantity: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
          <div className="mt-4 flex gap-2">
            <Button onClick={applyFilters} className="flex-1">Apply Filters</Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={resetFilters}
              className="flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
