import { useState, useEffect } from "react";
import { CartItem as CartItemType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart();
  const [inputQty, setInputQty] = useState(item.quantity);

  useEffect(() => {
    setInputQty(item.quantity);
  }, [item.quantity]);

  const handleDecrease = () => {
    if (item.quantity <= item.minOrderQuantity) {
      // If reducing would go below MOQ, remove the item
      removeFromCart(item.productId, item.variationKey);
    } else {
      updateQuantity(
        item.productId,
        item.variationKey,
        item.quantity - item.orderMultiple
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputQty(parseInt(e.target.value) || 0);
  };

  const commitInput = () => {
    updateQuantity(item.productId, item.variationKey, inputQty);
  };

  const handleIncrease = () => {
    updateQuantity(
      item.productId,
      item.variationKey,
      item.quantity + item.orderMultiple
    );
  };
  
  const itemTotal = item.price * item.quantity;

  return (
    <li className="py-6 flex">
      <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
        <img 
          src={item.image}
          alt={`${item.title} thumbnail`}
          className="w-full h-full object-center object-cover"
        />
      </div>

      <div className="ml-4 flex-1 flex flex-col">
        <div>
          <div className="flex justify-between text-base font-medium text-gray-900">
          <h3>
            {item.title}
          </h3>
          {item.selectedVariations && (
            <p className="text-xs text-gray-500">
              {Object.entries(item.selectedVariations)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </p>
          )}
            <p className="ml-4">
              {formatCurrency(itemTotal)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {item.quantity} units @ {formatCurrency(item.price)}/unit
          </p>
        </div>
        <div className="flex-1 flex items-end justify-between text-sm">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleDecrease}
              disabled={item.quantity <= item.minOrderQuantity}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              className="mx-2 h-7 w-16 text-center"
              value={inputQty}
              min={item.minOrderQuantity}
              max={item.availableUnits}
              step={item.orderMultiple}
              onChange={handleInputChange}
              onBlur={commitInput}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleIncrease}
              disabled={item.quantity + item.orderMultiple > item.availableUnits}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary-foreground hover:bg-primary font-medium flex items-center"
              onClick={() => removeFromCart(item.productId, item.variationKey)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
