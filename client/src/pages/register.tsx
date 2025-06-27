import { Link } from "wouter";
import Header from "@/components/layout/header-fixed";
import Footer from "@/components/layout/footer-fixed";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart } from "lucide-react";

export default function RegisterChoicePage() {
  return (
    <>
      <Header />
      <main className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight">Join SY Closeouts</h1>
            <p className="mt-3 text-lg text-gray-600">Create an account to start buying or selling wholesale inventory</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center text-center">
              <ShoppingCart className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Buy Wholesale Products</h2>
              <p className="text-gray-600 mb-6">Access thousands of liquidation deals from verified sellers.</p>
              <Link href="/buyer/signup" className="w-full">
                <Button className="w-full">Sign Up as Buyer</Button>
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center text-center">
              <Package className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Sell Your Inventory</h2>
              <p className="text-gray-600 mb-6">Reach thousands of resellers looking for liquidation inventory.</p>
              <Link href="/seller/apply" className="w-full">
                <Button variant="outline" className="w-full">Apply as Seller</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}