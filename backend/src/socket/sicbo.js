/**
 * 다이사이(식보) Socket.io 게임 루프
 *
 * 게임 사이클:
 *   [BETTING] 30초 → [ROLLING] 3초 → [RESULT] 10초 → [BETTING] ...
 */

const db      = require('../config/database');
const gss     = require('../services/gameStateService');
const sicbo   = require('../services/sicboService');

const BETTING_DURATION = 30;   // 베팅 시간 (초)
const ROLLING_DURATION = 3;    // 주사위 굴리기 연출 (초)
const RESULT_DURATION  = 13;   // 결과 표시 시간 (초) — 2s 지연 + 9s 오버레이 + 2s 버퍼
const MAX_PLAYERS      = 100;

let gameLoop = null;
let ioRef    = null;

// ══════════════════════════════════════════════════════════
//  게임 루프
// ══════════════════════════════════════════════════════════
async function startGameLoop(io) {
  ioRef = io;
  console.log('[SicBo] 게임 루프 시작');
  await runBettingPhase();
}

// ── 베팅 페이즈 ───────────────────────────────────────────
async function runBettingPhase() {
  // 새 라운드 DB 등록
  const roundRes = await db.query(
    `INSERT INTO game_rounds (game_type) VALUES ('sicbo') RETURNING id`,
  );
  const roundId = roundRes.rows[0].id;

  await gss.setRound({ roundId, startedAt: Date.now() });
  await gss.setPhase('betting');

  ioRef.to('sicbo').emit('phase:betting', { roundId });
  ioRef.to('sicbo').emit('bets:update', {});

  let timeLeft = BETTING_DURATION;
  await gss.setTimer(timeLeft);

  gameLoop = setInterval(async () => {
    timeLeft--;
    await gss.setTimer(timeLeft);
    ioRef.to('sicbo').emit('timer', { timeLeft, phase: 'betting' });

    if (timeLeft <= 0) {
      clearInterval(gameLoop);
      await runRollingPhase(roundId);
    }
  }, 1000);
}

// ── 롤링 페이즈 ───────────────────────────────────────────
async function runRollingPhase(roundId) {
  await gss.setPhase('rolling');
  const dice = sicbo.rollDice();

  ioRef.to('sicbo').emit('phase:rolling', { roundId });

  setTimeout(async () => {
    await runResultPhase(roundId, dice);
  }, ROLLING_DURATION * 1000);
}

// ── 결과 페이즈 ───────────────────────────────────────────
async function runResultPhase(roundId, dice) {
  await gss.setPhase('result');

  const { d1, d2, d3 } = dice;
  const sum = d1 + d2 + d3;

  // DB에 결과 저장
  await db.query(
    `UPDATE game_rounds SET dice1=$1, dice2=$2, dice3=$3, total_sum=$4, ended_at=NOW()
     WHERE id=$5`,
    [d1, d2, d3, sum, roundId],
  );

  // 모든 플레이어 베팅 정산
  const players = await gss.getPlayers();
  const results = [];

  for (const player of players) {
    const bets = await gss.getUserBets(player.id);
    if (bets.length === 0) continue;

    let totalWin = 0;
    const betResults = [];

    for (const bet of bets) {
      const isWin    = sicbo.checkWin(bet.betType, bet.betValue, dice);
      const payout   = isWin ? sicbo.getPayout(bet.betType, dice) : 0;
      const winAmount = isWin ? bet.amount * payout : 0;

      totalWin += winAmount;
      betResults.push({ ...bet, isWin, payout, winAmount });

      // DB 베팅 저장
      await db.query(
        `INSERT INTO bets(user_id, round_id, bet_type, bet_value, amount, payout, is_win)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [player.id, roundId, bet.betType, bet.betValue || null, bet.amount, winAmount, isWin],
      );
    }

    // 잔액 업데이트 (당첨금만 지급 — 베팅금은 이미 차감됨)
    if (totalWin > 0) {
      await db.query(
        `UPDATE users SET balance = balance + $1, total_win = total_win + $1 WHERE id = $2`,
        [totalWin, player.id],
      );
      await db.query(
        `INSERT INTO transactions(user_id, type, amount, balance_after, description)
         SELECT $1,'win',$2, balance, '다이사이 당첨' FROM users WHERE id=$1`,
        [player.id, totalWin],
      );
    }

    // 베팅 초기화
    await gss.clearUserBets(player.id);

    results.push({ userId: player.id, username: player.username, betResults, totalWin });
  }

  ioRef.to('sicbo').emit('phase:result', {
    roundId, dice, sum, results, timeLeft: RESULT_DURATION,
  });

  // result 단계 카운트다운
  let remaining = RESULT_DURATION;
  await gss.setTimer(remaining);
  const resultTimer = setInterval(async () => {
    remaining--;
    await gss.setTimer(remaining);
    ioRef.to('sicbo').emit('timer', { timeLeft: remaining, phase: 'result' });
    if (remaining <= 0) clearInterval(resultTimer);
  }, 1000);

  // 다음 라운드 준비
  setTimeout(async () => {
    clearInterval(resultTimer);
    await runBettingPhase();
  }, RESULT_DURATION * 1000);
}

// ══════════════════════════════════════════════════════════
//  Socket 이벤트 핸들러
// ══════════════════════════════════════════════════════════
function registerSicBoHandlers(io, socket) {
  const user = socket.user;

  // ─ 방 입장 ────────────────────────────────────────────
  socket.on('sicbo:join', async () => {
    const count = await gss.getPlayerCount();
    if (count >= MAX_PLAYERS) {
      socket.emit('error', { message: '방이 가득 찼습니다 (최대 100명)' });
      return;
    }

    socket.join('sicbo');
    await gss.addPlayer({ id: user.id, username: user.username });

    // 현재 상태 전송
    const [phase, timeLeft, round, players] = await Promise.all([
      gss.getPhase(),
      gss.getTimer(),
      gss.getRound(),
      gss.getPlayers(),
    ]);

    const bets = await gss.getAllBetsAggregated();
    socket.emit('sicbo:state', { phase, timeLeft, round, playerCount: players.length, bets });

    // 다른 플레이어에게 입장 알림
    socket.to('sicbo').emit('player:joined', {
      username: user.username,
      playerCount: players.length,
    });

    console.log(`[SicBo] ${user.username} 입장 (총 ${players.length}명)`);
  });

  // ─ 방 퇴장 ────────────────────────────────────────────
  socket.on('sicbo:leave', async () => {
    await handleLeave(socket, user);
  });

  // ─ 베팅 ──────────────────────────────────────────────
  socket.on('sicbo:bet', async ({ betType, betValue, amount }) => {
    try {
      const phase = await gss.getPhase();
      if (phase !== 'betting') {
        socket.emit('bet:error', { message: '베팅 시간이 아닙니다.' });
        return;
      }

      // 금액 검증
      if (!amount || amount <= 0 || amount > 1000000) {
        socket.emit('bet:error', { message: '올바른 베팅 금액을 입력하세요.' });
        return;
      }

      // 잔액 확인 및 차감
      const result = await db.query(
        `UPDATE users SET balance = balance - $1, total_bet = total_bet + $1
         WHERE id = $2 AND balance >= $1
         RETURNING balance`,
        [amount, user.id],
      );

      if (result.rowCount === 0) {
        socket.emit('bet:error', { message: '잔액이 부족합니다.' });
        return;
      }

      const newBalance = parseFloat(result.rows[0].balance);

      // 트랜잭션 기록
      await db.query(
        `INSERT INTO transactions(user_id, type, amount, balance_after, description)
         VALUES($1,'bet',$2,$3,'다이사이 베팅')`,
        [user.id, amount, newBalance],
      );

      // Redis에 베팅 저장
      const bet = { betType, betValue, amount: parseFloat(amount) };
      await gss.addBet(user.id, bet);

      socket.emit('bet:success', { bet, balance: newBalance });

      // 방 전체에 집계 베팅 현황 업데이트
      const agg = await gss.getAllBetsAggregated();
      ioRef.to('sicbo').emit('bets:update', agg);

    } catch (err) {
      console.error('[SicBo] 베팅 오류:', err);
      socket.emit('bet:error', { message: '베팅 처리 중 오류가 발생했습니다.' });
    }
  });

  // ─ 잔액 조회 ─────────────────────────────────────────
  socket.on('balance:get', async () => {
    const res = await db.query('SELECT balance FROM users WHERE id=$1', [user.id]);
    socket.emit('balance:update', { balance: parseFloat(res.rows[0]?.balance || 0) });
  });

  // ─ 연결 해제 ─────────────────────────────────────────
  socket.on('disconnect', async () => {
    await handleLeave(socket, user);
  });
}

async function handleLeave(socket, user) {
  socket.leave('sicbo');
  await gss.removePlayer(user.id);
  await gss.clearUserBets(user.id);

  const players = await gss.getPlayers();
  ioRef.to('sicbo').emit('player:left', {
    username: user.username,
    playerCount: players.length,
  });
  console.log(`[SicBo] ${user.username} 퇴장 (총 ${players.length}명)`);
}

module.exports = { startGameLoop, registerSicBoHandlers };
