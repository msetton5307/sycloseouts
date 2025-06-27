import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface MakeOfferDialogProps {
  onSubmit: (price: number, quantity: number) => void;
  maxQuantity?: number;
  label?: string;
  variant?: "outline" | "default";
  className?: string;
  currentPrice?: number;
  currentStock?: number;
  selectedVariations?: Record<string, string>;
}

export default function MakeOfferDialog({
  onSubmit,
  maxQuantity,
  label = "Make an Offer",
  variant = "outline",
  className,
  currentPrice,
  currentStock,
  selectedVariations,
}: MakeOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const priceNum = parseFloat(price);
  const quantityNum = parseInt(quantity);

  function handleSubmit() {
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(quantityNum) || quantityNum <= 0) return;
    onSubmit(priceNum, quantityNum);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className ?? "w-full mb-2"}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {(currentPrice !== undefined || currentStock !== undefined) && (
            <div className="text-sm text-gray-600">
              {currentPrice !== undefined && (
                <div>Current Price: {formatCurrency(currentPrice)}</div>
              )}
              {currentStock !== undefined && (
                <div>In Stock: {currentStock}</div>
              )}
              {selectedVariations && Object.keys(selectedVariations).length > 0 && (
                <div>
                  {Object.entries(selectedVariations)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Offer Price</label>
              <Input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
              <Input
              type="number"
              value={quantity}
              onChange={(e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) {
                  setQuantity(e.target.value);
                  return;
                }
                if (maxQuantity && val > maxQuantity) {
                  val = maxQuantity;
                }
                setQuantity(val.toString());
              }}
              min={1}
              {...(maxQuantity ? { max: maxQuantity } : {})}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isNaN(priceNum) || priceNum <= 0 || isNaN(quantityNum) || quantityNum <= 0}>
            Send Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

