import { useState, useRef, useEffect } from "react";
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
import { Loader2, Plus, X, ImagePlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";

type VariationField = { name: string; options: string };

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
}

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [imageUrls, setImageUrls] = useState<string[]>(product?.images || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [shippingType, setShippingType] = useState<string>(product?.shippingType || "truckload");
  const [shippingResponsibility, setShippingResponsibility] = useState<string>(product?.shippingResponsibility || "seller_free");
  const [variationFields, setVariationFields] = useState<VariationField[]>(
    product?.variations
      ? Object.entries(product.variations).map(([name, opts]) => ({
          name,
          options: Array.isArray(opts) ? (opts as string[]).join(", ") : "",
        }))
      : []
  );
  const [variationPrices, setVariationPrices] = useState<Record<string, number | undefined>>(product?.variationPrices || {});
  const [variationStocks, setVariationStocks] = useState<Record<string, number | undefined>>(product?.variationStocks || {});
  const [comboKeys, setComboKeys] = useState<string[]>([]);
  // New state to control if buyers can purchase less than the entire lot
  const [sellIndividuals, setSellIndividuals] = useState<boolean>(
    product ? product.minOrderQuantity < product.totalUnits : false
  );

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: product
      ? {
          ...product,
          price:
            typeof product.price === "number" && !isNaN(product.price)
              ? product.price
              : 0,
          retailMsrp:
            typeof (product as any).retailMsrp === "number" &&
            !isNaN((product as any).retailMsrp)
              ? (product as any).retailMsrp
              : undefined,
          totalUnits:
            typeof product.totalUnits === "number" &&
            !isNaN(product.totalUnits)
              ? product.totalUnits
              : 0,
          availableUnits:
            typeof product.availableUnits === "number" &&
            !isNaN(product.availableUnits)
              ? product.availableUnits
              : 0,
          minOrderQuantity:
            typeof product.minOrderQuantity === "number" &&
            !isNaN(product.minOrderQuantity)
              ? product.minOrderQuantity
              : 1,
          orderMultiple:
            typeof (product as any).orderMultiple === "number" &&
            !isNaN((product as any).orderMultiple)
              ? (product as any).orderMultiple
              : 1,
          fobLocation: product.fobLocation || "",
          retailComparisonUrl: product.retailComparisonUrl || "",
          upc: product.upc || "",
          variations: (product as any).variations || {},
          variationPrices: (product as any).variationPrices || {},
          variationStocks: (product as any).variationStocks || {},
          shippingType: product.shippingType || "truckload",
          shippingResponsibility: product.shippingResponsibility ||
            "seller_free",
          shippingFee: product.shippingFee ?? undefined,
          isBanner: product.isBanner ?? false,
        }
      : {
          sellerId: 0, // Will be set by the server
          title: "",
          description: "",
          category: "",
          price: undefined as unknown as number,
          retailMsrp: undefined as unknown as number,
          totalUnits: undefined as unknown as number,
          availableUnits: undefined as unknown as number,
          minOrderQuantity: undefined as unknown as number,
          orderMultiple: undefined as unknown as number,
          images: [],
          fobLocation: "",
          retailComparisonUrl: "",
          upc: "",
          variations: {},
          variationPrices: {},
          variationStocks: {},
          condition: "New",
          shippingType: "truckload",
          shippingResponsibility: "seller_free",
          shippingFee: undefined as unknown as number,
          isBanner: false,
        },
  });

  useEffect(() => {
    if (!sellIndividuals) {
      form.setValue(
        "minOrderQuantity",
        form.getValues("totalUnits") ?? 0,
        { shouldValidate: true }
      );
    }
  }, []); // run once on mount

  // Keep minOrderQuantity in sync when selling only as a take-all lot
  useEffect(() => {
    if (!sellIndividuals) {
      const subscription = form.watch((values, { name }) => {
        if (name === "totalUnits") {
          form.setValue("minOrderQuantity", values.totalUnits ?? 0, {
            shouldValidate: true,
          });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [sellIndividuals, form]);

  useEffect(() => {
    const parsed = variationFields
      .map((v) => ({
        name: v.name.trim(),
        options: v.options.split(',').map((o) => o.trim()).filter(Boolean),
      }))
      .filter((v) => v.name && v.options.length > 0);

    let combos: string[] = [];
    if (parsed.length > 0) {
      const build = (idx: number, current: Record<string, string>) => {
        if (idx === parsed.length) {
          combos.push(JSON.stringify(current));
          return;
        }
        for (const opt of parsed[idx].options) {
          build(idx + 1, { ...current, [parsed[idx].name]: opt });
        }
      };
      build(0, {});
    }

    setComboKeys(combos);
    setVariationPrices((prev) => {
      const updated: Record<string, number | undefined> = { ...prev };
      combos.forEach((k) => {
        if (!(k in updated)) {
          updated[k] = undefined;
        }
      });
      Object.keys(updated).forEach((k) => {
        if (!combos.includes(k)) delete updated[k];
      });
      return updated;
    });
    setVariationStocks((prev) => {
      const updated: Record<string, number | undefined> = { ...prev };
      combos.forEach((k) => {
        if (!(k in updated)) {
          updated[k] = undefined;
        }
      });
      Object.keys(updated).forEach((k) => {
        if (!combos.includes(k)) delete updated[k];
      });
      return updated;
    });
  }, [variationFields]);
  
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
    console.log("Submitting form with data:", data);
    console.log("Image URLs:", imageUrls);
    
    if (imageUrls.length === 0) {
      toast({
        title: "Warning",
        description: "Submitting product without any images.",
      });
    }
    
    // Ensure available units don't exceed total units
    if (data.availableUnits > data.totalUnits) {
      form.setError("availableUnits", {
        type: "manual",
        message: "Available units cannot exceed total units",
      });
      return;
    }
    
    // Make sure all numeric fields are actually numbers, not strings or NaN
    const formattedData = {
      ...data,
      price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
      retailMsrp: typeof (data as any).retailMsrp === 'string' ? parseFloat((data as any).retailMsrp) : (data as any).retailMsrp,
      totalUnits: typeof data.totalUnits === 'string' ? parseInt(data.totalUnits) : data.totalUnits,
      availableUnits: typeof data.availableUnits === 'string' ? parseInt(data.availableUnits) : data.availableUnits,
      minOrderQuantity: typeof data.minOrderQuantity === 'string' ? parseInt(data.minOrderQuantity) : data.minOrderQuantity,
      orderMultiple: typeof (data as any).orderMultiple === 'string' ? parseInt((data as any).orderMultiple) : (data as any).orderMultiple,
      variations: Object.fromEntries(
        variationFields
          .map((v) => ({
            name: v.name.trim(),
            options: v.options.split(',').map((o) => o.trim()).filter(Boolean),
          }))
          .filter((v) => v.name && v.options.length > 0)
          .map((v) => [v.name, v.options])
      ),
      variationPrices: Object.fromEntries(
        Object.entries(variationPrices).map(([k, v]) => [k, v])
      ),
      variationStocks: Object.fromEntries(
        Object.entries(variationStocks).map(([k, v]) => [k, v])
      ),
      shippingType,
      shippingResponsibility,
      shippingFee: data.shippingFee,
    } as InsertProduct;

    if (!sellIndividuals) {
      formattedData.minOrderQuantity = formattedData.totalUnits;
    }
    
    // Check for NaN values and replace with defaults
    if (isNaN(formattedData.price)) formattedData.price = 0;
    if (isNaN((formattedData as any).retailMsrp)) (formattedData as any).retailMsrp = undefined;
    if (isNaN(formattedData.totalUnits)) formattedData.totalUnits = 0;
    if (isNaN(formattedData.availableUnits)) formattedData.availableUnits = 0;
    if (isNaN(formattedData.minOrderQuantity)) formattedData.minOrderQuantity = 1;
    if (isNaN((formattedData as any).orderMultiple)) (formattedData as any).orderMultiple = 1;
    if (formattedData.shippingFee !== undefined && isNaN(formattedData.shippingFee)) {
      formattedData.shippingFee = undefined as any;
    }
    for (const key in formattedData.variationPrices) {
      const val = formattedData.variationPrices[key];
      if (val === undefined || isNaN(val)) {
        delete formattedData.variationPrices[key];
      }
    }
    for (const key in formattedData.variationStocks) {
      const val = formattedData.variationStocks[key];
      if (val === undefined || isNaN(val)) {
        delete formattedData.variationStocks[key];
      }
    }
    
    console.log("Formatted data for submission:", formattedData);
    try {
      saveProduct(formattedData);
      console.log("saveProduct function called");
    } catch (error) {
      console.error("Error calling saveProduct:", error);
      toast({
        title: "Error",
        description: "There was an unexpected error submitting the form.",
        variant: "destructive",
      });
    }
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
          <div>
            <FormLabel>Shipping Type</FormLabel>
            <Select value={shippingType} onValueChange={setShippingType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truckload">Truckload</SelectItem>
                <SelectItem value="ltl">LTL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FormLabel>Shipping Responsibility</FormLabel>
            <Select value={shippingResponsibility} onValueChange={setShippingResponsibility}>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seller_free">Seller ships for free</SelectItem>
                <SelectItem value="seller_fee">Seller ships for a fee</SelectItem>
                <SelectItem value="buyer">Buyer arranges shipping</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {shippingResponsibility === 'seller_fee' && (
          <FormField
            control={form.control}
            name="shippingFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shipping Fee</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    value={field.value === undefined ? '' : field.value}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
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
        {user?.role === "admin" && (
          <FormField
            control={form.control}
            name="isBanner"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 pt-2">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="mb-0">Show in Home Banner</FormLabel>
              </FormItem>
            )}
          />
        )}
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
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseFloat(value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="retailMsrp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retail MSRP</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseFloat(value));
                    }}
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
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseInt(value));
                    }}
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
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseInt(value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormLabel>Variations</FormLabel>
          {variationFields.map((v, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
              <Input
                placeholder="Variation Name"
                value={v.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setVariationFields((fields) => fields.map((f, i) => i === idx ? { ...f, name: value } : f));
                }}
              />
              <Input
                placeholder="Options (comma separated)"
                value={v.options}
                onChange={(e) => {
                  const value = e.target.value;
                  setVariationFields((fields) => fields.map((f, i) => i === idx ? { ...f, options: value } : f));
                }}
              />
              <Button type="button" variant="ghost" onClick={() => setVariationFields(fields => fields.filter((_, i) => i !== idx))}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setVariationFields([...variationFields, { name: "", options: "" }])}>
            <Plus className="mr-2 h-4 w-4" /> Add Variation
          </Button>
        </div>

        {comboKeys.length > 0 && (
          <div>
            <FormLabel className="block mb-2">Variation Prices</FormLabel>
            <div className="space-y-2">
              {comboKeys.map((key, idx) => {
                const combo = JSON.parse(key) as Record<string, string>;
                const label = Object.values(combo).join(' / ');
                const priceOptions = Array.from(
                  new Set(
                    Object.values(variationPrices).filter(
                      (p): p is number => typeof p === 'number' && !isNaN(p)
                    )
                  )
                );
                return (
                  <div key={key} className="flex items-center space-x-2">
                    <span className="flex-1 text-sm">{label}</span>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      list={`price-options-${idx}`}
                      value={variationPrices[key] === undefined ? '' : variationPrices[key]}
                      onChange={e => {
                        const val = e.target.value;
                        setVariationPrices(prev => ({
                          ...prev,
                          [key]: val === '' ? undefined : parseFloat(val)
                        }));
                      }}
                    />
                    {priceOptions.length > 0 && (
                      <datalist id={`price-options-${idx}`}>
                        {priceOptions.map(p => (
                          <option key={p} value={p.toFixed(2)} />
                        ))}
                      </datalist>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {comboKeys.length > 0 && (
          <div>
            <FormLabel className="block mb-2">Variation Stock</FormLabel>
            <div className="space-y-2">
              {comboKeys.map((key, idx) => {
                const combo = JSON.parse(key) as Record<string, string>;
                const label = Object.values(combo).join(' / ');
                const stockOptions = Array.from(
                  new Set(
                    Object.values(variationStocks).filter(
                      (s): s is number => typeof s === 'number' && !isNaN(s)
                    )
                  )
                );
                return (
                  <div key={key} className="flex items-center space-x-2">
                    <span className="flex-1 text-sm">{label}</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      list={`stock-options-${idx}`}
                      value={variationStocks[key] === undefined ? '' : variationStocks[key]}
                      onChange={e => {
                        const val = e.target.value;
                        setVariationStocks(prev => ({
                          ...prev,
                          [key]: val === '' ? undefined : parseInt(val, 10)
                        }));
                      }}
                    />
                    {stockOptions.length > 0 && (
                      <datalist id={`stock-options-${idx}`}>
                        {stockOptions.map(s => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="take-all-lot"
              checked={!sellIndividuals}
              onCheckedChange={(v) => setSellIndividuals(!v)}
            />
            <label htmlFor="take-all-lot" className="text-sm font-medium leading-none">
              Take All Lot
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sell-individuals"
              checked={sellIndividuals}
              onCheckedChange={(v) => setSellIndividuals(!!v)}
            />
            <label htmlFor="sell-individuals" className="text-sm font-medium leading-none">
              Allow individual orders
            </label>
          </div>
          {!sellIndividuals && (
            <p className="text-sm text-gray-500">Buyers must purchase the entire lot.</p>
          )}
        </div>

        {sellIndividuals && (
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
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseInt(value));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Minimum number of units per order.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="orderMultiple"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order By Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    {...field}
                    value={field.value === undefined ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseInt(value));
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Buyers must order in multiples of this amount.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fobLocation"
            render={({ field }) => {
              // Destructure the field to handle null values correctly
              const { value, ...restField } = field;
              return (
                <FormItem>
                  <FormLabel>FOB Location</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="City, State (e.g., Los Angeles, CA)" 
                      {...restField} 
                      value={value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Shipping origin location.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="retailComparisonUrl"
            render={({ field }) => {
              // Destructure the field to handle null values correctly
              const { value, ...restField } = field;
              return (
                <FormItem>
                  <FormLabel>Retail Comparison URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/product" 
                      {...restField} 
                      value={value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Link to the product on a retail site for price comparison.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          
          <FormField
            control={form.control}
            name="upc"
            render={({ field }) => {
              // Destructure the field to handle null values correctly
              const { value, ...restField } = field;
              return (
                <FormItem>
                  <FormLabel>UPC (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123456789012" 
                      {...restField} 
                      value={value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Universal Product Code if available.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
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
            Add images for your product by URL or upload from your computer. Images are optional.
          </FormDescription>
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