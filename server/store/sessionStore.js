class SessionStore {
  constructor(redis) {
    this.redis = redis;
  }

  sessionKey(sessionId) {
    return `session:${sessionId}`;
  }

  shortCodeKey(shortCode) {
    return `session:code:${shortCode}`;
  }

  // Security fix: avoid logging raw serialized session payloads when Redis contains malformed data.
  parse(value) {
    if (!value) return null;

    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (_error) {
      console.error('JSON parse error for session payload');
      return null;
    }
  }

  cloneSession(session) {
    return {
      ...session,
      participants: [...(session.participants || [])],
      participantProfiles: { ...(session.participantProfiles || {}) },
      publicKeys: { ...(session.publicKeys || {}) }
    };
  }

  remainingSeconds(session) {
    return Math.ceil((Number(session?.expiresAt || 0) - Date.now()) / 1000);
  }

  async createSession(session, ttlSeconds) {
    const sessionKey = this.sessionKey(session.sessionId);
    const shortCodeKey = this.shortCodeKey(session.shortCode);

    // Security fix: reserve the session ID atomically so collisions cannot overwrite an existing room.
    const createdSession = await this.redis.set(
      sessionKey,
      session,
      { ex: ttlSeconds, nx: true }
    );

    if (createdSession !== 'OK') {
      return false;
    }

    const createdShortCode = await this.redis.set(
      shortCodeKey,
      session.sessionId,
      { ex: ttlSeconds, nx: true }
    );

    if (createdShortCode !== 'OK') {
      await this.redis.del(sessionKey);
      return false;
    }

    return true;
  }

  async getSession(sessionId) {
    const value = await this.redis.get(this.sessionKey(sessionId));
    return this.parse(value);
  }

  async resolveSessionIdByShortCode(shortCode) {
    return this.redis.get(this.shortCodeKey(shortCode));
  }

  async getSessionByCode(code) {
    const sessionId = await this.resolveSessionIdByShortCode(code);
    if (!sessionId) return null;

    const session = await this.getSession(sessionId);
    if (!session) return null;

    return { sessionId, session };
  }

  async updateSession(sessionId, updater) {
    const key = this.sessionKey(sessionId);

    const value = await this.redis.get(key);
    const session = this.parse(value);
    if (!session) return null;

    const updated = updater(this.cloneSession(session));
    if (!updated) return null;

    // Security fix: never let session mutations clear the TTL or alter the immutable expiry timestamp.
    if (updated.expiresAt !== session.expiresAt) {
      console.warn('Blocked expiresAt mutation attempt for session metadata update');
      return null;
    }

    const secondsRemaining = this.remainingSeconds(session);
    if (secondsRemaining <= 0) {
      await this.destroySession(sessionId);
      return null;
    }

    await this.redis.set(key, updated, { ex: secondsRemaining });
    return updated;
  }

  async addParticipant(sessionId, participant) {
    const key = this.sessionKey(sessionId);

    // Security fix: Upstash REST does not support WATCH.
    const session = this.parse(await this.redis.get(key));

    if (!session) {
      return null;
    }

    const next = this.cloneSession(session);
    const alreadyMember = next.participants.includes(participant.socketId);

    if (!alreadyMember && next.participants.length >= next.maxParticipants) {
      return { error: 'full' };
    }

    if (!alreadyMember) {
      next.participants.push(participant.socketId);
    }

    next.participantProfiles[participant.socketId] = {
      socketId: participant.socketId,
      displayName: participant.displayName || 'Anonymous',
      publicKey: participant.publicKey || null
    };

    if (participant.publicKey) {
      next.publicKeys[participant.socketId] = participant.publicKey;
    }

    const secondsRemaining = this.remainingSeconds(session);
    if (secondsRemaining <= 0) {
      await this.destroySession(sessionId);
      return null;
    }

    await this.redis.set(key, next, { ex: secondsRemaining });

    return next;
  }

  async removeParticipant(sessionId, socketId) {
    return this.updateSession(sessionId, (session) => {
      session.participants = (session.participants || []).filter(
        (id) => id !== socketId
      );

      if (session.participantProfiles) {
        delete session.participantProfiles[socketId];
      }

      if (session.publicKeys) {
        delete session.publicKeys[socketId];
      }

      return session;
    });
  }

  async updatePublicKey(sessionId, socketId, publicKey) {
    return this.updateSession(sessionId, (session) => {
      session.publicKeys = session.publicKeys || {};
      session.publicKeys[socketId] = publicKey;

      session.participantProfiles = session.participantProfiles || {};
      if (session.participantProfiles[socketId]) {
        session.participantProfiles[socketId].publicKey = publicKey;
      }

      return session;
    });
  }

  async setCreatorSocket(sessionId, socketId) {
    return this.updateSession(sessionId, (session) => {
      session.creatorSocketId = socketId;
      return session;
    });
  }

  async destroySession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    await this.redis.del(this.sessionKey(sessionId));

    if (session.shortCode) {
      await this.redis.del(this.shortCodeKey(session.shortCode));
    }

    return session;
  }
}

module.exports = SessionStore;
