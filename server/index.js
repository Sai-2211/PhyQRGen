require('dotenv').config();

const http = require('http');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const { Redis } = require("@upstash/redis");
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
  if (NODE_ENV !== 'production') return next();

  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (req.secure || proto === 'https') return next();

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
        if (!origin) return callback(null, true);
        if (NODE_ENV === 'production' && origin !== CLIENT_URL) {
          return callback(new Error('CORS blocked for this origin'), false);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: false
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.locals.upload = multer({ storage: multer.memoryStorage() });

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const sessionStore = new SessionStore(redis);
  const sessionTimers = new Map();
  const destroyingSessions = new Set();

  const io = new Server(server, {
    maxHttpBufferSize: 40 * 1024 * 1024,
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST']
    },
    allowRequest: (req, callback) => {
      if (NODE_ENV !== 'production') return callback(null, true);
      const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
      callback(null, proto === 'https');
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
    console.error('Server error:', error);

    res.status(500).json({
      error: error.message,
    });
  });

  io.on('connection', (socket) => {
    registerSessionHandler({ io, socket, sessionStore, destroySessionNow });
    registerMessageHandler({ io, socket });
  });

  server.listen(PORT, () => {
    console.log(`VaultChat server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('VaultChat server failed to start:', error.message);
  process.exit(1);
});
