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

  async createSession(session, ttlSeconds) {
    const sessionKey = this.sessionKey(session.sessionId);
    const shortCodeKey = this.shortCodeKey(session.shortCode);

    await this.redis.set(sessionKey, JSON.stringify(session), {
      ex: ttlSeconds,
    });

    await this.redis.set(shortCodeKey, session.sessionId, {
      ex: ttlSeconds,
    });
  }

  async getSession(sessionId) {
    const value = await this.redis.get(this.sessionKey(sessionId));
    return value ? JSON.parse(value) : null;
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
    if (!value) return null;

    let session;
    try {
      session = JSON.parse(value);
    } catch {
      return null;
    }

    const updated = updater({ ...session });
    if (!updated) return null;

    await this.redis.set(key, JSON.stringify(updated));
    return updated;
  }

  async addParticipant(sessionId, participant) {
    return this.updateSession(sessionId, (session) => {
      if (session.participants.includes(participant.socketId)) {
        return session;
      }

      session.participants.push(participant.socketId);
      session.participantProfiles = session.participantProfiles || {};
      session.participantProfiles[participant.socketId] = {
        socketId: participant.socketId,
        displayName: participant.displayName || 'Anonymous',
        publicKey: participant.publicKey || null
      };

      session.publicKeys = session.publicKeys || {};
      if (participant.publicKey) {
        session.publicKeys[participant.socketId] = participant.publicKey;
      }

      return session;
    });
  }

  async removeParticipant(sessionId, socketId) {
    return this.updateSession(sessionId, (session) => {
      session.participants = session.participants.filter((id) => id !== socketId);

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