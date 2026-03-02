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

  async persistWithExistingTtl(key, value) {
    const ttlMs = await this.redis.pttl(key);
    if (ttlMs <= 0) {
      return false;
    }

    await this.redis.psetex(key, ttlMs, JSON.stringify(value));
    return true;
  }

  async createSession(session, ttlSeconds) {
    const sessionKey = this.sessionKey(session.sessionId);
    const shortCodeKey = this.shortCodeKey(session.shortCode);
    const payload = JSON.stringify(session);

    const tx = this.redis.multi();
    tx.set(sessionKey, payload, 'EX', ttlSeconds);
    tx.set(shortCodeKey, session.sessionId, 'EX', ttlSeconds);
    await tx.exec();
  }

  async getSession(sessionId) {
    const value = await this.redis.get(this.sessionKey(sessionId));
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  async resolveSessionIdByShortCode(shortCode) {
    return this.redis.get(this.shortCodeKey(shortCode));
  }

  async getSessionByCode(code) {
    const sessionId = await this.resolveSessionIdByShortCode(code);
    if (!sessionId) {
      return null;
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    return { sessionId, session };
  }

  async updateSession(sessionId, updater) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const next = updater({ ...session });
    if (!next) {
      return null;
    }

    const ok = await this.persistWithExistingTtl(this.sessionKey(sessionId), next);
    if (!ok) {
      return null;
    }

    return next;
  }

  async addParticipant(sessionId, participant) {
    return this.updateSession(sessionId, (session) => {
      const alreadyIn = session.participants.includes(participant.socketId);
      if (alreadyIn) {
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
      session.participants = (session.participants || []).filter((id) => id !== socketId);

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
    if (!session) {
      return null;
    }

    const tx = this.redis.multi();
    tx.del(this.sessionKey(sessionId));

    if (session.shortCode) {
      tx.del(this.shortCodeKey(session.shortCode));
    }

    await tx.exec();
    return session;
  }
}

module.exports = SessionStore;
