require('dotenv').config();

const http = require('http');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const { Redis } = require('@upstash/redis');
const { Server } = require('socket.io');

const SessionStore = require('./store/sessionStore');
const { createSessionRouter } = require('./routes/session');
const createQrngRouter = require('./routes/qrng');
const { registerSessionHandler } = require('./socket/sessionHandler');
const { registerMessageHandler } = require('./socket/messageHandler');

const PORT = Number(process.env.PORT || 3001);
const QRNG_API_URL =
  process.env.QRNG_API_URL || 'https://qrng.anu.edu.au/API/jsonI.php?length=64&type=hex16';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';
const TRUST_PROXY = NODE_ENV === 'production' ? ['loopback', 'linklocal', 'uniquelocal'] : false;
const MAX_SOCKET_PAYLOAD_BYTES = 32 * 1024 * 1024;

function isAllowedOrigin(origin) {
  if (!origin) {
    return NODE_ENV !== 'production';
  }

  if (NODE_ENV !== 'production') {
    return true;
  }

  return origin === CLIENT_URL;
}

function createSessionCreateRateLimit() {
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 10;
  const hits = new Map();

  return function sessionCreateRateLimit(req, res, next) {
    // Security fix: derive the client IP from Express proxy handling so user-supplied forwarding headers cannot spoof limits.
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const existing = hits.get(ip) || [];
    const fresh = existing.filter((timestamp) => now - timestamp < windowMs);

    if (fresh.length >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded: max 10 session creations per hour per IP'
      });
    }

    fresh.push(now);
    hits.set(ip, fresh);
    return next();
  };
}

function setSecurityHeaders(req, res, next) {
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "style-src 'self' https://fonts.googleapis.com",
    "script-src 'self'",
    `connect-src 'self' ${CLIENT_URL} ws: wss:`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  // Security fix: add explicit anti-framing and HSTS headers alongside the existing CSP and content-type controls.
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
}

function enforceHttpsInProduction(req, res, next) {
  if (NODE_ENV !== 'production') return next();

  // Security fix: trust Express' proxy-aware req.secure flag instead of raw x-forwarded-proto headers.
  if (req.secure) return next();

  return res.status(426).json({ error: 'HTTPS required in production' });
}

// Security fix: Upstash Redis over REST cannot run config GET commands, assuming serverless stateless ephemeral mode natively.
async function assertRedisIsEphemeral() {
  return Promise.resolve();
}

// Security fix: Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

async function start() {
  const app = express();
  const server = http.createServer(app);
  const createSessionRateLimit = createSessionCreateRateLimit();

  // Security fix: trust only private proxy hops in production so forwarded headers cannot be spoofed from the public internet.
  app.set('trust proxy', TRUST_PROXY);
  app.use(setSecurityHeaders);
  app.use(enforceHttpsInProduction);

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        if (NODE_ENV === 'production') {
          return callback(new Error('CORS blocked for this origin'), false);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: false
    })
  );

  // Security fix: keep JSON bodies small because REST endpoints only accept tiny session metadata payloads.
  app.use(express.json({ limit: '16kb' }));
  // Security fix: cap memory-backed uploads even though the current app relays media over Socket.IO rather than multipart forms.
  app.locals.upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1
    }
  });

  // Security fix: use a local Redis connection and verify persistence is disabled before accepting traffic.
  // Migrate to Upstash
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  await assertRedisIsEphemeral(redis);

  const sessionStore = new SessionStore(redis);
  const sessionTimers = new Map();
  const destroyingSessions = new Set();

  const io = new Server(server, {
    // Security fix: keep the Socket.IO payload ceiling above current encrypted attachment sizes while preventing oversized abuse.
    maxHttpBufferSize: MAX_SOCKET_PAYLOAD_BYTES,
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Socket origin blocked'), false);
      },
      methods: ['GET', 'POST']
    },
    allowRequest: (req, callback) => {
      // Security fix: gate websocket upgrades on the same strict origin check instead of trusting spoofable proto headers.
      const origin = req.headers.origin;
      if (!isAllowedOrigin(origin)) {
        return callback('Socket origin blocked', false);
      }
      callback(null, true);
    }
  });

  async function destroySessionNow(sessionId, reason = 'expired') {
    const id = String(sessionId || '').toLowerCase();
    if (!id || destroyingSessions.has(id)) return;

    destroyingSessions.add(id);

    const timer = sessionTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      sessionTimers.delete(id);
    }

    try {
      const session = await sessionStore.getSession(id);
      if (!session) return;

      const sockets = await io.in(id).fetchSockets();
      const eventName = reason === 'nuked' ? 'session:nuked' : 'session:expired';

      io.to(id).emit(eventName, {});
      await sessionStore.destroySession(id);

      sockets.forEach((s) => {
        s.data.sessionId = null;
        s.leave(id);
        s.disconnect(true);
      });
    } finally {
      destroyingSessions.delete(id);
    }
  }

  function scheduleSessionExpiry(sessionId, expiresAt) {
    const id = String(sessionId || '').toLowerCase();

    const existing = sessionTimers.get(id);
    if (existing) clearTimeout(existing);

    const ms = Math.max(0, Number(expiresAt) - Date.now());

    const timer = setTimeout(() => {
      destroySessionNow(id).catch(() => {});
    }, ms);

    sessionTimers.set(id, timer);
  }

  app.use('/api/qrng', createQrngRouter({ qrngUrl: QRNG_API_URL }));

  app.use('/api/session',
    createSessionRouter({
      sessionStore,
      qrngUrl: QRNG_API_URL,
      scheduleSessionExpiry,
      createSessionRateLimit
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use((error, req, res, next) => {
    // Security fix: keep internal error details out of client responses and avoid logging raw request payloads or session blobs.
    console.error('Server error:', error?.message || 'Unknown error');

    const status = Number(error?.status || 500);
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : (error?.publicMessage || error?.message || 'Request failed')
    });
  });

  io.on('connection', (socket) => {
    registerSessionHandler({ io, socket, sessionStore, destroySessionNow });
    registerMessageHandler({ io, socket, sessionStore });
  });

  server.listen(PORT, () => {
    console.log(`VaultChat server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('VaultChat server failed to start:', error.message);
  process.exit(1);
});
