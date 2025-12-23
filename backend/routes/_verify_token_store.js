// backend/routes/_verify_token_store.js

// In-memory map: token → { key, type, otp, expires, verified? }
const VERIFY_TOKENS = {};

/** Save or update a token record */
export function setToken(token, record) {
  VERIFY_TOKENS[token] = record;
}

/** Read a token record without deleting */
export function getToken(token) {
  return VERIFY_TOKENS[token];
}

/** Read a token record and delete it (one-time) */
export function consumeToken(token) {
  const rec = VERIFY_TOKENS[token];
  if (rec) {
    delete VERIFY_TOKENS[token];
  }
  return rec;
}

/** Optional: view current tokens for debugging */
export function _debugDump() {
  return VERIFY_TOKENS;
}

export default VERIFY_TOKENS;