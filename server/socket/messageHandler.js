function registerMessageHandler({ io, socket, sessionStore }) {
  // Security fix: add strict 30 msgs / 10s rate limiting per socket
  const rateLimitMs = 10000;
  const maxMessages = 30;
  let messageCount = 0;
  let rateLimitResetTime = Date.now() + rateLimitMs;

  function isRateLimited() {
    const now = Date.now();
    if (now > rateLimitResetTime) {
      rateLimitResetTime = now + rateLimitMs;
      messageCount = 0;
    }
    messageCount++;
    return messageCount > maxMessages;
  }

  socket.on('message:send', (payload = {}) => {
    if (isRateLimited() || !socket.data.sessionId) return;

    const { to, nonce, ciphertext, messageType } = payload;
    if (!to || !nonce || !ciphertext || !messageType) {
      return;
    }

    io.to(to).emit('message:received', {
      from: socket.id,
      nonce,
      ciphertext,
      messageType,
      timestamp: Date.now()
    });
  });

  socket.on('message:broadcast', (payload = {}) => {
    if (isRateLimited() || !socket.data.sessionId) return;

    const { nonce, ciphertexts, messageType } = payload;
    if (!nonce || !ciphertexts || !messageType || typeof ciphertexts !== 'object') {
      return;
    }

    const timestamp = Date.now();
    Object.entries(ciphertexts).forEach(([to, ciphertext]) => {
      if (!to || !ciphertext) {
        return;
      }

      io.to(to).emit('message:received', {
        from: socket.id,
        nonce,
        ciphertext,
        messageType,
        timestamp
      });
    });
  });
}

module.exports = {
  registerMessageHandler
};
