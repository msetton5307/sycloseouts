import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function BuyerAgreementPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-4">Buyer Agreement</h1>
        <div className="prose prose-gray">
          <p>
            This Buyer Agreement describes the terms that govern purchases made through SY Closeouts.
          </p>
          <h2>Purchasing</h2>
          <p>Buyers are responsible for reviewing product listings and shipping costs before placing an order.</p>
          <h2>Payment</h2>
          <p>All payments must be made through our checkout system. Orders are not confirmed until payment is received.</p>
          <h2>Disputes</h2>
          <p>If you encounter issues with a seller, contact us within 7 days so we can assist in resolving the matter.</p>
          <h2>Prohibited Conduct</h2>
          <p>Fraudulent chargebacks, abusive behavior and other violations of our Terms of Service may result in account suspension.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
