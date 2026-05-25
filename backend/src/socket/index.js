const jwt = require('jsonwebtoken');
const { startGameLoop, registerSicBoHandlers } = require('./sicbo');

function initSocket(io) {
  // ── JWT 인증 미들웨어 ──────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('인증 토큰이 없습니다.'));
    }
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('유효하지 않은 토큰입니다.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] 연결: ${socket.user.username} (${socket.id})`);
    registerSicBoHandlers(io, socket);
  });

  // 게임 루프 시작
  startGameLoop(io);
}

module.exports = { initSocket };
