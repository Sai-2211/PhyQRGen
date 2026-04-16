const bcrypt = require('bcrypt');
const express = require('express');
const {
  fetchEntropyHex,
  deriveSessionEntropy,
  toShortCode,
  createCreatorSecret
} = require('../utils/qrng');

const MIN_DURATION_SECONDS = 15 * 60;
const MAX_DURATION_SECONDS = 24 * 60 * 60;
const DEFAULT_DURATION_SECONDS = 30 * 60;
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 50;
const PASSCODE_ROUNDS = 12;
const MAX_CREATE_ATTEMPTS = 3;
const VALIDATION_WINDOW_MS = 60 * 1000;
const VALIDATION_MAX_REQUESTS = 60;
const MIN_VALIDATE_DURATION_MS = 75;

async function hashPasscode(passcode) {
  return bcrypt.hash(String(passcode), PASSCODE_ROUNDS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createValidationRateLimit() {
  const hits = new Map();

  return function validateSessionRateLimit(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const currentHits = (hits.get(ip) || []).filter((timestamp) => now - timestamp < VALIDATION_WINDOW_MS);

    if (currentHits.length >= VALIDATION_MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many validation attempts' });
    }

    currentHits.push(now);
    hits.set(ip, currentHits);
    return next();
  };
}

async function waitForMinimumValidationDuration(startedAt) {
  const remaining = MIN_VALIDATE_DURATION_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await sleep(remaining);
  }
}

function createSessionRouter({
  sessionStore,
  qrngUrl,
  scheduleSessionExpiry,
  createSessionRateLimit
}) {
  const router = express.Router();
  const validateSessionRateLimit = createValidationRateLimit();

  router.post('/create', createSessionRateLimit, async (req, res, next) => {
    try {
      const durationInput = Number(req.body?.duration);
      const maxParticipantsInput = Number(req.body?.maxParticipants);
      const passcodeInput = req.body?.passcode;

      const duration = Number.isFinite(durationInput)
        ? Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, durationInput))
        : DEFAULT_DURATION_SECONDS;

      const maxParticipants = Number.isFinite(maxParticipantsInput)
        ? Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, maxParticipantsInput))
        : MIN_PARTICIPANTS;

      if (passcodeInput && !/^\d{4,8}$/.test(String(passcodeInput))) {
        return res.status(400).json({
          error: 'Passcode must be 4 to 8 digits'
        });
      }

      let createdSession = null;
      let entropyBytes = '';
      let entropySource = 'fallback';

      // Security fix: hash new passcodes with bcrypt and regenerate IDs if either the room ID or short code collides.
      for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
        const { bytes, source } = await fetchEntropyHex(qrngUrl);
        // Security fix: Session IDs must use strict 256-bit crypto.randomBytes ONLY
        const sessionId = require('crypto').randomBytes(32).toString('hex');
        const createdAt = Date.now();
        const expiresAt = createdAt + duration * 1000;
        const shortCode = toShortCode(sessionId);
        const creatorSecret = createCreatorSecret();
        const session = {
          sessionId,
          createdAt,
          expiresAt,
          maxParticipants,
          passcodeHash: passcodeInput ? await hashPasscode(passcodeInput) : null,
          participants: [],
          participantProfiles: {},
          publicKeys: {},
          shortCode,
          creatorSocketId: null,
          creatorSecret
        };

        const created = await sessionStore.createSession(session, duration);
        if (created) {
          createdSession = session;
          entropyBytes = bytes;
          entropySource = source;
          break;
        }
      }

      if (!createdSession) {
        return next(Object.assign(new Error('Unable to create session'), { status: 500 }));
      }

      scheduleSessionExpiry(createdSession.sessionId, createdSession.expiresAt);

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const qrPayload = `${clientUrl}/room/${createdSession.sessionId}`;
      return res.status(201).json({
        sessionId: createdSession.sessionId,
        shortCode: createdSession.shortCode,
        qrPayload,
        expiresAt: createdSession.expiresAt,
        qrngSource: entropySource,
        entropyString: entropyBytes,
        creatorSecret: createdSession.creatorSecret
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:sessionRef/validate', validateSessionRateLimit, async (req, res, next) => {
    const startedAt = Date.now();

    try {
      const rawInput = String(req.params.sessionRef || '').trim().toUpperCase();
      const normalizedCode = /^[A-Z0-9]{8}$/.test(rawInput)
        ? `${rawInput.slice(0, 4)}-${rawInput.slice(4)}`
        : rawInput;
      const isShortCode = normalizedCode.includes('-');

      let session = null;
      let resolvedSessionId = normalizedCode;

      if (isShortCode) {
        const result = await sessionStore.getSessionByCode(normalizedCode);
        if (result) {
          session = result.session;
          resolvedSessionId = result.sessionId;
        }
      } else {
        session = await sessionStore.getSession(normalizedCode.toLowerCase());
      }

      if (!session || Date.now() >= Number(session.expiresAt)) {
        await waitForMinimumValidationDuration(startedAt);
        return res.json({ valid: false });
      }

      const participantCount = (session.participants || []).length;
      const requiresPasscode = Boolean(session.passcodeHash);

      // Security fix: keep invalid and expired lookups timing-similar while preserving the current valid-room response shape.
      await waitForMinimumValidationDuration(startedAt);
      return res.json({
        valid: true,
        sessionId: resolvedSessionId,
        expiresAt: session.expiresAt,
        participantCount,
        requiresPasscode
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createSessionRouter
};
