import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { CartItem, Product, Offer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { addServiceFee, removeServiceFee } from "@/lib/utils";

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Product,
    quantity: number,
    variations?: Record<string, string>,
    priceOverride?: number,
    offerQuantity?: number,
    offerId?: number
  ) => void;
  removeFromCart: (productId: number, variationKey?: string, offerId?: number) => void;
  updateQuantity: (
    productId: number,
    variationKey: string | undefined,
    quantity: number,
    offerId?: number
  ) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  acceptedOffers: (Offer & { productTitle: string; productImages: string[] })[];
  addOfferToCart: (offer: Offer) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "sy-closeouts-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [acceptedOffers, setAcceptedOffers] = useState<(Offer & { productTitle: string; productImages: string[] })[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load cart from localStorage on initial render or when user changes
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) return;
    try {
      const parsed: CartItem[] = JSON.parse(savedCart);
      setItems(
        parsed.map((item) => {
          let price = item.price;
          let includesFee = item.priceIncludesFee ?? false;

          if (!includesFee && (!user || user.role === "buyer")) {
            price = addServiceFee(price);
            includesFee = true;
          } else if (includesFee && user && user.role !== "buyer") {
            price = removeServiceFee(price);
            includesFee = false;
          }

          return {
            ...item,
            price,
            priceIncludesFee: includesFee,
            orderMultiple: item.orderMultiple ?? 1,
          };
        })
      );
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
    }
  }, [user]);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    async function fetchAccepted() {
      if (!user || user.role !== "buyer") {
        setAcceptedOffers([]);
        return;
      }
      try {
        const res = await fetch("/api/offers?status=accepted", {
          credentials: "include",
        });
        if (!res.ok) return;
        const offers: (Offer & { productTitle: string; productImages: string[] })[] = await res.json();
        setAcceptedOffers(offers);
      } catch {
        /* ignore */
      }
    }
    fetchAccepted();
  }, [user]);

  const addToCart = (
    product: Product,
    quantity: number,
    variations: Record<string, string> = {},
    priceOverride?: number,
    offerQuantity?: number,
    offerId?: number
  ) => {
    if (quantity <= 0) return;

    // Check if product meets MOQ
    if (quantity < product.minOrderQuantity) {
      toast({
        title: "Minimum order not met",
        description: `This product requires a minimum order of ${product.minOrderQuantity} units.`,
        variant: "destructive",
      });
      return;
    }

    // Check if quantity is a valid multiple
    if (quantity % product.orderMultiple !== 0) {
      toast({
        title: "Invalid quantity",
        description: `This product must be ordered in multiples of ${product.orderMultiple} units.`,
        variant: "destructive",
      });
      return;
    }

    const varKey = JSON.stringify(variations);
    const availableUnits =
      product.variationStocks && product.variationStocks[varKey] !== undefined
        ? product.variationStocks[varKey]
        : product.availableUnits;

    if (offerQuantity !== undefined && quantity > offerQuantity) {
      toast({
        title: "Offer limit",
        description: `Only ${offerQuantity} units are available at the agreed price`,
        variant: "destructive",
      });
      quantity = offerQuantity;
    }

    // Check if we have enough inventory
    if (quantity > availableUnits) {
      toast({
        title: "Not enough inventory",
        description: `Only ${availableUnits} units are available.`,
        variant: "destructive",
      });
      return;
    }

    const basePrice =
      priceOverride !== undefined
        ? priceOverride
        : product.variationPrices && product.variationPrices[varKey] !== undefined
        ? product.variationPrices[varKey]
        : product.price;
    const priceIncludesFee = !user || user.role === "buyer";
    const priceWithFee = priceIncludesFee ? addServiceFee(basePrice) : basePrice;

      setItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(
          item =>
            item.productId === product.id &&
            item.variationKey === varKey &&
            item.offerId === offerId
        );
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        const newQuantity = updatedItems[existingItemIndex].quantity + quantity;

        // Check if the new quantity exceeds available units
        if (newQuantity > availableUnits) {
          toast({
            title: "Not enough inventory",
            description: `Only ${availableUnits} units are available.`,
            variant: "destructive",
          });
          return prevItems;
        }
        
        let finalQuantity = newQuantity;
        const limit = updatedItems[existingItemIndex].offerQuantity;
        if (limit !== undefined && newQuantity > limit) {
          toast({
            title: "Offer limit",
            description: `Only ${limit} units are available at the agreed price`,
            variant: "destructive",
          });
          finalQuantity = limit;
        }

        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: finalQuantity
        };
        
        return updatedItems;
      } else {
        // Add new item
        return [
          ...prevItems,
          {
            productId: product.id,
            title: product.title,
            price: priceWithFee,
            priceIncludesFee,
            quantity,
            image: product.images[0],
            minOrderQuantity: product.minOrderQuantity,
            orderMultiple: product.orderMultiple,
            availableUnits,
            selectedVariations: variations,
            variationKey: varKey,
            offerId,
            offerQuantity
          }
        ];
      }
    });

    toast({
      title: "Added to cart",
      description: `${quantity} ${quantity === 1 ? 'unit' : 'units'} of ${product.title} added to cart.`,
      // Keep the toast extremely short so it doesn't block actions
      duration: 300
    });
    
    setIsCartOpen(true);
  };

  const addOfferToCart = async (offer: Offer) => {
    try {
      const res = await fetch(`/api/products/${offer.productId}`);
      if (!res.ok) return;
      const product: Product = await res.json();
      addToCart(
        product,
        offer.quantity,
        offer.selectedVariations ?? {},
        offer.price,
        offer.quantity,
        offer.id
      );
    } catch {
      /* ignore */
    }
  };

  const removeFromCart = (productId: number, variationKey = "", offerId?: number) => {
    setItems(prevItems =>
      prevItems.filter(
        item =>
          !(
            item.productId === productId &&
            (item.variationKey ?? "") === variationKey &&
            (offerId === undefined || item.offerId === offerId)
          )
      )
    );
    
    toast({
      title: "Removed from cart",
      description: "Item removed from cart."
    });
  };

  const updateQuantity = (
    productId: number,
    variationKey: string | undefined,
    quantity: number,
    offerId?: number
  ) => {
    const existing = items.find(
      (it) =>
        it.productId === productId &&
        (it.variationKey ?? "") === (variationKey ?? "") &&
        (offerId === undefined || it.offerId === offerId)
    );

    if (existing && existing.offerId !== undefined) {
      toast({
        title: "Offer quantity fixed",
        description:
          "You must purchase the full accepted offer quantity or remove it from your cart.",
        variant: "destructive",
      });
      return;
    }
    if (quantity <= 0) {
      removeFromCart(productId, variationKey, offerId);
      return;
    }

    setItems(prevItems => {
      return prevItems.map(item => {
        if (
          item.productId === productId &&
          (item.variationKey ?? "") === (variationKey ?? "") &&
          (offerId === undefined || item.offerId === offerId)
        ) {
          // Check if quantity meets MOQ
          if (quantity < item.minOrderQuantity) {
            toast({
              title: "Minimum order not met",
              description: `This product requires a minimum order of ${item.minOrderQuantity} units.`,
              variant: "destructive",
            });
            return item;
          }

          // Check order multiple
          if (quantity % item.orderMultiple !== 0) {
            toast({
              title: "Invalid quantity",
              description: `This product must be ordered in multiples of ${item.orderMultiple} units.`,
              variant: "destructive",
            });
            return item;
          }

          // Check if we have enough inventory
          if (quantity > item.availableUnits) {
            toast({
              title: "Not enough inventory",
              description: `Only ${item.availableUnits} units are available.`,
              variant: "destructive",
            });
            return item;
          }

          if (item.offerQuantity !== undefined && quantity > item.offerQuantity) {
            toast({
              title: "Offer limit",
              description: `Only ${item.offerQuantity} units are available at the agreed price`,
              variant: "destructive",
            });
            return item;
          }

          return { ...item, quantity };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  // Calculate cart total
  const cartTotal = items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  // Calculate item count
  const itemCount = items.reduce((count, item) => {
    return count + item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        isCartOpen,
        setIsCartOpen,
        acceptedOffers,
        addOfferToCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}