import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { getSocket } from '../socket/socketClient';
import PhaseDisplay      from '../components/SicBo/PhaseDisplay';
import DiceShaker        from '../components/SicBo/DiceShaker';
import ResultHistory     from '../components/SicBo/ResultHistory';
import SicBoTableLayout  from '../components/SicBo/SicBoTableLayout';
import ResultOverlay     from '../components/SicBo/ResultOverlay';
import './SicBoPage.css';

export default function SicBoPage() {
  const navigate = useNavigate();
  const socket   = getSocket();
  const {
    user, updateBalance,
    gamePhase, setGamePhase,
    timeLeft,  setTimeLeft,
    playerCount, setPlayerCount,
    currentBets, addBet, cancelBet, clearBets,
    history, addHistory,
    addNotification,
  } = useStore();

  const [dice,       setDice]       = useState([null, null, null]);
  const [showResult, setShowResult] = useState(false);
  const [myResult,   setMyResult]   = useState(null);
  const [playerBets, setPlayerBets] = useState({});

  /* ── 소켓 이벤트 ─────────────────────────────── */
  useEffect(() => {
    if (!socket) { navigate('/login'); return; }

    socket.emit('sicbo:join');
    socket.emit('balance:get');

    socket.on('sicbo:state', ({ phase, timeLeft: t, playerCount: pc, bets }) => {
      setGamePhase(phase);
      setTimeLeft(t);
      setPlayerCount(pc || 0);
      if (bets) setPlayerBets(bets);
    });

    socket.on('phase:betting', () => {
      setGamePhase('betting');
      setDice([null, null, null]);
      setShowResult(false);
      setMyResult(null);
      clearBets();
      setPlayerBets({});
    });

    socket.on('phase:rolling', () => {
      setGamePhase('rolling');
      setTimeLeft(0);
    });

    socket.on('phase:result', ({ dice: d, sum, results, timeLeft: t }) => {
      setGamePhase('result');
      setTimeLeft(t || 0);
      setDice([d.d1, d.d2, d.d3]);
      addHistory({ d1: d.d1, d2: d.d2, d3: d.d3, sum });

      const mine = results.find(r => r.userId === user?.id);
      if (mine) {
        setMyResult(mine);
        if (mine.totalWin > 0)
          addNotification(`🎉 +${mine.totalWin.toLocaleString()} 크레딧 당첨!`, 'win');
      }
      setTimeout(() => setShowResult(true), 2000);
    });

    socket.on('timer',          ({ timeLeft: t }) => setTimeLeft(t));
    socket.on('player:joined',  ({ playerCount: pc }) => setPlayerCount(pc));
    socket.on('player:left',    ({ playerCount: pc }) => setPlayerCount(pc));
    socket.on('bet:success',    ({ balance }) => updateBalance(balance));
    socket.on('bet:error',      ({ message }) => addNotification(`⚠️ ${message}`, 'error'));
    socket.on('balance:update', ({ balance }) => updateBalance(balance));
    socket.on('bets:update',    (bets) => setPlayerBets(bets));

    return () => {
      socket.emit('sicbo:leave');
      ['sicbo:state','phase:betting','phase:rolling','phase:result',
       'timer','player:joined','player:left','bet:success','bet:error',
       'balance:update','bets:update'].forEach(ev => socket.off(ev));
    };
  }, [socket]);

  const handleBet = (betType, betValue, amount) => {
    if (!socket || gamePhase !== 'betting') {
      if (gamePhase !== 'betting') addNotification('베팅 시간이 아닙니다.', 'warn');
      return;
    }
    socket.emit('sicbo:bet', { betType, betValue, amount });
    addBet({ betType, betValue, amount });
  };

  const handleCancelBet = (betType) => {
    cancelBet(betType);
    // 서버가 cancel을 지원하는 경우 emit
    // socket.emit('sicbo:cancel-bet', { betType });
    addNotification(`${betType} 베팅이 취소됐습니다.`, 'info');
  };

  return (
    <div className="sicbo-page">

      {/* ── 헤더 ── */}
      <header className="sicbo-header">
        <button className="back-btn" onClick={() => navigate('/lobby')}>← 로비</button>
        <h1>🎲 다이사이 (식보)</h1>
        <div className="header-info">
          <span className="balance-badge">
            💰 {Number(user?.balance || 0).toLocaleString()}
          </span>
        </div>
      </header>

      {/* ── 3컬럼 상단 ── */}
      <div className="sicbo-top3">

        {/* 왼쪽: 페이즈 & 타이머 */}
        <div className="top3-left">
          <PhaseDisplay
            phase={gamePhase}
            timeLeft={timeLeft}
            playerCount={playerCount}
            overlayOpen={showResult}
          />
        </div>

        {/* 가운데: 주사위 쉐이커 (정면 + 위에서) */}
        <div className="top3-center">
          <DiceShaker dice={dice} phase={gamePhase} />
        </div>

        {/* 오른쪽: 결과 이력 */}
        <div className="top3-right">
          <ResultHistory history={history} />
        </div>

      </div>

      {/* ── 베팅 테이블 ── */}
      <div className="sicbo-table-area">
        <SicBoTableLayout
          phase={gamePhase}
          currentBets={currentBets}
          onBet={handleBet}
          onCancelBet={handleCancelBet}
          balance={user?.balance || 0}
          playerBets={playerBets}
        />
      </div>

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
