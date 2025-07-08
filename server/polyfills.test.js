import { applyWebCryptoPolyfill } from './polyfills.js';
import assert from 'node:assert';
import { test } from 'node:test';

// Ensure the polyfill installs global.crypto when missing

test('applyWebCryptoPolyfill sets global.crypto', () => {
  const original = globalThis.crypto;
  delete globalThis.crypto;
  applyWebCryptoPolyfill();
  assert.ok(globalThis.crypto, 'crypto should be defined');
  assert.strictEqual(typeof globalThis.crypto.getRandomValues, 'function');
  // restore
  if (original) {
    globalThis.crypto = original;
  } else {
    delete globalThis.crypto;
  }
});

