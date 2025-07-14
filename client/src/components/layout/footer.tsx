import { Link } from "wouter";
import { 
  Facebook,
  Instagram,
  Twitter,
  Linkedin
} from "lucide-react";
import { useSettings, DEFAULT_SITE_TITLE } from "@/hooks/use-settings";

export default function Footer() {
  const { data: settings } = useSettings();
  
  return (
    <footer className="bg-gray-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
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
        </div>
        <div className="mt-12 border-t border-gray-700 pt-8">
          <p className="text-base text-gray-400 text-center">&copy; {new Date().getFullYear()} {settings?.siteTitle ?? DEFAULT_SITE_TITLE}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
