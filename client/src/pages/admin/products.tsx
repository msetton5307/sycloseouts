import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ProductForm from "@/components/seller/product-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ArrowLeft,
  Edit,
  Trash2,
  XCircle,
  Loader2,
  ShoppingBag,
  Star
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function AdminProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { mutate: toggleBanner } = useMutation({
    mutationFn: async (data: { id: number; isBanner: boolean }) => {
      const res = await apiRequest("PUT", `/api/products/${data.id}`, { isBanner: data.isBanner });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/banner-products"] });
    }
  });
  
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
  });
  
  // Filter products for the current seller
  const sellerProducts = user?.role === "admin" ? products : products.filter(product => product.sellerId === user?.id);
  
  // Filter by search term if any
  const filteredProducts = sellerProducts.filter(product => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      product.title.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower)
    );
  });
  
  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("DELETE", `/api/products/${productId}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Product Deleted",
        description: "The product has been deleted successfully.",
      });
      
      setProductToDelete(null);
      setIsConfirmDeleteOpen(false);
      
      // Invalidate products query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete the product.",
        variant: "destructive",
      });
    }
  });
  
  
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
  };
  
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsConfirmDeleteOpen(true);
  };
  
  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
    }
  };

  const handleToggleBanner = (product: Product) => {
    toggleBanner({ id: product.id, isBanner: !product.isBanner });
  };
  
  const handleFormSuccess = () => {
    setSelectedProduct(null);
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="text-primary hover:underline flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            All Products
          </h1>
        </div>
        

        
        {/* Edit Product Dialog */}
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto" aria-describedby="edit-product-description">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription id="edit-product-description">
                Update your product listing details.
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <ProductForm product={selectedProduct} onSuccess={handleFormSuccess} />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent className="sm:max-w-[500px]" aria-describedby="delete-description">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription id="delete-description">
                Are you sure you want to delete this product? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {productToDelete && (
                <div className="flex items-center">
                  <img 
                    src={productToDelete.images[0]} 
                    alt={productToDelete.title}
                    className="h-12 w-12 rounded object-cover mr-3"
                  />
                  <div>
                    <p className="font-medium">{productToDelete.title}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(productToDelete.price)}/unit</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Product Inventory</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10 w-full md:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" asChild>
                  <a href="/api/products.csv" download>Export CSV</a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>MOQ</TableHead>
                      <TableHead>Order By</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Total Units</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <img 
                              src={product.images[0]} 
                              alt={product.title}
                              className="h-10 w-10 rounded object-cover mr-3"
                            />
                            <div className="truncate max-w-xs">{product.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>{product.minOrderQuantity}</TableCell>
                        <TableCell>{product.orderMultiple}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {product.availableUnits > 0 ? (
                              <span className="text-green-600">{product.availableUnits}</span>
                            ) : (
                              <span className="text-red-600">Out of Stock</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.totalUnits}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProduct(product)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              {user?.role === "admin" && (
                                <Button
                                  size="sm"
                                  variant={product.isBanner ? "default" : "outline"}
                                  onClick={() => handleToggleBanner(product)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Star className="h-4 w-4" fill={product.isBanner ? "currentColor" : "none"} />
                                  <span className="sr-only">Banner</span>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProduct(product)}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>

                <div className="space-y-4 md:hidden">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-sm flex justify-between">
                        <span>{formatCurrency(product.price)}</span>
                        <span>{product.availableUnits} / {product.totalUnits}</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        {user?.role === "admin" && (
                          <Button
                            size="sm"
                            variant={product.isBanner ? "default" : "outline"}
                            onClick={() => handleToggleBanner(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Star className="h-4 w-4" fill={product.isBanner ? "currentColor" : "none"} />
                            <span className="sr-only">Banner</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteProduct(product)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {searchTerm ? (
                  <div>
                    <XCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No matching products</h3>
                    <p className="text-gray-500 mb-4">Try a different search term.</p>
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <div>
                    <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
                    <p className="text-gray-500">There are no products in the system.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
