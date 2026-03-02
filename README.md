# VaultChat

VaultChat is an ephemeral private chat MVP with client-side encryption for text and media, QR-based session sharing, and timed self-destruction.

## Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- tweetnacl.js
- qrcode.react
- html5-qrcode
- socket.io-client
- simple-peer
- axios

### Backend
- Node.js + Express
- socket.io
- ioredis
- crypto (Node built-in)
- multer (memoryStorage only)
- dotenv

## Core behavior

- Session creation uses ANU QRNG with automatic crypto fallback.
- Session metadata is stored only in Redis with TTL and explicit deletion on teardown.
- Message and file payloads are encrypted in-browser before relay.
- Server relays ciphertext only and never decrypts payloads.
- Timer is locked from creation (`expiresAt`) and shared across all participants.
- Creator can nuke session early.
- On expiry/nuke, session state is removed and participants are disconnected.

## Project layout

```text
vaultchat/
├── client/
│   └── src/
│       ├── components/
│       ├── crypto/
│       ├── hooks/
│       ├── pages/
│       ├── App.jsx
│       └── main.jsx
├── server/
│   ├── routes/
│   ├── socket/
│   ├── store/
│   ├── utils/
│   └── index.js
└── README.md
```

## Setup

### 1) Start Redis with persistence disabled

VaultChat requires Redis with no RDB and no AOF.

```bash
redis-server --save "" --appendonly no
```

Or in `redis.conf`:

```conf
save ""
appendonly no
```

### 2) Configure env

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4) Run backend

```bash
cd server
npm run dev
```

### 5) Run frontend

```bash
cd client
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## API

### `POST /api/session/create`
Body:

```json
{
  "duration": 1800,
  "maxParticipants": 6,
  "passcode": "1234"
}
```

Response:

```json
{
  "sessionId": "...",
  "shortCode": "XKQF-2891",
  "qrPayload": "vaultchat://join/...",
  "expiresAt": 1730000000000,
  "qrngSource": "quantum",
  "creatorSecret": "..."
}
```

### `GET /api/qrng`
Response:

```json
{
  "bytes": "hex...",
  "source": "quantum"
}
```

### `GET /api/session/:sessionId/validate`
Response:

```json
{
  "valid": true,
  "sessionId": "...",
  "expiresAt": 1730000000000,
  "participantCount": 1,
  "requiresPasscode": false
}
```

## Socket events

### Client to server
- `session:join`
- `session:leave`
- `session:nuke`
- `message:send`
- `message:broadcast`
- `webrtc:signal`
- `key:update`

### Server to client
- `session:joined`
- `session:participant_joined`
- `session:participant_left`
- `session:expired`
- `session:nuked`
- `message:received`
- `webrtc:signal`
- `keys:updated`

## Security notes

- HTTPS/WSS enforced in production mode.
- CORS restricted to configured client origin in production.
- Session creation endpoint is rate-limited to 10 requests/IP/hour.
- Passcodes are salted + hashed (`crypto.scrypt`) before Redis storage.
- No localStorage, cookies, or persistent message history.
- File object URLs and message buffers are wiped on session end in client state.

## MVP caveats

- Extremely large encrypted payloads over Socket.io can be bandwidth-heavy.
- Room state is intentionally memory-first and ephemeral; durability is not provided.
- WebRTC signaling is provided; stream quality depends on peer network/NAT behavior.
