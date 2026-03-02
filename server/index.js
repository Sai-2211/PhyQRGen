require('dotenv').config();

const http = require('http');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const Redis = require('ioredis');
const { Server } = require('socket.io');
const SessionStore = require('./store/sessionStore');
const { createSessionRouter } = require('./routes/session');
const createQrngRouter = require('./routes/qrng');
const { registerSessionHandler } = require('./socket/sessionHandler');
const { registerMessageHandler } = require('./socket/messageHandler');
const { registerSignalingHandler } = require('./socket/signalingHandler');

const PORT = Number(process.env.PORT || 3001);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QRNG_API_URL =
  process.env.QRNG_API_URL || 'https://qrng.anu.edu.au/API/jsonI.php?length=64&type=hex16';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

function createSessionCreateRateLimit() {
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 10;
  const hits = new Map();

  return function sessionCreateRateLimit(req, res, next) {
    const ip = String(req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
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
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self'",
    `connect-src 'self' ${CLIENT_URL} ws: wss:`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  next();
}

function enforceHttpsInProduction(req, res, next) {
  if (NODE_ENV !== 'production') {
    return next();
  }

  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (req.secure || proto === 'https') {
    return next();
  }

  return res.status(426).json({ error: 'HTTPS required in production' });
}

async function start() {
  const app = express();
  const server = http.createServer(app);
  const createSessionRateLimit = createSessionCreateRateLimit();

  app.set('trust proxy', 1);
  app.use(setSecurityHeaders);
  app.use(enforceHttpsInProduction);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        if (NODE_ENV === 'production' && origin !== CLIENT_URL) {
          return callback(new Error('CORS blocked for this origin'), false);
        }

        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: false
    })
  );
  app.use(express.json({ limit: '2mb' }));

  // Multer is configured for memory-only buffers to avoid writing uploads to disk.
  app.locals.upload = multer({ storage: multer.memoryStorage() });

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false
  });

  redis.on('error', () => {
    // Intentionally avoid logging message payloads or user data.
  });

  await redis.connect().catch(() => {
    // ioredis may auto-connect depending on runtime; ignore duplicate connect failures.
  });

  try {
    await redis.config('SET', 'save', '');
    await redis.config('SET', 'appendonly', 'no');
  } catch (error) {
    throw new Error(
      'Redis persistence must be disabled (save "" and appendonly no). Update Redis permissions/config.'
    );
  }

  const sessionStore = new SessionStore(redis);
  const sessionTimers = new Map();
  const destroyingSessions = new Set();

  const io = new Server(server, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST']
    },
    allowRequest: (req, callback) => {
      if (NODE_ENV !== 'production') {
        callback(null, true);
        return;
      }

      const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
      callback(null, proto === 'https');
    }
  });

  async function destroySessionNow(sessionId, reason = 'expired') {
    const normalizedSessionId = String(sessionId || '').toLowerCase();
    if (!normalizedSessionId || destroyingSessions.has(normalizedSessionId)) {
      return;
    }

    destroyingSessions.add(normalizedSessionId);
    const timer = sessionTimers.get(normalizedSessionId);
    if (timer) {
      clearTimeout(timer);
      sessionTimers.delete(normalizedSessionId);
    }

    try {
      const session = await sessionStore.getSession(normalizedSessionId);
      if (!session) {
        return;
      }

      const roomSockets = await io.in(normalizedSessionId).fetchSockets();
      const eventName = reason === 'nuked' ? 'session:nuked' : 'session:expired';
      io.to(normalizedSessionId).emit(eventName, {});

      await sessionStore.destroySession(normalizedSessionId);

      roomSockets.forEach((connectedSocket) => {
        connectedSocket.data.sessionId = null;
        connectedSocket.leave(normalizedSessionId);
        connectedSocket.disconnect(true);
      });
    } finally {
      destroyingSessions.delete(normalizedSessionId);
    }
  }

  function scheduleSessionExpiry(sessionId, expiresAt) {
    const normalizedSessionId = String(sessionId || '').toLowerCase();
    const existing = sessionTimers.get(normalizedSessionId);
    if (existing) {
      clearTimeout(existing);
    }

    const ms = Math.max(0, Number(expiresAt) - Date.now());
    const timer = setTimeout(() => {
      destroySessionNow(normalizedSessionId, 'expired').catch(() => {
        // Best-effort teardown.
      });
    }, ms);

    sessionTimers.set(normalizedSessionId, timer);
  }

  app.use('/api/qrng', createQrngRouter({ qrngUrl: QRNG_API_URL }));
  app.use(
    '/api/session',
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

  app.use((error, _req, res, _next) => {
    const status = Number(error?.status) || 500;
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : error.message
    });
  });

  io.on('connection', (socket) => {
    registerSessionHandler({
      io,
      socket,
      sessionStore,
      destroySessionNow
    });
    registerMessageHandler({ io, socket });
    registerSignalingHandler({ io, socket });
  });

  server.listen(PORT, () => {
    // No message payload logging; startup logs are safe.
    console.log(`VaultChat server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('VaultChat server failed to start:', error.message);
  process.exit(1);
});
