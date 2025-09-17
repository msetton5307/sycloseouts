import { motion } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Users,
  LineChart,
  Handshake,
} from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Vetted Network",
    description:
      "Every seller is screened and verified so buyers can purchase confidently without worrying about product authenticity.",
  },
  {
    icon: Sparkles,
    title: "Curated Lots",
    description:
      "We curate trending categories and seasonal opportunities, giving your business first access to high-demand merchandise.",
  },
  {
    icon: LineChart,
    title: "Data Insights",
    description:
      "Track performance, pricing, and sell-through using analytics designed to help you negotiate smarter and scale faster.",
  },
  {
    icon: Users,
    title: "Dedicated Support",
    description:
      "Work with a real human onboarding team that understands liquidation and helps optimize every deal you make.",
  },
];

const milestones = [
  {
    label: "1",
    title: "Create Your Account",
    description: "Sign up in minutes and personalize alerts for the inventory you need most.",
  },
  {
    label: "2",
    title: "Browse Verified Lots",
    description: "Discover exclusive pallets and truckloads with transparent manifests and photos.",
  },
  {
    label: "3",
    title: "Transact With Confidence",
    description: "Secure payments, streamlined logistics, and responsive support for every order.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-20 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-500/40 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-[1.1fr,0.9fr] lg:gap-20">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, amount: 0.4 }}
              className="text-xs font-semibold uppercase tracking-[0.5em] text-primary/70"
            >
              Why Choose SY Closeouts
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              viewport={{ once: true, amount: 0.4 }}
              className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black leading-tight"
            >
              Built for modern resellers and liquidation pros
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              viewport={{ once: true, amount: 0.4 }}
              className="mt-6 text-lg text-slate-200"
            >
              From first-time buyers to experienced sourcing teams, SY Closeouts gives you the tools, transparency, and support
              needed to move inventory quickly and profitably.
            </motion.p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {reasons.map((reason, index) => (
                <motion.div
                  key={reason.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.7 }}
                  viewport={{ once: true, amount: 0.3 }}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 p-6 shadow-lg backdrop-blur border border-white/10"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white shadow-lg">
                    <reason.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold">{reason.title}</h3>
                  <p className="mt-3 text-sm text-slate-200/90">{reason.description}</p>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, amount: 0.3 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-blue-500 text-white shadow-lg">
                  <Handshake className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Your sourcing playbook</h3>
                  <p className="text-sm text-slate-200/80">Three simple steps to start scaling with SY Closeouts</p>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.label}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 * index, duration: 0.6 }}
                    viewport={{ once: true, amount: 0.4 }}
                    className="relative rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white">
                      {milestone.label}
                    </span>
                    <h4 className="text-xl font-semibold">{milestone.title}</h4>
                    <p className="mt-2 text-sm text-slate-200/90">{milestone.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
