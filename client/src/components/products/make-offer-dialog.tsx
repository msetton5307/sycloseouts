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
}

export default function MakeOfferDialog({ onSubmit }: MakeOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);

  function handleSubmit() {
    if (price <= 0 || quantity <= 0) return;
    onSubmit(price, quantity);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mb-2">
          Make an Offer
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
              onChange={e => setPrice(parseFloat(e.target.value) || 0)}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              min={1}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={price <= 0 || quantity <= 0}>
            Send Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

