import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative overflow-hidden flex items-end sm:items-center justify-center h-80 sm:h-[70vh] bg-gray-100"
    >
      <img
        className="absolute inset-0 w-full h-full object-cover"
        src="https://images.unsplash.com/photo-1553413077-190dd305871c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1350&h=900"
        alt="Wholesale inventory warehouse"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/20 sm:bg-gradient-to-r" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative z-10 max-w-2xl mx-auto text-center px-4 pb-10 sm:pb-0 space-y-4 sm:space-y-6"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-xs sm:text-sm tracking-[0.4em] uppercase text-white/80"
        >
          Wholesale & Liquidation Marketplace
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9 }}
          className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-xl"
        >
          <span className="block">Move Inventory</span>{" "}
          <span className="text-primary">Grow Your Margins</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.9 }}
          className="text-sm sm:text-lg md:text-xl text-gray-100/90"
        >
          Buy and sell overstock, closeouts, and shelf-pulls directly from trusted suppliers. Access verified lots at wholesale
          prices to power your resale business.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.9 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
        >
          <Link href="/products">
            <Button size="lg" className="shadow-lg shadow-primary/30">
              Shop Products
            </Button>
          </Link>
          <Link href="/seller/apply">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white/90 text-primary hover:bg-white"
            >
              Become a Seller
            </Button>
          </Link>
        </motion.div>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </motion.section>
  );
}