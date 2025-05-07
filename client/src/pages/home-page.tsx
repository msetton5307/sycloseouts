import Hero from "@/components/home/hero";
import Features from "@/components/home/features";
import FeaturedProducts from "@/components/home/featured-products";
import Categories from "@/components/home/categories";
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
        <Features />
        <FeaturedProducts />
        <Categories />
        <SellWithUs />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
