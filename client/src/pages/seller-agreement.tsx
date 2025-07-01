import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function SellerAgreementPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-4">Seller Agreement</h1>
        <div className="prose prose-gray">
          <p>
            This Seller Agreement outlines the rules and responsibilities that
            apply to all sellers using the SY Closeouts marketplace.
          </p>
          <h2>Eligibility</h2>
          <p>Only registered businesses or individuals over the age of 18 may sell products on our platform.</p>
          <h2>Listings</h2>
          <p>All listings must accurately describe inventory and comply with applicable laws. Misleading or prohibited items may be removed without notice.</p>
          <h2>Payments</h2>
          <p>Payments are processed through our secure payment provider. Sellers are responsible for any applicable fees.</p>
          <h2>Disputes</h2>
          <p>Any disputes with buyers should be reported promptly. SY Closeouts reserves the right to mediate or suspend accounts that violate these terms.</p>
          <h2>Termination</h2>
          <p>We may terminate or suspend your seller account for violations of this Agreement or our Terms of Service.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
