import { Tag, ShieldCheck, Truck, Package } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, amount: 0.3 }}
      className="py-16 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            viewport={{ once: true, amount: 0.4 }}
            className="text-base text-primary font-semibold tracking-[0.5em] uppercase"
          >
            Benefits
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            viewport={{ once: true, amount: 0.4 }}
            className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl"
          >
            A better way to buy and sell wholesale
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            viewport={{ once: true, amount: 0.4 }}
            className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto"
          >
            SY Closeouts connects buyers with verified wholesale sellers, simplifying inventory management and procurement.
          </motion.p>
        </div>

        <div className="mt-12">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true, amount: 0.3 }}
                className="relative rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-slate-100/70"
              >
                <dt>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white shadow-md">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="mt-5 text-xl leading-6 font-semibold text-gray-900">{feature.name}</p>
                </dt>
                <dd className="mt-3 text-base text-gray-500">{feature.description}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </motion.section>
  );
}
