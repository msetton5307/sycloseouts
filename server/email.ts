import "dotenv/config";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";
import type { Order } from "@shared/schema";
import { storage } from "./storage";

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

async function getLogoAttachment() {
  const logo = await storage.getSiteSetting("logo");
  if (logo && logo.startsWith("data:")) {
    const base = logo.split(",", 2)[1] || "";
    return { filename: "logo.png", content: Buffer.from(base, "base64"), cid: "logo" };
  }
  if (logo) {
    return { filename: "logo.png", path: logo, cid: "logo" };
  }
  return { filename: "logo.png", path: path.resolve(__dirname, "..", "generated-icon.png"), cid: "logo" };
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
  const shipping = Math.max(order.totalAmount - subtotal, 0);
  
  const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}`.trim() : "";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SY Closeouts Invoice</title>
  </head>
  <body style="margin:0; padding:20px; background-color:#f7f7f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <tr>
        <td style="background-color:#222222; padding:20px; text-align:center;">
          <img src="cid:logo" alt="SY Closeouts" style="max-height:50px; margin-bottom:10px;" />
          <h1 style="margin:0; color:#ffffff; font-size:24px;">SY Closeouts</h1>
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
              ${shipping > 0 ? `<tr><td colspan="2" align="right">Shipping:</td><td align="right">$${shipping.toFixed(2)}</td></tr>` : ""}
              <tr>
                <td colspan="2" align="right"><strong>Total:</strong></td>
                <td align="right"><strong>$${order.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <p style="margin-top:30px;">Invoice #: <strong>#INV-${order.code}</strong></p>
          <p>Order Date: <strong>${new Date(order.createdAt || Date.now()).toDateString()}</strong></p>
        </td>
      </tr>

      <tr>
        <td style="background-color:#f9f9f9; padding:20px;">
          <p style="margin:0;">If you have any questions, reply to this email or contact us at <a href="mailto:support@sycloseouts.com">support@sycloseouts.com</a>.</p>
          <p style="margin:5px 0 0;">Thank you for shopping with <strong>SY Closeouts</strong>!</p>
        </td>
      </tr>

      <tr>
        <td style="text-align:center; font-size:12px; color:#999999; padding:15px;">
          &copy; ${new Date().getFullYear()} SY Closeouts. All rights reserved.<br>
          123 Wholesale Blvd, Brooklyn, NY 11201
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const logo = await getLogoAttachment();
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Invoice for Order #${order.code}`,
    text:
      `Thank you for your order!\n\n` +
      `Order ID: ${order.code}\n` +
      `Total: $${order.totalAmount.toFixed(2)}\n` +
      (shipping > 0 ? `Shipping: $${shipping.toFixed(2)}\n` : "") +
      `\nItems:\n${itemLines}\n\n` +
      `We appreciate your business!`,
    html,
    attachments: [logo],
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

  const shippingMethod =
    order.shippingChoice === "buyer"
      ? order.shippingCarrier
        ? `Buyer arranged (${order.shippingCarrier})`
        : "Buyer arranged"
      : "Seller shipping";

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SY Closeouts Order Sold</title>
  </head>
  <body style="margin:0; padding:20px; background-color:#f7f7f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <tr>
        <td style="background-color:#222222; padding:20px; text-align:center;">
          <img src="cid:logo" alt="SY Closeouts" style="max-height:50px; margin-bottom:10px;" />
          <h1 style="margin:0; color:#ffffff; font-size:24px;">SY Closeouts</h1>
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
              ${shipping > 0 ? `<tr><td colspan="2" align="right">Shipping:</td><td align="right">$${shipping.toFixed(2)}</td></tr>` : ""}
              <tr>
                <td colspan="2" align="right"><strong>Total:</strong></td>
                <td align="right"><strong>$${order.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <p style="margin-top:10px;">Shipping Method: ${shippingMethod}</p>

          <p style="margin-top:30px;">Order #: <strong>${order.code}</strong></p>
          <p>Order Date: <strong>${new Date(order.createdAt || Date.now()).toDateString()}</strong></p>
        </td>
      </tr>

      <tr>
        <td style="background-color:#f9f9f9; padding:20px;">
          <p style="margin:0;">Log in to your dashboard to manage this order.</p>
          <p style="margin:5px 0 0;">Thank you for selling with <strong>SY Closeouts</strong>!</p>
        </td>
      </tr>

      <tr>
        <td style="text-align:center; font-size:12px; color:#999999; padding:15px;">
          &copy; ${new Date().getFullYear()} SY Closeouts. All rights reserved.<br>
          123 Wholesale Blvd, Brooklyn, NY 11201
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const logo = await getLogoAttachment();
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `New Order #${order.code} Received`,
    text:
      `You have a new order!\n\n` +
      `Order ID: ${order.code}\n` +
      `Total: $${order.totalAmount.toFixed(2)}\n` +
      (shipping > 0 ? `Shipping: $${shipping.toFixed(2)}\n` : "") +
      `Shipping Method: ${shippingMethod}\n` +
      `\nItems:\n${itemLines}\n`,
    html,
    attachments: [logo],
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
    subject: `Shipping update for Order #${order.code}`,
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
  orderCode: string,
  message: string,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping order message email");
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Message regarding Order #${orderCode}`,
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

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:20px;background:#f7f7f7;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#222;padding:20px;text-align:center;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;">${subject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;">${body.replace(/\n/g, '<br>')}</td>
        </tr>
      </table>
    </body>
  </html>`;

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to: admin,
    subject,
    text: body,
    html,
  } as nodemailer.SendMailOptions;

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

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Password Reset</title>
    </head>
    <body style="font-family:Arial, sans-serif; line-height:1.5; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px;margin:auto;background:#ffffff;padding:20px;border-radius:6px;">
        <h2 style="margin-top:0;color:#333333;">Reset Your Password</h2>
        <p>Use the verification code below to reset your password. This code will expire in 15 minutes.</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:4px;margin:20px 0;text-align:center;">${code}</p>
        <p style="margin-bottom:0;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    </body>
  </html>`;

  const logo = await getLogoAttachment();
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Password Reset Verification Code",
    text: `Your password reset verification code is: ${code}`,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send password reset email", err);
  }
}

export async function sendSuspensionEmail(to: string, days?: number) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping suspension email");
    return;
  }

  const text =
    days && days > 0
      ? `Your account has been suspended for ${days} day${days === 1 ? "" : "s"}.`
      : "Your account has been suspended.";
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Account Suspension Notice",
    text,
  } as nodemailer.SendMailOptions;

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send suspension email", err);
  }
}

export async function sendStrikeEmail(
  to: string,
  reason: string,
  count: number,
  suspensionDays?: number,
  permanent?: boolean,
  message?: string,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping strike email");
    return;
  }

  const consequences =
    count === 1
      ? "This is a warning."
      : count === 2
      ? "Further violations may lead to suspension or removal."
      : "Your account is at risk of permanent suspension.";

  const suspensionText = permanent
    ? "Your account has been suspended permanently."
    : suspensionDays && suspensionDays > 0
    ? `Your account has been suspended for ${suspensionDays} day${
        suspensionDays === 1 ? "" : "s"
      }.`
    : "";

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>SY Closeouts Strike Notice</title>
    </head>
    <body style="margin:0;padding:20px;background:#f7f7f7;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 0 10px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#222;padding:20px;text-align:center;">
            <img src="cid:logo" alt="SY Closeouts" style="max-height:50px;margin-bottom:10px;" />
            <h1 style="margin:0;color:#ffffff;font-size:24px;">SY Closeouts</h1>
            <p style="margin:5px 0 0;color:#bbbbbb;">Account Strike Notice</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;">
            <p style="margin-top:0;">You have received a strike for the following reason:</p>
            <p style="font-weight:bold;">${reason}</p>
            ${message ? `<p>${message}</p>` : ""}
            <p>This is strike <strong>${count}</strong> of 3 on your account.</p>
            <p>${consequences}</p>
            ${suspensionText ? `<p>${suspensionText}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:20px;">
            <p style="margin:0;">If you have questions please reply to this email.</p>
            <p style="margin:5px 0 0;">Thank you for using <strong>SY Closeouts</strong>.</p>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const logo = await getLogoAttachment();
  const text =
    `You have received a strike for: ${reason}\n` +
    (message ? `${message}\n` : "") +
    `Strike ${count} of 3. ${consequences}` +
    (suspensionText ? `\n${suspensionText}` : "");

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Account Strike ${count} of 3`,
    text,
    html,
    attachments: [logo],
  } as nodemailer.SendMailOptions;

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send strike email", err);
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

export async function sendHtmlEmail(to: string, subject: string, html: string) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping html email");
    return;
  }

  const text = html.replace(/<[^>]*>/g, "");
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send html email", err);
  }
}

export async function sendWireInstructionsEmail(to: string, order: Order) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping wire instructions email");
    return;
  }

  const accountNumber = process.env.WIRE_ACCOUNT_NUMBER || "12345678";
  const routingNumber = process.env.WIRE_ROUTING_NUMBER || "12345678";
  const instructions =
    process.env.WIRE_INSTRUCTIONS ||
    "Please wire the invoice total using the account details below. " +
      "Your order will not be processed until the wire is received. If payment is not received within 48 hours the order will be cancelled.";

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Order Confirmation &amp; Wire Instructions</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; padding:20px; font-family:Arial, sans-serif; color:#333333; border-radius:6px;">

              <tr>
                <td align="center" style="padding-bottom:20px;">
                  <img src="cid:logo" alt="SY Closeouts" style="height:50px; margin-bottom:10px;" />
                  <h1 style="margin:0; color:#333333;">Thank You for Your Order!</h1>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px;">
                  <p style="margin:0;">Thank you for placing order <strong>#${order.code}</strong> with us. To complete your purchase, please send a wire transfer using the instructions below.</p>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px;">
                  <h2 style="margin:0 0 10px 0; font-size:18px; color:#333333;">Order Summary</h2>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="padding:8px 0; font-size:16px;">Total Amount to Wire:</td>
                      <td style="padding:8px 0; font-size:16px;" align="right"><strong>$${order.totalAmount.toFixed(2)}</strong></td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px;">
                  <h2 style="margin:0 0 10px 0; font-size:18px; color:#333333;">Wire Transfer Instructions</h2>
                  <p style="margin:0 0 15px 0; font-size:16px;">${instructions.replace(/\n/g, '<br>')}</p>
                  <table cellpadding="0" cellspacing="0" align="center" style="border:1px solid #dddddd; border-radius:4px; margin:0 auto;">
                    <tr>
                      <td style="padding:15px; font-size:16px; text-align:center;">
                        <strong>Account Number:</strong> ${accountNumber}<br />
                        <strong>Routing Number:</strong> ${routingNumber}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:20px;">
                  <p style="margin:0 0 10px 0; color:#e74c3c; font-size:16px;"><strong>Please Note:</strong></p>
                  <ul style="margin:0 0 10px 20px; padding:0; font-size:16px; color:#333333;">
                    <li>Your order will not be processed until we receive your wire transfer.</li>
                    <li>If we do not receive your wire within <strong>48 hours</strong> of placing your order, your order will be canceled.</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-bottom:20px;">
                  <a href="https://sycloseouts.com/buyer/orders/${order.id}" style="background-color:#3498db; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:4px; font-size:16px; display:inline-block;">
                    View Your Order
                  </a>
                </td>
              </tr>

              <tr>
                <td style="border-top:1px solid #dddddd; padding-top:20px; font-size:12px; color:#888888;" align="center">
                  <p style="margin:0;">If you have any questions, reply to this email or contact us at <a href="mailto:support@sycloseouts.com" style="color:#3498db; text-decoration:none;">support@sycloseouts.com</a>.</p>
                  <p style="margin:5px 0 0 0;">&copy; ${new Date().getFullYear()} SY Closeouts. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
  </table>
    </body>
  </html>`;

  const logo = await getLogoAttachment();
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Wire Instructions for Order #${order.code}`,
    text: `${instructions}\nAccount Number: ${accountNumber}\nRouting Number: ${routingNumber}\n\nAmount: $${order.totalAmount.toFixed(2)}\nOrder #: ${order.code}`,
    html,
    attachments: [logo],
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send wire instructions email", err);
  }
}

export async function sendWireReminderEmail(to: string, orderCode: string) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping wire reminder email");
    return;
  }

  const accountNumber = process.env.WIRE_ACCOUNT_NUMBER || "12345678";
  const routingNumber = process.env.WIRE_ROUTING_NUMBER || "12345678";
  const instructions = process.env.WIRE_INSTRUCTIONS ||
    "Please wire the invoice total using the account details below.";

  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: `Reminder: Wire Payment for Order #${orderCode}`,
    text: `${instructions}\nAccount Number: ${accountNumber}\nRouting Number: ${routingNumber}\n\nOrder #: ${orderCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send wire reminder email", err);
  }
}
export async function sendSellerPayoutEmail(
  to: string,
  amount: number,
  orders: { code: string; total: number }[],
  bankLast4: string,
) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping seller payout email");
    return;
  }

  const orderLines = orders
    .map(o => `#${o.code} - $${o.total.toFixed(2)}`)
    .join("\n");

  const orderRows = orders
    .map(o => `
              <tr>
                <td>Order #${o.code}</td>
                <td align="right">$${o.total.toFixed(2)}</td>
              </tr>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SY Closeouts Payout Processed</title>
  </head>
  <body style="margin:0; padding:20px; background-color:#f7f7f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1);">
      <tr>
        <td style="background-color:#222222; padding:20px; text-align:center;">
          <img src="cid:logo" alt="SY Closeouts" style="max-height:50px; margin-bottom:10px;" />
          <h1 style="margin:0; color:#ffffff; font-size:24px;">SY Closeouts</h1>
          <p style="margin:5px 0 0; color:#bbbbbb;">Payout Processed</p>
        </td>
      </tr>

      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 10px;">Hello Seller,</p>
          <p style="margin:0 0 20px;">We have processed your payout of <strong>$${amount.toFixed(2)}</strong> for the following orders:</p>

          <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background-color:#f0f0f0; border-bottom:2px solid #ddd;">
                <th align="left">Order</th>
                <th align="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${orderRows}
            </tbody>
          </table>

          <p style="margin-top:20px;">Funds were sent to your bank account ending in <strong>${bankLast4}</strong>.</p>
        </td>
      </tr>

      <tr>
        <td style="background-color:#f9f9f9; padding:20px;">
          <p style="margin:0;">Thank you for selling with <strong>SY Closeouts</strong>!</p>
        </td>
      </tr>

      <tr>
        <td style="text-align:center; font-size:12px; color:#999999; padding:15px;">
          &copy; ${new Date().getFullYear()} SY Closeouts. All rights reserved.<br>
          123 Wholesale Blvd, Brooklyn, NY 11201
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const logo = await getLogoAttachment();
  const mailOptions = {
    from: process.env.SMTP_FROM || user,
    to,
    subject: "Your payout has been processed",
    text:
      `A payout of $${amount.toFixed(2)} has been sent to your account ending in ${bankLast4}.\n\n` +
      `Orders:\n${orderLines}`,
    html,
    attachments: [logo],
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send seller payout email", err);
  }
}

export async function sendSupportTicketEmail(to: string, ticketId: number) {
  if (!transporter) {
    console.warn("Email transport not configured; skipping support ticket email");
    return;
  }

  const mailOptions = {
    from: process.env.SUPPORT_EMAIL_FROM || process.env.SMTP_FROM || user,
    to,
    cc: process.env.SUPPORT_EMAIL_CC,
    subject: `Support Ticket #${ticketId}`,
    text:
      `We\'ve received your support request. Your ticket number is #${ticketId}. ` +
      `We will communicate with you via email regarding this issue.`,
  } as nodemailer.SendMailOptions;

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Failed to send support ticket email", err);
  }
}