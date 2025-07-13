import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p>
          Please email
          {" "}
          <a className="text-primary hover:underline" href="mailto:support@sycloseouts.com">
            support@sycloseouts.com
          </a>
          {" "}
          and we will get back to you as soon as possible.
        </p>
      </main>
      <Footer />
    </>
  );
}
