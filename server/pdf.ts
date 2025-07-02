export interface InvoiceItem {
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariations?: Record<string, string>;
}

import type { Order } from "@shared/schema";

function escape(text: string): string {
  return text.replace(/[\\()]/g, "\\$&");
}

function textBlock(x: number, y: number, size: number, text: string) {
  const escaped = escape(text);
  return `BT\n/F1 ${size} Tf\n1 0 0 1 ${x} ${y} Tm\n(${escaped}) Tj\nET`;
}

export function generateInvoicePdf(order: Order, items: InvoiceItem[]): Buffer {
  const lines: string[] = [];
  lines.push(textBlock(50, 760, 24, "INVOICE"));
  lines.push(textBlock(50, 735, 12, `Order #: ${order.code}`));
  lines.push(
    textBlock(50, 720, 12, `Date: ${new Date(order.createdAt || Date.now()).toDateString()}`)
  );

  let y = 705;

  if (order.shippingChoice === "seller" && order.shippingDetails) {
    const s = order.shippingDetails as Record<string, string>;
    lines.push(textBlock(50, y, 12, "Ship To:"));
    y -= 15;
    if (s.name) {
      lines.push(textBlock(60, y, 12, s.name));
      y -= 15;
    }
    if (s.address) {
      lines.push(textBlock(60, y, 12, s.address));
      y -= 15;
    }
    let cityLine = "";
    if (s.city) cityLine += s.city;
    if (s.state) cityLine += (cityLine ? ", " : "") + s.state;
    if (s.zipCode) cityLine += (cityLine ? " " : "") + s.zipCode;
    if (cityLine) {
      lines.push(textBlock(60, y, 12, cityLine));
      y -= 15;
    }
    if (s.country) {
      lines.push(textBlock(60, y, 12, s.country));
      y -= 15;
    }
    y -= 5;
  }
  else {
    y = 700;
  }
  lines.push(textBlock(50, y, 12, "Description"));
  lines.push(textBlock(300, y, 12, "Qty"));
  lines.push(textBlock(350, y, 12, "Unit"));
  lines.push(textBlock(430, y, 12, "Amount"));
  y -= 15;
  for (const item of items) {
    const lineTitle = item.selectedVariations
      ? `${item.title} (${Object.entries(item.selectedVariations)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')})`
      : item.title;
    lines.push(textBlock(50, y, 12, lineTitle));
    lines.push(textBlock(300, y, 12, String(item.quantity)));
    lines.push(textBlock(350, y, 12, `$${item.unitPrice.toFixed(2)}`));
    lines.push(textBlock(430, y, 12, `$${item.totalPrice.toFixed(2)}`));
    y -= 15;
  }
  y -= 10;
  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const shipping = Math.max(order.totalAmount - subtotal, 0);
  if (shipping > 0) {
    lines.push(textBlock(50, y, 12, `Shipping: $${shipping.toFixed(2)}`));
    y -= 15;
  }
  lines.push(textBlock(50, y, 12, `Total: $${order.totalAmount.toFixed(2)}`));

  const content = lines.join("\n");
  const contentBuf = Buffer.from(content, "latin1");

  const objects: Buffer[] = [];
  objects.push(Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));
  objects.push(Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));
  objects.push(
    Buffer.from(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    )
  );
  objects.push(
    Buffer.from("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
  );
  objects.push(
    Buffer.from(`4 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`)
  );
  objects.push(contentBuf);
  objects.push(Buffer.from("\nendstream\nendobj\n"));

  let pdfBuf = Buffer.from("%PDF-1.7\n");
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdfBuf.length);
    pdfBuf = Buffer.concat([pdfBuf, obj]);
  }

  const xref = pdfBuf.length;
  let xrefStr = `xref\n0 ${objects.length + 1}\n`;
  xrefStr += "0000000000 65535 f \n";
  for (const off of offsets) {
    xrefStr += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  xrefStr += `startxref\n${xref}\n%%EOF\n`;

  pdfBuf = Buffer.concat([pdfBuf, Buffer.from(xrefStr, "latin1")]);

  return pdfBuf;
}

export interface SalesSummary {
  date: string;
  revenue: number;
}

import type { User } from "@shared/schema";

export function generateSalesReportPdf(
  seller: User,
  summary: SalesSummary[],
  start: Date,
  end: Date,
): Buffer {
  const lines: string[] = [];
  lines.push(textBlock(50, 760, 24, "SALES REPORT"));
  lines.push(textBlock(50, 735, 12, `${start.toDateString()} - ${end.toDateString()}`));
  lines.push(textBlock(50, 720, 12, `Seller: ${seller.firstName} ${seller.lastName}`));

  let y = 700;
  lines.push(textBlock(50, y, 12, "Date"));
  lines.push(textBlock(300, y, 12, "Revenue"));
  y -= 15;
  for (const row of summary) {
    lines.push(textBlock(50, y, 12, new Date(row.date).toDateString()));
    lines.push(textBlock(300, y, 12, `$${row.revenue.toFixed(2)}`));
    y -= 15;
  }

  const total = summary.reduce((sum, r) => sum + r.revenue, 0);
  y -= 10;
  lines.push(textBlock(50, y, 12, `Total: $${total.toFixed(2)}`));

  const content = lines.join("\n");
  const contentBuf = Buffer.from(content, "latin1");

  const objects: Buffer[] = [];
  objects.push(Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));
  objects.push(Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"));
  objects.push(
    Buffer.from(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    ),
  );
  objects.push(
    Buffer.from("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"),
  );
  objects.push(Buffer.from(`4 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`));
  objects.push(contentBuf);
  objects.push(Buffer.from("\nendstream\nendobj\n"));

  let pdfBuf = Buffer.from("%PDF-1.7\n");
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdfBuf.length);
    pdfBuf = Buffer.concat([pdfBuf, obj]);
  }

  const xref = pdfBuf.length;
  let xrefStr = `xref\n0 ${objects.length + 1}\n`;
  xrefStr += "0000000000 65535 f \n";
  for (const off of offsets) {
    xrefStr += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  xrefStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  xrefStr += `startxref\n${xref}\n%%EOF\n`;

  pdfBuf = Buffer.concat([pdfBuf, Buffer.from(xrefStr, "latin1")]);

  return pdfBuf;
}