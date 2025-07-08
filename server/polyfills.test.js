import { applyWebCryptoPolyfill } from './polyfills.js';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert';
import { test } from 'node:test';

// Ensure the polyfill installs global.crypto when missing

test('applyWebCryptoPolyfill sets global.crypto', () => {
  const original = globalThis.crypto;
  delete globalThis.crypto;
  applyWebCryptoPolyfill();
  assert.ok(globalThis.crypto, 'crypto should be defined');
  assert.strictEqual(typeof globalThis.crypto.getRandomValues, 'function');
  assert.strictEqual(globalThis.crypto, webcrypto);
  // restore
  if (original) {
    globalThis.crypto = original;
  } else {
    delete globalThis.crypto;
  }
});

test('applyWebCryptoPolyfill respects existing crypto', () => {
  const existing = { getRandomValues: () => 'existing' };
  const original = globalThis.crypto;
  globalThis.crypto = existing;
  applyWebCryptoPolyfill();
  assert.strictEqual(globalThis.crypto, existing);
  if (original) {
    globalThis.crypto = original;
  } else {
    delete globalThis.crypto;
  }
});

