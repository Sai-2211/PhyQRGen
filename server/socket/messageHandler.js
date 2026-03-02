function registerMessageHandler({ io, socket }) {
  socket.on('message:send', (payload = {}) => {
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
