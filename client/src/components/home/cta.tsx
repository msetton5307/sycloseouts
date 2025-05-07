import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary rounded-lg shadow-xl overflow-hidden lg:grid lg:grid-cols-2 lg:gap-4">
          <div className="pt-10 pb-12 px-6 sm:pt-16 sm:px-16 lg:py-16 lg:pr-0 xl:py-20 xl:px-20">
            <div className="lg:self-center">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                <span className="block">Ready to get started?</span>
                <span className="block">Sign up today.</span>
              </h2>
              <p className="mt-4 text-lg leading-6 text-blue-100">
                Join thousands of businesses already using SY Closeouts to buy and sell wholesale inventory. Create your free account in minutes.
              </p>
              <div className="mt-8 flex space-x-4">
                <Link href="/auth?type=buyer">
                  <Button className="inline-flex py-3 px-6 rounded-md shadow-sm text-base font-medium text-primary bg-white hover:bg-blue-50">
                    Sign up as Buyer
                  </Button>
                </Link>
                <Link href="/auth?type=seller">
                  <Button className="inline-flex py-3 px-6 rounded-md shadow-sm text-base font-medium text-white bg-blue-800 hover:bg-blue-900">
                    Become a Seller
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <div className="relative -mt-6 aspect-w-5 aspect-h-3 md:aspect-w-2 md:aspect-h-1">
            <img 
              className="transform translate-x-6 translate-y-6 rounded-md object-cover object-left-top sm:translate-x-16 lg:translate-y-20"
              src="https://images.unsplash.com/photo-1574108233889-78180788dfd7?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1350&h=900"
              alt="Warehouse worker checking inventory"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
