require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const { initSocket } = require('./socket');
const authRoutes     = require('./routes/auth');
const gameRoutes     = require('./routes/game');

const app    = express();
const server = http.createServer(app);

// ── Socket.io 설정 (100명 동시접속) ─────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
  transports:   ['websocket', 'polling'],
});

// ── Express 미들웨어 ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// ── 헬스 체크 ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── API 라우트 ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// ── Socket.io 초기화 및 게임 루프 시작 ──────────────────
initSocket(io);

// ── 서버 시작 ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] 포트 ${PORT} 에서 실행 중`);
  console.log(`[Server] 환경: ${process.env.NODE_ENV || 'development'}`);
});

// ── 프로세스 예외 처리 ───────────────────────────────────
process.on('uncaughtException',  (err) => console.error('[Uncaught]', err));
process.on('unhandledRejection', (err) => console.error('[Unhandled]', err));
