import { Link } from "wouter";
import { 
  ShirtIcon, 
  Smartphone, 
  Home, 
  Puzzle, 
  Utensils, 
  MoreHorizontal 
} from "lucide-react";

export default function Categories() {
  const categories = [
    {
      name: "Apparel",
      icon: ShirtIcon,
      href: "/products?category=apparel",
    },
    {
      name: "Electronics",
      icon: Smartphone,
      href: "/products?category=electronics",
    },
    {
      name: "Home Goods",
      icon: Home,
      href: "/products?category=home",
    },
    {
      name: "Toys & Games",
      icon: Puzzle,
      href: "/products?category=toys",
    },
    {
      name: "Kitchen",
      icon: Utensils,
      href: "/products?category=kitchen",
    },
    {
      name: "More Categories",
      icon: MoreHorizontal,
      href: "/products",
    },
  ];

  return (
    <section className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-6">Shop by Category</h2>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link key={category.name} href={category.href}>
              <a className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors duration-200">
                <div className="h-12 w-12 text-primary mb-2 flex items-center justify-center">
                  <category.icon className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 text-center">{category.name}</h3>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
