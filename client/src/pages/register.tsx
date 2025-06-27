import { Link } from "wouter";
import Header from "@/components/layout/header-fixed";
import Footer from "@/components/layout/footer-fixed";
import { Button } from "@/components/ui/button";

export default function RegisterChoicePage() {
  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 gap-6">
        <h1 className="text-3xl font-extrabold">Create Your Account</h1>
        <p className="text-gray-600">Choose how you want to use SY Closeouts</p>
        <div className="flex gap-4">
          <Link href="/buyer/signup" className="w-full">
            <Button className="w-full">I'm a Buyer</Button>
          </Link>
          <Link href="/seller/apply" className="w-full">
            <Button variant="outline" className="w-full">I'm a Seller</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
