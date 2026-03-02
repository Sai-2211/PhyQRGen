const axios = require('axios');
const crypto = require('crypto');

function normalizeQrngPayload(payload) {
  if (!payload || !Array.isArray(payload.data)) {
    return null;
  }

  const joined = payload.data
    .map((value) => String(value).replace(/[^a-fA-F0-9]/g, '').toLowerCase())
    .join('');

  if (!joined || joined.length < 64) {
    return null;
  }

  return joined;
}

async function fetchEntropyHex(qrngUrl) {
  try {
    const { data } = await axios.get(qrngUrl, {
      timeout: 4000,
      headers: {
        Accept: 'application/json'
      }
    });

    const bytes = normalizeQrngPayload(data);
    if (!bytes) {
      throw new Error('Invalid QRNG response payload');
    }

    return { bytes, source: 'quantum' };
  } catch (_error) {
    return {
      bytes: crypto.randomBytes(64).toString('hex'),
      source: 'fallback'
    };
  }
}

function deriveSessionEntropy(bytesHex) {
  const safeHex = (bytesHex || '').padEnd(96, '0');
  const sessionId = safeHex.slice(0, 32);
  const seed = safeHex.slice(32);
  return { sessionId, seed };
}

function toShortCode(sessionId) {
  const digest = crypto.createHash('sha256').update(sessionId).digest('hex').toUpperCase();
  const letters = digest.replace(/[0-9]/g, '').slice(0, 4).padEnd(4, 'X');
  const digits = digest.replace(/[A-F]/g, '').slice(0, 4).padEnd(4, '0');
  return `${letters}-${digits}`;
}

function createCreatorSecret() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  fetchEntropyHex,
  deriveSessionEntropy,
  toShortCode,
  createCreatorSecret
};
