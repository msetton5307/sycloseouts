import { Link } from "wouter";

interface ListingBannerProps {
  productId: number;
  title: string;
  image: string;
}

export default function ListingBanner({ productId, title, image }: ListingBannerProps) {
  return (
    <Link
      href={`/products/${productId}`}
      className="flex items-center gap-3 p-2 border rounded mb-2 bg-white shadow-sm hover:bg-gray-50"
    >
      <img src={image} alt={title} className="w-16 h-16 object-cover rounded" />
      <span className="font-medium truncate">{title}</span>
    </Link>
  );
}
