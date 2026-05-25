const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../config/database');
const gss    = require('../services/gameStateService');

// ── 게임 목록 ──────────────────────────────────────────────
router.get('/list', auth, (req, res) => {
  const games = [
    { id: 'sicbo',    name: '다이사이 (식보)', available: true,  icon: '🎲', minBet: 100,  maxBet: 100000 },
    { id: 'baccarat', name: '바카라',          available: false, icon: '🃏', minBet: 1000, maxBet: 500000 },
    { id: 'roulette', name: '룰렛',            available: false, icon: '🎡', minBet: 100,  maxBet: 200000 },
    { id: 'blackjack',name: '블랙잭',          available: false, icon: '♠️', minBet: 500,  maxBet: 300000 },
    { id: 'slots',    name: '슬롯머신',        available: false, icon: '🎰', minBet: 100,  maxBet: 50000  },
    { id: 'poker',    name: '포커',            available: false, icon: '🂡', minBet: 1000, maxBet: 1000000},
  ];
  res.json({ games });
});

// ── 현재 게임 상태 조회 ───────────────────────────────────
router.get('/sicbo/state', auth, async (req, res) => {
  const [phase, timeLeft, round, playerCount] = await Promise.all([
    gss.getPhase(),
    gss.getTimer(),
    gss.getRound(),
    gss.getPlayerCount(),
  ]);
  res.json({ phase, timeLeft, round, playerCount });
});

// ── 최근 결과 이력 ────────────────────────────────────────
router.get('/sicbo/history', auth, async (req, res) => {
  const result = await db.query(
    `SELECT id, dice1, dice2, dice3, total_sum, ended_at
     FROM game_rounds
     WHERE game_type='sicbo' AND ended_at IS NOT NULL
     ORDER BY ended_at DESC LIMIT 20`,
  );
  res.json({ history: result.rows });
});

// ── 내 베팅 내역 ──────────────────────────────────────────
router.get('/my/bets', auth, async (req, res) => {
  const result = await db.query(
    `SELECT b.*, gr.dice1, gr.dice2, gr.dice3, gr.total_sum, gr.ended_at
     FROM bets b
     JOIN game_rounds gr ON b.round_id = gr.id
     WHERE b.user_id=$1
     ORDER BY b.created_at DESC LIMIT 50`,
    [req.user.id],
  );
  res.json({ bets: result.rows });
});

module.exports = router;
