import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Lock 
} from "lucide-react";

export default function SellWithUs() {
  const benefits = [
    {
      title: "Lower Fees",
      description: "Competitive commission rates that beat traditional liquidation channels",
      icon: DollarSign,
    },
    {
      title: "Faster Sales",
      description: "Connect with ready-to-buy resellers and move inventory quickly",
      icon: TrendingUp,
    },
    {
      title: "Seller Tools",
      description: "Easy listing creation, inventory management, and sales analytics",
      icon: Settings,
    },
    {
      title: "Secure Payments",
      description: "Guaranteed payments and fraud protection for all transactions",
      icon: Lock,
    },
  ];

  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Sell Your Inventory Faster
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join SY Closeouts to move your inventory quickly and reach thousands of qualified resellers. We connect you directly with buyers looking for wholesale lots like yours.
            </p>
            <div className="mt-8">
              <div className="inline-flex rounded-md shadow">
                <Link href="/seller/apply">
                  <Button className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50">
                    Apply to Become a Seller
                    <svg className="ml-3 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="bg-blue-700 bg-opacity-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <benefit.icon className="text-2xl text-blue-200 mr-3 h-6 w-6" />
                    <h3 className="text-white font-medium">{benefit.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-blue-100">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 lg:mt-0">
            <img
              className="rounded-lg shadow-xl"
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=700&h=500"
              alt="Business team discussing inventory"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
