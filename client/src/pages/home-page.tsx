import Hero from "@/components/home/hero";
import FeaturedProducts from "@/components/home/featured-products";
import Features from "@/components/home/features";
import SellWithUs from "@/components/home/sell-with-us";
import Testimonials from "@/components/home/testimonials";
import CTA from "@/components/home/cta";
import Header from "@/components/layout/header-fixed";
import Footer from "@/components/layout/footer-fixed";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (user.role === "seller") {
      if (user.isSeller && user.isApproved) {
        return <Redirect to="/seller/dashboard" />;
      }
      return <Redirect to="/seller/apply" />;
    }
    if (user.role === "buyer") {
      return <Redirect to="/buyer/home" />;
    }
    return <Redirect to="/products" />;
  }

  return (
    <>
      <Header />
      <main className="flex-grow">
        <Hero />
        <FeaturedProducts />
        <Features />
        <SellWithUs />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
