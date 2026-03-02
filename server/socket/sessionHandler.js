const crypto = require('crypto');

function verifyPasscode(passcode, passcodeHash) {
  if (!passcodeHash) {
    return true;
  }

  const [salt, expected] = String(passcodeHash).split(':');
  if (!salt || !expected) {
    return false;
  }

  const digest = crypto.scryptSync(String(passcode || ''), salt, 32).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(expected, 'hex'));
  } catch (_error) {
    return false;
  }
}

function toParticipantList(session) {
  const profiles = session.participantProfiles || {};
  return (session.participants || [])
    .map((socketId) => profiles[socketId])
    .filter(Boolean)
    .map((entry) => ({
      socketId: entry.socketId,
      displayName: entry.displayName,
      publicKey: entry.publicKey
    }));
}

function registerSessionHandler({ io, socket, sessionStore, destroySessionNow }) {
  async function emitParticipantLeft(sessionId, socketId) {
    io.to(sessionId).emit('session:participant_left', { socketId });
    const updated = await sessionStore.getSession(sessionId);
    io.to(sessionId).emit('keys:updated', {
      publicKeys: updated?.publicKeys || {}
    });
  }

  socket.on('session:join', async (payload = {}, ack) => {
    try {
      const { sessionId, passcode, displayName, publicKey, creatorSecret } = payload;
      if (!sessionId || !publicKey) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'sessionId and publicKey are required' });
        }
        return;
      }

      const session = await sessionStore.getSession(String(sessionId).toLowerCase());
      if (!session) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'Session not found or expired' });
        }
        return;
      }

      if (Date.now() >= session.expiresAt) {
        await destroySessionNow(session.sessionId, 'expired');
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'Session expired' });
        }
        return;
      }

      const existingCount = (session.participants || []).length;
      const alreadyMember = (session.participants || []).includes(socket.id);
      if (!alreadyMember && existingCount >= session.maxParticipants) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'Session is full' });
        }
        return;
      }

      if (!verifyPasscode(passcode, session.passcodeHash)) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'Invalid passcode' });
        }
        return;
      }

      const joined = await sessionStore.addParticipant(session.sessionId, {
        socketId: socket.id,
        displayName: (displayName || 'Anonymous').slice(0, 40),
        publicKey
      });

      if (!joined) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'Unable to join session' });
        }
        return;
      }

      if (!joined.creatorSocketId && creatorSecret && creatorSecret === joined.creatorSecret) {
        await sessionStore.setCreatorSocket(joined.sessionId, socket.id);
      }

      const current = await sessionStore.getSession(joined.sessionId);
      socket.data.sessionId = joined.sessionId;
      socket.join(joined.sessionId);

      const participants = toParticipantList(current);
      const selfParticipant = participants.find((entry) => entry.socketId === socket.id);

      socket.emit('session:joined', {
        participants,
        expiresAt: current.expiresAt,
        creatorSocketId: current.creatorSocketId,
        shortCode: current.shortCode,
        self: selfParticipant
      });

      socket.to(joined.sessionId).emit('session:participant_joined', {
        socketId: socket.id,
        displayName: selfParticipant?.displayName || 'Anonymous',
        publicKey: selfParticipant?.publicKey || publicKey
      });

      io.to(joined.sessionId).emit('keys:updated', {
        publicKeys: current.publicKeys || {}
      });

      if (typeof ack === 'function') {
        ack({ ok: true });
      }
    } catch (_error) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'Join failed' });
      }
    }
  });

  socket.on('key:update', async (payload = {}) => {
    const { sessionId, publicKey } = payload;
    if (!sessionId || !publicKey) {
      return;
    }

    const updated = await sessionStore.updatePublicKey(String(sessionId).toLowerCase(), socket.id, publicKey);
    if (!updated) {
      return;
    }

    io.to(updated.sessionId).emit('keys:updated', {
      publicKeys: updated.publicKeys || {}
    });
  });

  socket.on('session:leave', async (payload = {}) => {
    const sessionId = payload.sessionId || socket.data.sessionId;
    if (!sessionId) {
      return;
    }

    await sessionStore.removeParticipant(String(sessionId).toLowerCase(), socket.id);
    socket.leave(String(sessionId).toLowerCase());
    socket.data.sessionId = null;
    await emitParticipantLeft(String(sessionId).toLowerCase(), socket.id);
  });

  socket.on('session:nuke', async (payload = {}, ack) => {
    const sessionId = String(payload.sessionId || socket.data.sessionId || '').toLowerCase();
    if (!sessionId) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'Missing sessionId' });
      }
      return;
    }

    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'Session not found' });
      }
      return;
    }

    if (session.creatorSocketId !== socket.id) {
      if (typeof ack === 'function') {
        ack({ ok: false, error: 'Only creator can nuke the session' });
      }
      return;
    }

    await destroySessionNow(sessionId, 'nuked');
    if (typeof ack === 'function') {
      ack({ ok: true });
    }
  });

  socket.on('disconnect', async () => {
    const sessionId = socket.data.sessionId;
    if (!sessionId) {
      return;
    }

    await sessionStore.removeParticipant(String(sessionId).toLowerCase(), socket.id);
    await emitParticipantLeft(String(sessionId).toLowerCase(), socket.id);
  });
}

module.exports = {
  registerSessionHandler
};
