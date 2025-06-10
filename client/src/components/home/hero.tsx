import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-yellow-50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">


          <div className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="bg-white/80 md:bg-transparent rounded-lg p-4 sm:p-8 text-center lg:text-left shadow-md md:shadow-none">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block xl:inline">Wholesale Liquidation</span>{" "}
                <span className="block text-primary xl:inline">Marketplace</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Buy and sell overstock inventory, closeouts, and shelf-pulls directly from verified sellers. Access wholesale pricing for resale and expand your business.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link href="/products">
                    <Button className="w-full flex items-center justify-center px-8 py-3 md:py-4 md:text-lg md:px-10">
                      Shop Products
                    </Button>
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Link href="/seller/apply">
                    <Button variant="outline" className="w-full flex items-center justify-center px-8 py-3 md:py-4 md:text-lg md:px-10 border-primary text-primary hover:bg-blue-50">
                      Become a Seller
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <img
          className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1350&h=900"
          alt="Wholesale inventory warehouse"
        />
      </div>
    </section>
  );
}