import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

const instructions = import.meta.env.VITE_WIRE_INSTRUCTIONS ||
  "Please wire the invoice total to the bank details provided by SY Closeouts. Include your order number in the memo.";

export default function WireInstructionsPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold">Wire Transfer Instructions</h1>
        <p className="whitespace-pre-wrap text-gray-700">{instructions}</p>
      </main>
      <Footer />
    </>
  );
}
