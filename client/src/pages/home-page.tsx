import Hero from "@/components/home/hero";
import FeaturedProducts from "@/components/home/featured-products";
import Features from "@/components/home/features";
import SellWithUs from "@/components/home/sell-with-us";
import Testimonials from "@/components/home/testimonials";
import CTA from "@/components/home/cta";
import Header from "@/components/layout/header-fixed";
import Footer from "@/components/layout/footer-fixed";

export default function HomePage() {
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
