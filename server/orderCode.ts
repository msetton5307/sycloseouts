import { randomBytes } from "crypto";

export function generateOrderCode(id: number): string {
  const idPart = id.toString(36).toUpperCase().padStart(6, "0");
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `O${idPart}${randomPart}`;
}
