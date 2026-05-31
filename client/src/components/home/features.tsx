import { Tag, ShieldCheck, Truck, Package } from "lucide-react";

export default function Features() {
  const features = [
    {
      name: "Lower Prices",
      description: "Buy directly from verified wholesalers with no middlemen, cutting costs and increasing your margins.",
      icon: Tag,
    },
    {
      name: "Verified Sellers",
      description: "All sellers are vetted and verified to ensure legitimacy and product quality for your peace of mind.",
      icon: ShieldCheck,
    },
    {
      name: "Fast Fulfillment",
      description: "Track orders in real-time and receive shipments directly from sellers with expedited shipping options.",
      icon: Truck,
    },
    {
      name: "Diverse Inventory",
      description: "Access thousands of product lots across multiple categories from retailers and manufacturers.",
      icon: Package,
    },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Benefits</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            A better way to buy and sell wholesale
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            SY Closeouts connects buyers with verified wholesale sellers, simplifying inventory management and procurement.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {features.map((feature) => (
              <div key={feature.name} className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
