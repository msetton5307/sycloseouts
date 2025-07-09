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
import { useSettings } from "@/hooks/use-settings";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const { data: settings } = useSettings();
  
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Thank you for subscribing!",
      description: "You will receive our newsletter updates.",
    });
    setEmail("");
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            <Link href="/">
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo" className="h-8 w-auto" />
              ) : (
                <span className="text-primary font-bold text-2xl cursor-pointer">SY Closeouts</span>
              )}
            </Link>
            <p className="text-gray-400 text-base max-w-xs">
              Your trusted source for wholesale liquidation merchandise. 
              Quality products at closeout prices for resellers and retailers.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Facebook</span>
                <Facebook />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Instagram</span>
                <Instagram />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">Twitter</span>
                <Twitter />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <span className="sr-only">LinkedIn</span>
                <Linkedin />
              </a>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Products</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link href="/products?category=electronics" className="text-base text-gray-400 hover:text-white">
                      Electronics
                    </Link>
                  </li>
                  <li>
                    <Link href="/products?category=apparel" className="text-base text-gray-400 hover:text-white">
                      Apparel
                    </Link>
                  </li>
                  <li>
                    <Link href="/products?category=home-goods" className="text-base text-gray-400 hover:text-white">
                      Home Goods
                    </Link>
                  </li>
                  <li>
                    <Link href="/products?category=health-beauty" className="text-base text-gray-400 hover:text-white">
                      Health & Beauty
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Company</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link href="/about" className="text-base text-gray-400 hover:text-white">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="text-base text-gray-400 hover:text-white">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="/faq" className="text-base text-gray-400 hover:text-white">
                      FAQ
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Support</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link href="/help" className="text-base text-gray-400 hover:text-white">
                      Help Center
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Legal</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <Link href="/privacy" className="text-base text-gray-400 hover:text-white">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-base text-gray-400 hover:text-white">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/cookies" className="text-base text-gray-400 hover:text-white">
                      Cookie Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-800 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Subscribe to our newsletter</h3>
              <p className="mt-2 text-base text-gray-400">
                Get the latest updates on new products and upcoming sales.
              </p>
              <form className="mt-4 sm:flex sm:max-w-md" onSubmit={handleSubscribe}>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full sm:max-w-xs bg-gray-800 text-white border-gray-700 focus:border-primary"
                />
                <div className="mt-3 rounded-md sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                  <Button type="submit" className="w-full flex justify-center py-2 px-4">
                    Subscribe
                  </Button>
                </div>
              </form>
            </div>
            <div className="flex items-center md:justify-end">
              <p className="text-base text-gray-400">&copy; {new Date().getFullYear()} SY Closeouts. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}