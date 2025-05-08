import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, InsertProduct, Product } from "@shared/schema";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, X, Upload, ImagePlus } from "lucide-react";

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
}

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient();
  const [imageUrls, setImageUrls] = useState<string[]>(product?.images || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const categories = [
    "Electronics",
    "Apparel",
    "Home Goods",
    "Toys & Games",
    "Kitchen",
    "Beauty",
    "Sports",
    "Office",
    "Other"
  ];
  
  const conditions = [
    "New",
    "Like New",
    "Good",
    "Refurbished",
    "Used",
  ];
  
  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: product || {
      sellerId: 0, // Will be set by the server
      title: "",
      description: "",
      category: "",
      price: 0,
      totalUnits: 0,
      availableUnits: 0,
      minOrderQuantity: 1,
      images: [],
      fobLocation: "",
      retailComparisonUrl: "",
      upc: "",
      condition: "New"
    },
  });
  
  const { mutate: saveProduct, isPending } = useMutation({
    mutationFn: async (data: InsertProduct) => {
      // Include the current image URLs
      const productData = { ...data, images: imageUrls };
      
      if (product) {
        // Update existing product
        const res = await apiRequest("PUT", `/api/products/${product.id}`, productData);
        return res.json();
      } else {
        // Create new product
        const res = await apiRequest("POST", "/api/products", productData);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: product ? "Product Updated" : "Product Created",
        description: product ? "Your product has been updated successfully." : "Your product has been created successfully.",
      });
      
      // Invalidate products query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "There was an error saving the product.",
        variant: "destructive",
      });
    }
  });
  
  function onSubmit(data: InsertProduct) {
    if (imageUrls.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product image.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure available units don't exceed total units
    if (data.availableUnits > data.totalUnits) {
      form.setError("availableUnits", {
        type: "manual",
        message: "Available units cannot exceed total units",
      });
      return;
    }
    
    saveProduct(data);
  }
  
  const addImageUrl = () => {
    if (!newImageUrl) return;
    
    // Basic URL validation
    try {
      new URL(newImageUrl);
      setImageUrls([...imageUrls, newImageUrl]);
      setNewImageUrl("");
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
    }
  };
  
  const removeImageUrl = (index: number) => {
    const updatedUrls = [...imageUrls];
    updatedUrls.splice(index, 1);
    setImageUrls(updatedUrls);
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const file = files[0];
    
    // Create a FileReader to convert the image to a data URL
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        // Add the data URL to our image URLs
        setImageUrls([...imageUrls, event.target.result.toString()]);
        setUploading(false);
        
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast({
          title: "Image Uploaded",
          description: "The image has been added to your product."
        });
      }
    };
    
    reader.onerror = () => {
      setUploading(false);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your image.",
        variant: "destructive"
      });
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
  };
  
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter product title" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive title for your product lot.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed description of the product lot"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide details about condition, contents, and any other relevant information.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {conditions.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Per Unit</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="totalUnits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Units</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="availableUnits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available Units</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="minOrderQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Order Quantity (MOQ)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Minimum number of units per order.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fobLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FOB Location</FormLabel>
                <FormControl>
                  <Input placeholder="City, State (e.g., Los Angeles, CA)" {...field} />
                </FormControl>
                <FormDescription>
                  Shipping origin location.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="retailComparisonUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retail Comparison URL (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/product" {...field} />
                </FormControl>
                <FormDescription>
                  Link to the product on a retail site for price comparison.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="upc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UPC (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="123456789012" {...field} />
                </FormControl>
                <FormDescription>
                  Universal Product Code if available.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Product Images Section */}
        <div>
          <FormLabel className="block mb-2">Product Images</FormLabel>
          <div className="flex flex-wrap gap-2 mb-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <img 
                  src={url} 
                  alt={`Product ${index + 1}`}
                  className="w-24 h-24 object-cover border rounded-md"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  onClick={() => removeImageUrl(index)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col gap-4">
            {/* URL Input */}
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="Image URL"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={addImageUrl}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Upload from Computer */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={triggerFileUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Upload Image from Computer
                  </>
                )}
              </Button>
            </div>
          </div>
          <FormDescription>
            Add images for your product by URL or uploading from your computer. At least one image is required.
          </FormDescription>
          {imageUrls.length === 0 && (
            <p className="text-sm font-medium text-destructive mt-1">At least one product image is required</p>
          )}
        </div>
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {product ? "Updating Product..." : "Creating Product..."}
            </>
          ) : (
            <>{product ? "Update Product" : "Create Product"}</>
          )}
        </Button>
      </form>
    </Form>
  );
}
