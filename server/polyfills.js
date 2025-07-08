import { webcrypto } from "node:crypto";

export function applyWebCryptoPolyfill() {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    globalThis.crypto = webcrypto;
  }
}

applyWebCryptoPolyfill();
