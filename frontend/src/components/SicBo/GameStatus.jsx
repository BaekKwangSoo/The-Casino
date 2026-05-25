import React from 'react';
import './GameStatus.css';

const PHASE_INFO = {
  betting: { label: '베팅 중',    color: '#2ecc71', icon: '💵' },
  rolling: { label: '주사위 굴리는 중', color: '#f39c12', icon: '🎲' },
  result:  { label: '결과 확인',  color: '#9b59b6', icon: '🏆' },
};

export default function GameStatus({ phase, timeLeft }) {
  const info = PHASE_INFO[phase] || PHASE_INFO.betting;
  const pct  = phase === 'betting' ? (timeLeft / 30) * 100 : 0;

  return (
    <div className="game-status card">
      <div className="status-top">
        <span className="phase-icon">{info.icon}</span>
        <span className="phase-label" style={{ color: info.color }}>{info.label}</span>
      </div>

      {phase === 'betting' && (
        <div className="timer-section">
          <div className="timer-bar-bg">
            <div
              className="timer-bar-fill"
              style={{ width: `${pct}%`, background: timeLeft <= 5 ? '#e74c3c' : info.color }}
            />
          </div>
          <div className={`timer-count ${timeLeft <= 5 ? 'urgent' : ''}`}>
            {timeLeft}초
          </div>
        </div>
      )}

      {phase === 'rolling' && (
        <div className="rolling-anim">
          <span className="dice-spin">🎲</span>
          <span className="dice-spin" style={{ animationDelay: '0.15s' }}>🎲</span>
          <span className="dice-spin" style={{ animationDelay: '0.3s' }}>🎲</span>
        </div>
      )}
    </div>
  );
}
