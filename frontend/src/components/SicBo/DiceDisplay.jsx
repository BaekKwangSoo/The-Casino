import React from 'react';
import './DiceDisplay.css';

// 주사위 눈 SVG 패턴
const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DieFace({ value, animating }) {
  const dots = value ? DOT_POSITIONS[value] : [];

  return (
    <div className={`die-face ${animating ? 'rolling' : ''} ${value ? 'revealed' : 'hidden'}`}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="96" height="96" rx="16" ry="16"
              fill="#f5f0e8" stroke="#c8b090" strokeWidth="2" />
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="#1a1a2e" />
        ))}
      </svg>
    </div>
  );
}

export default function DiceDisplay({ dice, phase }) {
  const animating = phase === 'rolling';
  const sum       = dice.every(Boolean) ? dice.reduce((a, b) => a + b, 0) : null;

  return (
    <div className="dice-display card">
      <h3 className="dice-title">주사위 결과</h3>

      <div className="dice-row">
        {dice.map((d, i) => (
          <DieFace key={i} value={d} animating={animating} />
        ))}
      </div>

      {sum !== null && (
        <div className="dice-sum fade-in">
          합계: <span className="sum-value">{sum}</span>
          <span className={`sum-type ${sum >= 11 ? 'big' : 'small'}`}>
            {sum >= 11 ? '대(大)' : '소(小)'}
          </span>
          <span className={`sum-parity ${sum % 2 === 0 ? 'even' : 'odd'}`}>
            {sum % 2 === 0 ? '짝(偶)' : '홀(奇)'}
          </span>
        </div>
      )}

      {!sum && (
        <div className="dice-waiting">
          {phase === 'rolling' ? '굴리는 중...' : '베팅 후 결과를 기다리세요'}
        </div>
      )}
    </div>
  );
}
