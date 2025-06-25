import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";
import type { Order } from "@shared/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  image?: string;
  selectedVariations?: Record<string, string>;
}

export async function sendInvoiceEmail(
  to: string,
  order: Order,
  items: InvoiceItem[],
  buyer?: Express.User,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping invoice email");
    return;
  }

  const itemLines = items
    .map((i) => {
      const variationText = i.selectedVariations
        ? ` (${Object.entries(i.selectedVariations)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")})`
        : "";
      return `${i.title}${variationText} x${i.quantity} - $${i.totalPrice.toFixed(
        2,
      )}`;
    })
    .join("\n");

  const itemRows = items
    .map(
      (i) => {
        const variationText = i.selectedVariations
          ? ` <div style="font-size:12px;color:#555;">(${Object.entries(
              i.selectedVariations,
            )
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")})</div>`
          : "";
        const imageCell = i.image
          ? `<img src="${i.image}" alt="${i.title}" style="height:40px;width:40px;object-fit:cover;margin-right:8px;" />`
          : "";
        return `
              <tr>
                <td style="display:flex;align-items:center;">
                  ${imageCell}
                  <div>
                    <div>${i.title}</div>${variationText}
                  </div>
                </td>
                <td align="center">${i.quantity}</td>
                <td align="right">$${i.totalPrice.toFixed(2)}</td>
              </tr>`;
      },
    )
    .join("\n");

  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

  const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sy Closeouts Invoice</title>
  </head>
  <body style="margin:0; padding:20px; background-color:#f7f7f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <tr>
        <td style="background-color:#222222; padding:20px; text-align:center;">
          <img src="cid:logo" alt="Sy Closeouts" style="max-height:50px; margin-bottom:10px;" />
          <h1 style="margin:0; color:#ffffff; font-size:24px;">Sy Closeouts</h1>
          <p style="margin:5px 0 0; color:#bbbbbb;">Invoice Confirmation</p>
        </td>
      </tr>

      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 10px;">Hello ${buyerName ? `<strong>${buyerName}</strong>` : "Customer"},</p>
          <p style="margin:0 0 20px;">Thank you for your order! Here is your invoice:</p>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background-color:#f0f0f0; border-bottom:2px solid #ddd;">
                <th align="left">Item</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="border-top:1px solid #ccc;">
                <td colspan="2" align="right" style="padding-top:10px;"><strong>Subtotal:</strong></td>
                <td align="right" style="padding-top:10px;">$${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" align="right"><strong>Total:</strong></td>
                <td align="right"><strong>$${order.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <p style="margin-top:30px;">Invoice #: <strong>#INV-${order.id}</strong></p>
          <p>Order Date: <strong>${new Date(order.createdAt || Date.now()).toDateString()}</strong></p>
        </td>
      </tr>

      <tr>
        <td style="background-color:#f9f9f9; padding:20px;">
          <p style="margin:0;">If you have any questions, reply to this email or contact us at <a href="mailto:support@sycloseouts.com">support@sycloseouts.com</a>.</p>
          <p style="margin:5px 0 0;">Thank you for shopping with <strong>Sy Closeouts</strong>!</p>
        </td>
      </tr>

      <tr>
        <td style="text-align:center; font-size:12px; color:#999999; padding:15px;">
          &copy; ${new Date().getFullYear()} Sy Closeouts. All rights reserved.<br>
          123 Wholesale Blvd, Brooklyn, NY 11201
        </td>
      </tr>
    </table>
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
    attachments: [
      {
        filename: "logo.png",
        path: path.resolve(__dirname, "..", "generated-icon.png"),
        cid: "logo",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send invoice email", err);
  }
}

export async function sendSellerOrderEmail(
  to: string,
  order: Order,
  items: InvoiceItem[],
  buyer?: Express.User,
  seller?: Express.User,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping seller order email");
    return;
  }

  const itemLines = items
    .map((i) => {
      const variationText = i.selectedVariations
        ? ` (${Object.entries(i.selectedVariations)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")})`
        : "";
      return `${i.title}${variationText} x${i.quantity} - $${i.totalPrice.toFixed(
        2,
      )}`;
    })
    .join("\n");

  const itemRows = items
    .map((i) => {
      const variationText = i.selectedVariations
        ? ` <div style="font-size:12px;color:#555;">(${Object.entries(
            i.selectedVariations,
          )
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")})</div>`
        : "";
      const imageCell = i.image
        ? `<img src="${i.image}" alt="${i.title}" style="height:40px;width:40px;object-fit:cover;margin-right:8px;" />`
        : "";
      return `
              <tr>
                <td style="display:flex;align-items:center;">
                  ${imageCell}
                  <div>
                    <div>${i.title}</div>${variationText}
                  </div>
                </td>
                <td align="center">${i.quantity}</td>
                <td align="right">$${i.totalPrice.toFixed(2)}</td>
              </tr>`;
    })
    .join("\n");

  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

  const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : "";
  const sellerName = seller ? `${seller.firstName} ${seller.lastName}`.trim() : "";

  const shipping = order.shippingDetails as Record<string, any> | undefined;
  const shippingLines = shipping
    ? [`${shipping.name}`, `${shipping.address}`, `${shipping.city}, ${shipping.state} ${shipping.zipCode}`, `${shipping.country}`, shipping.phone ? `Phone: ${shipping.phone}` : null]
        .filter(Boolean)
        .map((l) => `<div>${l}</div>`) 
        .join("")
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sy Closeouts Order Sold</title>
  </head>
  <body style="margin:0; padding:20px; background-color:#f7f7f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <tr>
        <td style="background-color:#222222; padding:20px; text-align:center;">
          <img src="cid:logo" alt="Sy Closeouts" style="max-height:50px; margin-bottom:10px;" />
          <h1 style="margin:0; color:#ffffff; font-size:24px;">Sy Closeouts</h1>
          <p style="margin:5px 0 0; color:#bbbbbb;">New Order Received</p>
        </td>
      </tr>

      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 10px;">Hello ${sellerName || "Seller"},</p>
          <p style="margin:0 0 20px;">You just sold the following items${buyerName ? ` to <strong>${buyerName}</strong>` : ""}:</p>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background-color:#f0f0f0; border-bottom:2px solid #ddd;">
                <th align="left">Item</th>
                <th align="center">Qty</th>
                <th align="right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr style="border-top:1px solid #ccc;">
                <td colspan="2" align="right" style="padding-top:10px;"><strong>Subtotal:</strong></td>
                <td align="right" style="padding-top:10px;">$${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" align="right"><strong>Total:</strong></td>
                <td align="right"><strong>$${order.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          ${shippingLines ? `<div style="margin-top:20px;"><strong>Ship To:</strong>${shippingLines}</div>` : ""}

          <p style="margin-top:30px;">Order #: <strong>${order.id}</strong></p>
          <p>Order Date: <strong>${new Date(order.createdAt || Date.now()).toDateString()}</strong></p>
        </td>
      </tr>

      <tr>
        <td style="background-color:#f9f9f9; padding:20px;">
          <p style="margin:0;">Log in to your dashboard to manage this order.</p>
          <p style="margin:5px 0 0;">Thank you for selling with <strong>Sy Closeouts</strong>!</p>
        </td>
      </tr>

      <tr>
        <td style="text-align:center; font-size:12px; color:#999999; padding:15px;">
          &copy; ${new Date().getFullYear()} Sy Closeouts. All rights reserved.<br>
          123 Wholesale Blvd, Brooklyn, NY 11201
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `New Order #${order.id} Received`,
    text:
      `You have a new order!\n\n` +
      `Order ID: ${order.id}\n` +
      `Total: $${order.totalAmount.toFixed(2)}\n\n` +
      `Items:\n${itemLines}\n`,
    html,
    attachments: [
      {
        filename: "logo.png",
        path: path.resolve(__dirname, "..", "generated-icon.png"),
        cid: "logo",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send seller order email", err);
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

export async function sendSellerApprovalEmail(to: string) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping seller approval email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Seller Application Approved",
    text: "Your seller application has been approved. You can now access your seller dashboard.",
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send seller approval email", err);
  }
}

export async function sendOrderMessageEmail(
  to: string,
  orderId: number,
  message: string,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping order message email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Message regarding Order #${orderId}`,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send order message email", err);
  }
}

export async function sendProductQuestionEmail(to: string, productTitle: string, question: string) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping product question email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Question about ${productTitle}`,
    text: question,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send product question email", err);
  }
}
export async function sendAdminAlertEmail(subject: string, body: string) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping admin alert email");
    return;
  }
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) {
    console.warn("ADMIN_EMAIL not configured; skipping admin alert email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to: admin,
    subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send admin alert email", err);
  }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping password reset email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Password Reset Verification Code",
    text: `Your password reset verification code is: ${code}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send password reset email", err);
  }
}

export async function sendSuspensionEmail(to: string, days: number) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping suspension email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Account Suspension Notice",
    text: `Your account has been suspended for ${days} day${days === 1 ? "" : "s"}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send suspension email", err);
  }
}

export async function sendAdminUserEmail(
  to: string,
  subject: string,
  body: string,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping admin user email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send admin user email", err);
  }
}