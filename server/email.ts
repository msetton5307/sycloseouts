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
    .map(
      (i) => `${i.title} x${i.quantity} - $${i.totalPrice.toFixed(2)}`,
    )
    .join("\n");

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
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send invoice email", err);
  }
}
