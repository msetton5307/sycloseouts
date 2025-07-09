import { useEffect, useRef, useState } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

export default function AdminSettingsPage() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [rate, setRate] = useState(0.035);
  const [logo, setLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setRate(data.commissionRate);
      setLogo(data.logo ?? null);
    }
  }, [data]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setLogo(ev.target.result.toString());
      }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const trigger = () => fileRef.current?.click();

  const save = () => {
    update.mutate({ commissionRate: rate, logo });
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-6">Site Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Commission Rate (%)</label>
              <Input type="number" step="0.01" value={rate} onChange={e => setRate(parseFloat(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo</label>
              {logo && <img src={logo} alt="Logo" className="h-16 mb-2" />}
              <Input value={logo || ""} onChange={e => setLogo(e.target.value)} placeholder="Image URL or data" />
              <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleFile} />
              <Button type="button" variant="outline" className="mt-2" onClick={trigger} disabled={uploading}>
                {uploading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Uploading...</>) : (<><ImagePlus className="mr-2 h-4 w-4"/>Upload Image</>)}
              </Button>
            </div>
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</>) : "Save"}
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
