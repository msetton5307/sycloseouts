import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-4">About SY Closeouts</h1>
        <p className="text-lg text-gray-600 mb-4">
          SY Closeouts is a platform connecting buyers and sellers of wholesale inventory at competitive prices.
        </p>
        <p className="text-lg text-gray-600">
          Our mission is to make sourcing liquidation and closeout merchandise simple and transparent for businesses of all sizes.
        </p>
      </main>
      <Footer />
    </>
  );
}
