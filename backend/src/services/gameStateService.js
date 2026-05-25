/**
 * 게임 상태 관리 (Redis 기반)
 *
 * Redis Key 구조:
 *   sicbo:round       - 현재 라운드 정보 (JSON)
 *   sicbo:phase       - 현재 페이즈 (betting | rolling | result)
 *   sicbo:timer       - 남은 시간 (초)
 *   sicbo:bets:{uid}  - 유저별 현재 베팅 목록 (JSON array)
 *   sicbo:players     - 현재 접속 중인 플레이어 목록 (JSON)
 */

const redis = require('../config/redis');

const KEYS = {
  round:   'sicbo:round',
  phase:   'sicbo:phase',
  timer:   'sicbo:timer',
  players: 'sicbo:players',
  bets:    (uid) => `sicbo:bets:${uid}`,
};

// ── 라운드 정보 ────────────────────────────────────────────
async function setRound(roundData) {
  await redis.set(KEYS.round, JSON.stringify(roundData));
}

async function getRound() {
  const data = await redis.get(KEYS.round);
  return data ? JSON.parse(data) : null;
}

// ── 페이즈 ─────────────────────────────────────────────────
async function setPhase(phase) {
  await redis.set(KEYS.phase, phase);
}

async function getPhase() {
  return await redis.get(KEYS.phase) || 'betting';
}

// ── 타이머 ─────────────────────────────────────────────────
async function setTimer(seconds) {
  await redis.set(KEYS.timer, seconds);
}

async function getTimer() {
  const t = await redis.get(KEYS.timer);
  return t ? parseInt(t) : 0;
}

// ── 베팅 관리 ──────────────────────────────────────────────
async function addBet(userId, bet) {
  const key = KEYS.bets(userId);
  const existing = await redis.get(key);
  const bets = existing ? JSON.parse(existing) : [];
  bets.push(bet);
  await redis.set(key, JSON.stringify(bets), 'EX', 300); // 5분 TTL
}

async function getUserBets(userId) {
  const data = await redis.get(KEYS.bets(userId));
  return data ? JSON.parse(data) : [];
}

async function clearUserBets(userId) {
  await redis.del(KEYS.bets(userId));
}

async function getAllBetsAggregated() {
  const players = await getPlayers();
  const agg = {};
  for (const player of players) {
    const bets = await getUserBets(player.id);
    if (bets.length === 0) continue;
    // betType별 이 플레이어의 합산
    const contrib = {};
    for (const bet of bets) {
      contrib[bet.betType] = (contrib[bet.betType] || 0) + bet.amount;
    }
    for (const [betType, total] of Object.entries(contrib)) {
      if (!agg[betType]) agg[betType] = { count: 0, total: 0 };
      agg[betType].count += 1;   // 플레이어 수
      agg[betType].total += total;
    }
  }
  return agg;
}

// ── 플레이어 관리 ──────────────────────────────────────────
async function addPlayer(player) {
  const data = await redis.get(KEYS.players);
  const players = data ? JSON.parse(data) : {};
  players[player.id] = { ...player, joinedAt: Date.now() };
  await redis.set(KEYS.players, JSON.stringify(players));
}

async function removePlayer(playerId) {
  const data = await redis.get(KEYS.players);
  if (!data) return;
  const players = JSON.parse(data);
  delete players[playerId];
  await redis.set(KEYS.players, JSON.stringify(players));
}

async function getPlayers() {
  const data = await redis.get(KEYS.players);
  return data ? Object.values(JSON.parse(data)) : [];
}

async function getPlayerCount() {
  const players = await getPlayers();
  return players.length;
}

module.exports = {
  setRound, getRound,
  setPhase, getPhase,
  setTimer, getTimer,
  addBet, getUserBets, clearUserBets, getAllBetsAggregated,
  addPlayer, removePlayer, getPlayers, getPlayerCount,
};
