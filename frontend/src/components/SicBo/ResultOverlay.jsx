import React, { useEffect, useState } from 'react';
import './ResultOverlay.css';

export default function ResultOverlay({ dice, myResult, onClose }) {
  const sum = dice.reduce((a, b) => a + b, 0);
  const totalWin = myResult?.totalWin || 0;
  const [countdown, setCountdown] = useState(9);

  useEffect(() => {
    const autoClose = setTimeout(onClose, 9000);
    const tick = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearTimeout(autoClose); clearInterval(tick); };
  }, []);

  return (
    <div className="result-overlay" onClick={onClose}>
      <div className="result-box fade-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="result-title">🎲 결과</h2>

        <div className="result-dice">
          {dice.map((d, i) => (
            <div key={i} className="result-die bouncing" style={{ animationDelay: `${i * 0.15}s` }}>
              {['⚀','⚁','⚂','⚃','⚄','⚅'][d - 1]}
            </div>
          ))}
        </div>

        <div className="result-sum">
          합계 <span className="sum-big">{sum}</span>
          <span className={`big-small ${sum >= 11 ? 'big' : 'small'}`}>
            {sum >= 11 ? '대(大)' : '소(小)'}
          </span>
        </div>

        {myResult ? (
          <div className={`my-result ${totalWin > 0 ? 'win' : 'lose'}`}>
            {totalWin > 0 ? (
              <>
                <div className="win-icon">🎉</div>
                <div className="win-text">당첨!</div>
                <div className="win-amount">+{totalWin.toLocaleString()} 크레딧</div>
              </>
            ) : (
              <>
                <div className="lose-icon">😢</div>
                <div className="lose-text">아쉽지만 다음 기회에!</div>
              </>
            )}

            <div className="bet-details">
              {myResult.betResults?.map((b, i) => (
                <div key={i} className={`bet-detail ${b.isWin ? 'win' : 'lose'}`}>
                  <span>{b.betType}</span>
                  <span>{b.isWin ? `+${b.winAmount.toLocaleString()}` : `-${b.amount.toLocaleString()}`}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-bet">이번 라운드는 베팅하지 않으셨습니다.</div>
        )}

        <button className="btn btn-gold close-btn" onClick={onClose}>
          확인 ({countdown}초)
        </button>
      </div>
    </div>
  );
}
