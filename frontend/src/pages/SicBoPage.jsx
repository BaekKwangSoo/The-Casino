import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { getSocket } from '../socket/socketClient';
import DiceDisplay   from '../components/SicBo/DiceDisplay';
import BettingTable  from '../components/SicBo/BettingTable';
import GameStatus    from '../components/SicBo/GameStatus';
import ResultOverlay from '../components/SicBo/ResultOverlay';
import './SicBoPage.css';

export default function SicBoPage() {
  const navigate  = useNavigate();
  const socket    = getSocket();
  const {
    user, updateBalance,
    gamePhase, setGamePhase,
    timeLeft,  setTimeLeft,
    playerCount, setPlayerCount,
    currentBets, addBet, clearBets,
    lastResult,  setLastResult,
    addHistory,
    addNotification,
  } = useStore();

  const [dice, setDice] = useState([null, null, null]);
  const [showResult, setShowResult] = useState(false);
  const [myResult,   setMyResult]   = useState(null);

  // ── 소켓 이벤트 연결 ──────────────────────────────────
  useEffect(() => {
    if (!socket) { navigate('/login'); return; }

    socket.emit('sicbo:join');
    socket.emit('balance:get');

    socket.on('sicbo:state', ({ phase, timeLeft: t, playerCount: pc }) => {
      setGamePhase(phase);
      setTimeLeft(t);
      setPlayerCount(pc || 0);
    });

    socket.on('phase:betting', ({ roundId }) => {
      setGamePhase('betting');
      setDice([null, null, null]);
      setShowResult(false);
      setMyResult(null);
      clearBets();
    });

    socket.on('phase:rolling', () => {
      setGamePhase('rolling');
      setTimeLeft(0);
    });

    socket.on('phase:result', ({ dice: d, sum, results }) => {
      setGamePhase('result');
      setDice([d.d1, d.d2, d.d3]);
      addHistory({ d1: d.d1, d2: d.d2, d3: d.d3, sum });

      // 내 결과 찾기
      const mine = results.find((r) => r.userId === user?.id);
      if (mine) {
        setMyResult(mine);
        if (mine.totalWin > 0) {
          addNotification(`🎉 +${mine.totalWin.toLocaleString()} 크레딧 당첨!`, 'win');
        }
      }
      setShowResult(true);
    });

    socket.on('timer', ({ timeLeft: t }) => setTimeLeft(t));

    socket.on('player:joined', ({ playerCount: pc }) => setPlayerCount(pc));
    socket.on('player:left',   ({ playerCount: pc }) => setPlayerCount(pc));

    socket.on('bet:success', ({ balance }) => {
      updateBalance(balance);
    });
    socket.on('bet:error', ({ message }) => {
      addNotification(`⚠️ ${message}`, 'error');
    });

    socket.on('balance:update', ({ balance }) => updateBalance(balance));

    return () => {
      socket.emit('sicbo:leave');
      socket.off('sicbo:state');
      socket.off('phase:betting');
      socket.off('phase:rolling');
      socket.off('phase:result');
      socket.off('timer');
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('bet:success');
      socket.off('bet:error');
      socket.off('balance:update');
    };
  }, [socket]);

  // ── 베팅 처리 ─────────────────────────────────────────
  const handleBet = (betType, betValue, amount) => {
    if (!socket) return;
    if (gamePhase !== 'betting') {
      addNotification('베팅 시간이 아닙니다.', 'warn');
      return;
    }
    socket.emit('sicbo:bet', { betType, betValue, amount });
    addBet({ betType, betValue, amount });
  };

  return (
    <div className="sicbo-page">
      {/* 헤더 */}
      <header className="sicbo-header">
        <button className="back-btn" onClick={() => navigate('/lobby')}>← 로비</button>
        <h1>🎲 다이사이 (식보)</h1>
        <div className="header-info">
          <span className="player-count">👥 {playerCount}명</span>
          <span className="balance-badge">💰 {Number(user?.balance || 0).toLocaleString()}</span>
        </div>
      </header>

      <div className="sicbo-layout">
        {/* 좌: 게임 상태 + 주사위 */}
        <div className="sicbo-left">
          <GameStatus phase={gamePhase} timeLeft={timeLeft} />
          <DiceDisplay dice={dice} phase={gamePhase} />
        </div>

        {/* 우: 베팅 테이블 */}
        <div className="sicbo-right">
          <BettingTable
            phase={gamePhase}
            currentBets={currentBets}
            onBet={handleBet}
            balance={user?.balance || 0}
            lastDice={dice}
          />
        </div>
      </div>

      {/* 결과 오버레이 */}
      {showResult && (
        <ResultOverlay
          dice={dice}
          myResult={myResult}
          onClose={() => setShowResult(false)}
        />
      )}
    </div>
  );
}
