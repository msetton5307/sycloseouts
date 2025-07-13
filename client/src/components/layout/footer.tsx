import { Link } from "wouter";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Thank you for subscribing!",
      description: "You'll receive our newsletter at " + email,
    });
    setEmail("");
  };
  
  return (
    <footer className="bg-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Company</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/about">
                  <a className="text-base text-gray-400 hover:text-white">About</a>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/help">
                  <a className="text-base text-gray-400 hover:text-white">Help Center</a>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link href="/privacy">
                  <a className="text-base text-gray-400 hover:text-white">Privacy Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-base text-gray-400 hover:text-white">Terms of Service</a>
                </Link>
              </li>
              <li>
                <Link href="/seller-agreement">
                  <a className="text-base text-gray-400 hover:text-white">Seller Agreement</a>
                </Link>
              </li>
              <li>
                <Link href="/buyer-agreement">
                  <a className="text-base text-gray-400 hover:text-white">Buyer Agreement</a>
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Subscribe to our newsletter</h3>
              <p className="mt-4 text-gray-400 text-sm">Get the latest updates, deals and wholesale opportunities.</p>
              <form className="mt-4 sm:flex sm:max-w-md" onSubmit={handleSubscribe}>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="appearance-none min-w-0 w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="mt-3 rounded-md sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                  <Button type="submit" className="w-full bg-primary border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary">
                    Subscribe
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8">
          <p className="text-base text-gray-400 text-center">&copy; {new Date().getFullYear()} {settings?.siteTitle ?? 'SY Closeouts'}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
