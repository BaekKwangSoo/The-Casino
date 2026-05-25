import React from 'react';
import './PhaseDisplay.css';

const RESULT_DURATION = 13;

export default function PhaseDisplay({ phase, timeLeft, playerCount, overlayOpen }) {
  const pct = (timeLeft / 30) * 100;
  const urgent = timeLeft <= 5 && phase === 'betting';
  const resultPct = Math.min(100, (timeLeft / RESULT_DURATION) * 100);

  return (
    <div className="pd-root">
      {phase === 'betting' && (
        <>
          <div className="pd-phase-label betting-label">베팅 중</div>
          <div className={`pd-timer ${urgent ? 'pd-urgent' : ''}`}>
            {timeLeft}
            <span className="pd-sec">초</span>
          </div>
          <div className="pd-bar-wrap">
            <div
              className="pd-bar-fill"
              style={{
                width: `${pct}%`,
                background: urgent
                  ? 'linear-gradient(90deg, #ff4444, #ff0000)'
                  : 'linear-gradient(90deg, #2ecc71, #27ae60)',
              }}
            />
          </div>
          <div className="pd-hint">원하는 칸에 베팅하세요</div>
        </>
      )}

      {phase === 'rolling' && (
        <>
          <div className="pd-phase-label rolling-label">베팅 마감</div>
          <div className="pd-rolling-dots">
            <span style={{ animationDelay: '0s' }}>●</span>
            <span style={{ animationDelay: '0.22s' }}>●</span>
            <span style={{ animationDelay: '0.44s' }}>●</span>
          </div>
          <div className="pd-hint roll-hint">주사위 굴리는 중…</div>
        </>
      )}

      {phase === 'result' && !overlayOpen && (
        <>
          <div className="pd-phase-label result-label">결과 확인</div>
          <div className="pd-timer pd-result-timer">
            {timeLeft}
            <span className="pd-sec">초</span>
          </div>
          <div className="pd-bar-wrap">
            <div
              className="pd-bar-fill"
              style={{
                width: `${resultPct}%`,
                background: 'linear-gradient(90deg, #9b59b6, #6c3483)',
              }}
            />
          </div>
          <div className="pd-hint">다음 게임 시작까지</div>
        </>
      )}

      {phase === 'result' && overlayOpen && (
        <>
          <div className="pd-phase-label result-label">결과 확인</div>
          <div className="pd-result-icon">🏆</div>
          <div className="pd-hint">결과를 확인하세요</div>
        </>
      )}

      <div className="pd-players">👥 {playerCount}명 참가</div>
    </div>
  );
}
