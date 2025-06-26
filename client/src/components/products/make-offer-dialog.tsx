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

interface MakeOfferDialogProps {
  onSubmit: (price: number, quantity: number) => void;
  maxQuantity?: number;
  label?: string;
  variant?: "outline" | "default";
  className?: string;
}

export default function MakeOfferDialog({ onSubmit, maxQuantity, label = "Make an Offer", variant = "outline", className }: MakeOfferDialogProps) {
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
              onChange={e => setQuantity(e.target.value)}
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

