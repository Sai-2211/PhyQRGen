function registerSignalingHandler({ io, socket }) {
  socket.on('webrtc:signal', (payload = {}) => {
    const { to, signal } = payload;
    if (!to || !signal) {
      return;
    }

    io.to(to).emit('webrtc:signal', {
      from: socket.id,
      signal
    });
  });
}

module.exports = {
  registerSignalingHandler
};
