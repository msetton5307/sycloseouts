import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <>
      {/* Mobile Layout */}
      <section className="sm:hidden">
        <img
          className="w-full h-64 object-cover"
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1350&h=900"
          alt="Wholesale inventory warehouse"
        />
        <div className="bg-gradient-to-b from-black/60 via-black/30 to-black/20 px-4 py-10 space-y-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            <span className="block">Wholesale Liquidation</span>{" "}
            <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-base text-gray-100">
            Buy and sell overstock inventory, closeouts and shelf-pulls directly from verified sellers. Access wholesale pricing for resale and grow your business.
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <Link href="/products">
              <Button size="lg">Shop Products</Button>
            </Link>
            <Link href="/seller/apply">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white/80 text-primary hover:bg-white"
              >
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Desktop Layout */}
      <section className="hidden sm:flex relative items-center justify-center h-[70vh] bg-gray-100 overflow-hidden">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1350&h=900"
          alt="Wholesale inventory warehouse"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/20" />
        <div className="relative z-10 max-w-2xl mx-auto text-center px-4 space-y-6">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow">
            <span className="block">Wholesale Liquidation</span>{" "}
            <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-xl text-gray-100">
            Buy and sell overstock inventory, closeouts and shelf-pulls directly from verified sellers. Access wholesale pricing for resale and grow your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/products">
              <Button size="lg">Shop Products</Button>
            </Link>
            <Link href="/seller/apply">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white/80 text-primary hover:bg-white"
              >
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
