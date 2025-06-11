import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SERVICE_FEE_RATE } from "@/lib/utils";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "sy-closeouts-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsed: CartItem[] = JSON.parse(savedCart);
        setItems(
          parsed.map(item => ({
            ...item,
            orderMultiple: item.orderMultiple ?? 1,
            price:
              user?.role === "buyer"
                ? parseFloat((item.price * (1 + SERVICE_FEE_RATE)).toFixed(2))
                : item.price,
          }))
        );
      } catch (error) {
        console.error("Failed to parse cart from localStorage", error);
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number) => {
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

    // Check if we have enough inventory
    if (quantity > product.availableUnits) {
      toast({
        title: "Not enough inventory",
        description: `Only ${product.availableUnits} units are available.`,
        variant: "destructive",
      });
      return;
    }

    const priceWithFee =
      user?.role === "buyer"
        ? parseFloat((product.price * (1 + SERVICE_FEE_RATE)).toFixed(2))
        : product.price;

    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedItems = [...prevItems];
        const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
        
        // Check if the new quantity exceeds available units
        if (newQuantity > product.availableUnits) {
          toast({
            title: "Not enough inventory",
            description: `Only ${product.availableUnits} units are available.`,
            variant: "destructive",
          });
          return prevItems;
        }
        
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity
        };
        
        return updatedItems;
      } else {
        // Add new item
        return [...prevItems, {
          productId: product.id,
          title: product.title,
          price: priceWithFee,
          quantity,
          image: product.images[0],
          minOrderQuantity: product.minOrderQuantity,
          orderMultiple: product.orderMultiple,
          availableUnits: product.availableUnits
        }];
      }
    });

    toast({
      title: "Added to cart",
      description: `${quantity} ${quantity === 1 ? 'unit' : 'units'} of ${product.title} added to cart.`
    });
    
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setItems(prevItems => prevItems.filter(item => item.productId !== productId));
    
    toast({
      title: "Removed from cart",
      description: "Item removed from cart."
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.productId === productId) {
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
        setIsCartOpen
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
