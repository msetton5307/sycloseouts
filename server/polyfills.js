import { randomFillSync, webcrypto } from "node:crypto";

export function applyWebCryptoPolyfill() {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    if (webcrypto && typeof webcrypto.getRandomValues === "function") {
      globalThis.crypto = webcrypto;
    } else {
      globalThis.crypto = {
        getRandomValues(typedArray) {
          if (!ArrayBuffer.isView(typedArray)) {
            throw new TypeError("Expected an array-like view");
          }
          randomFillSync(typedArray);
          return typedArray;
        },
      };
    }
  }
}

applyWebCryptoPolyfill();
