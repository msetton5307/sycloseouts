import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getServiceFeeRate, DEFAULT_SERVICE_FEE_RATE } from "@/hooks/use-settings";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



// Remove the service fee by reversing the addition logic. The price with fee
// is rounded up when added, so we round down when removing to avoid losing
// cents due to floating point math.
export function removeServiceFee(priceWithFee: number, rate: number = getServiceFeeRate()): number {
  return Math.floor((priceWithFee / (1 + rate)) * 100) / 100;
}

// Round a number up to the nearest cent
export function roundUpToCent(amount: number): number {
  return Math.ceil(amount * 100) / 100;
}

// Apply the service fee and round up to the nearest cent
export function addServiceFee(basePrice: number, rate: number = getServiceFeeRate()): number {
  return roundUpToCent(basePrice * (1 + rate));
}

// Subtract the service fee from a price and round to the nearest cent
export function subtractServiceFee(amount: number, rate: number = getServiceFeeRate()): number {
  return Math.round(amount * (1 - rate) * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string, showTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(showTime && { hour: 'numeric', minute: '2-digit' }),
  } as any);
}

export function getRelativeTimeString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = new Date();
  const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000);
  
  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(Math.floor(diffInSeconds), 'second');
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, 'minute');
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, 'hour');
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) {
    return rtf.format(diffInDays, 'day');
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (Math.abs(diffInMonths) < 12) {
    return rtf.format(diffInMonths, 'month');
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return rtf.format(diffInYears, 'year');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

// Get an estimated delivery date (7-10 days from now)
export function getEstimatedDeliveryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7 + Math.floor(Math.random() * 4)); // 7-10 days
  return date;
}


export function calculateOrderCommission(
  order: { items: { totalPrice: number }[] },
  rate: number = getServiceFeeRate(),
): number {
  const productTotal = order.items.reduce((sum, i) => sum + i.totalPrice, 0);
  const payoutTotal = subtractServiceFee(productTotal, rate);
  return Math.round((productTotal - payoutTotal) * 100) / 100;
}

export function calculateSellerPayout(
  order: { items: { totalPrice: number }[]; totalAmount: number },
  rate: number = getServiceFeeRate(),
): number {
  const productTotal = order.items.reduce((sum, i) => sum + i.totalPrice, 0);
  const shippingTotal = order.totalAmount - productTotal;
  return Math.round((subtractServiceFee(productTotal, rate) + shippingTotal) * 100) / 100;
}

export function calculateShippingTotal(order: { items: { totalPrice: number }[]; totalAmount: number }): number {
  const productTotalWithFee = order.items.reduce((sum, i) => sum + i.totalPrice, 0);
  return Math.max(order.totalAmount - productTotalWithFee, 0);
}
