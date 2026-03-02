const crypto = require('crypto');
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

function hashPasscode(passcode) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(String(passcode), salt, 32).toString('hex');
  return `${salt}:${digest}`;
}

function createSessionRouter({
  sessionStore,
  qrngUrl,
  scheduleSessionExpiry,
  createSessionRateLimit
}) {
  const router = express.Router();

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

      const { bytes, source } = await fetchEntropyHex(qrngUrl);
      const { sessionId } = deriveSessionEntropy(bytes);

      const createdAt = Date.now();
      const expiresAt = createdAt + duration * 1000;
      const shortCode = toShortCode(sessionId);
      const creatorSecret = createCreatorSecret();
      const session = {
        sessionId,
        createdAt,
        expiresAt,
        maxParticipants,
        passcodeHash: passcodeInput ? hashPasscode(passcodeInput) : null,
        participants: [],
        participantProfiles: {},
        publicKeys: {},
        shortCode,
        creatorSocketId: null,
        creatorSecret
      };

      await sessionStore.createSession(session, duration);
      scheduleSessionExpiry(sessionId, expiresAt);

      const qrPayload = `vaultchat://join/${sessionId}?exp=${expiresAt}`;
      return res.status(201).json({
        sessionId,
        shortCode,
        qrPayload,
        expiresAt,
        qrngSource: source,
        creatorSecret
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:sessionRef/validate', async (req, res, next) => {
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

      if (!session) {
        return res.json({ valid: false });
      }

      const participantCount = (session.participants || []).length;
      const requiresPasscode = Boolean(session.passcodeHash);

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
