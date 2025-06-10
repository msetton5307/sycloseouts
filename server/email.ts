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

  const itemRows = items
    .map(
      (i) =>
        `<tr>\n          <td style="padding:8px;border-bottom:1px solid #eee;">${i.title}</td>\n          <td style="padding:8px;text-align:center;border-bottom:1px solid #eee;">${i.quantity}</td>\n          <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">$${i.unitPrice.toFixed(2)}</td>\n          <td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">$${i.totalPrice.toFixed(2)}</td>\n        </tr>`,
    )
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6;">
      <h2 style="color:#333;">Thank you for your order!</h2>
      <p>Order ID: <strong>${order.id}</strong></p>
      <table style="border-collapse:collapse;width:100%;margin-top:1em;">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:2px solid #333;padding:8px;">Product</th>
            <th style="text-align:center;border-bottom:2px solid #333;padding:8px;">Qty</th>
            <th style="text-align:right;border-bottom:2px solid #333;padding:8px;">Unit Price</th>
            <th style="text-align:right;border-bottom:2px solid #333;padding:8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <p style="text-align:right;font-size:1.1em;margin-top:1em;"><strong>Grand Total: $${order.totalAmount.toFixed(2)}</strong></p>
      <p>We appreciate your business!</p>
    </div>
  `;

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
