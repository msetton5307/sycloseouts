import nodemailer from "nodemailer";
import type { Order } from "@shared/schema";

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

interface InvoiceItem {
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export async function sendInvoiceEmail(
  to: string,
  order: Order,
  items: InvoiceItem[],
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping invoice email");
    return;
  }

  const itemLines = items
    .map((i) => `${i.title} x${i.quantity} - $${i.totalPrice.toFixed(2)}`)
    .join("\n");

  const itemRows = items
    .map(
      (i) => `
        <tr>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${i.title}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${i.quantity}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${i.unitPrice.toFixed(2)}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">$${i.totalPrice.toFixed(2)}</td>
        </tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - Your Order</title>
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f3f4f6;
      color: #374151;
    }
    .invoice-header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    }
    .divider {
      border-bottom: 1px dashed #d1d5db;
    }
    @media (max-width: 640px) {
      .mobile-stack {
        display: block !important;
        width: 100% !important;
      }
      .mobile-padding {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body class="bg-gray-100 p-4 sm:p-8">
  <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
    <div class="invoice-header p-6 sm:p-8 text-white">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div class="mb-4 sm:mb-0">
          <h1 class="text-2xl sm:text-3xl font-bold">INVOICE</h1>
          <p class="text-indigo-100 mt-1">Thank you for your order</p>
        </div>
        <div class="bg-white/20 backdrop-blur-sm rounded-lg p-4">
          <p class="text-sm font-medium text-indigo-50">Invoice #</p>
          <p class="text-lg font-bold">${order.id}</p>
        </div>
      </div>
    </div>
    <div class="p-6 sm:p-8 mobile-padding">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p class="text-sm font-medium text-gray-500">BILLED TO</p>
          <h4 class="text-lg font-semibold mt-1">Customer</h4>
        </div>
        <div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-500">DATE</p>
              <p class="text-gray-600">${new Date(order.createdAt || Date.now()).toDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="px-6 sm:px-8 mobile-padding">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${itemRows}
          </tbody>
        </table>
      </div>
    </div>
    <div class="bg-gray-50 p-6 sm:p-8 mobile-padding">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p class="text-sm text-gray-600">Notes: Thank you for your business.</p>
        </div>
        <div class="bg-white rounded-lg p-6">
          <div class="space-y-3">
            <div class="flex justify-between pt-3 border-t border-gray-200">
              <span class="text-base font-medium">Total</span>
              <span class="text-lg font-bold">$${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="bg-gray-800 text-white p-6 text-center">
      <div class="flex flex-col items-center">
        <p class="text-sm text-gray-300">© 2023 Your Company. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Invoice for Order #${order.id}`,
    text:
      `Thank you for your order!\n\n` +
      `Order ID: ${order.id}\n` +
      `Total: $${order.totalAmount.toFixed(2)}\n\n` +
      `Items:\n${itemLines}\n\n` +
      `We appreciate your business!`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send invoice email", err);
  }
}

export async function sendShippingUpdateEmail(to: string, order: Order) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping shipping update email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Shipping update for Order #${order.id}`,
    text: `Your order status is now: ${order.status}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send shipping update email", err);
  }
}