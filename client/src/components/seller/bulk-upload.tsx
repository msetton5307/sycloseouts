import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { InsertProduct } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download } from "lucide-react";

function parseCsv(text: string): Omit<InsertProduct, "sellerId">[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    row.images = row.images ? row.images.split("|").filter((s: string) => s) : [];
    if (row.price !== undefined) row.price = parseFloat(row.price);
    if (row.totalUnits !== undefined) row.totalUnits = parseInt(row.totalUnits, 10);
    if (row.availableUnits !== undefined) row.availableUnits = parseInt(row.availableUnits, 10);
    if (row.minOrderQuantity !== undefined) row.minOrderQuantity = parseInt(row.minOrderQuantity, 10);
    if (row.orderMultiple !== undefined) row.orderMultiple = parseInt(row.orderMultiple, 10);
    if (row.isBanner !== undefined) row.isBanner = row.isBanner === "true";
    return row as Omit<InsertProduct, "sellerId">;
  });
}

export default function BulkUpload() {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const templateUrl = "/product-template.csv";

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (products: Omit<InsertProduct, "sellerId">[]) => {
      for (const p of products) {
        await apiRequest("POST", "/api/products", p);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const text = await file.text();
    let products: Omit<InsertProduct, "sellerId">[] = [];
    try {
      products = parseCsv(text);
    } catch (e) {
      toast({
        title: "Invalid CSV",
        description: "Could not parse the selected file.",
        variant: "destructive",
      });
      return;
    }
    if (products.length === 0) {
      toast({ title: "No products found" });
      return;
    }
    await mutateAsync(products);
    toast({
      title: "Upload complete",
      description: `Imported ${products.length} products`,
    });
    setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <DialogDescription>
            Download the
            {" "}
            <a href={templateUrl} download className="text-primary underline">
              CSV template
            </a>{" "}
            and fill it with your products, then re-upload the file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input type="file" accept=".csv" ref={fileRef} />
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <a href={templateUrl} download>
              <Button variant="secondary" type="button">
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </a>
            <Button onClick={handleUpload} disabled={isPending}>
              {isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
